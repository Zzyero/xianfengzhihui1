from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import time
import json
import torch
from threading import Event
from typing import List, Dict, Any, Generator, Optional
from pydantic import BaseModel, Field
import threading
import logging
import os
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer, pipeline

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 启用CORS以支持前端跨域请求

# 模型缓存
model_cache = {}
tokenizer_cache = {}
abort_signals = {}  # 用于储存中断信号的字典

# 请求模型
class GenerateRequest(BaseModel):
    model: str  # 模型名称或路径
    prompt: str  # 提示词
    stream: bool = True  # 是否使用流式输出
    temperature: float = 0.7  # 温度参数
    top_p: float = 0.9  # Top-p采样
    top_k: int = 50  # Top-k采样
    max_tokens: int = 1000  # 最大生成令牌数
    stop: Optional[List[str]] = None  # 停止词列表
    
    # 其他可能的参数
    class Config:
        arbitrary_types_allowed = True

# 检查CUDA是否可用
def check_cuda_availability():
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        device_name = torch.cuda.get_device_name(0) if device_count > 0 else "Unknown"
        logger.info(f"CUDA可用，设备数量: {device_count}, 设备名称: {device_name}")
        return True, f"CUDA可用 ({device_name})"
    else:
        logger.info("CUDA不可用，将使用CPU")
        return False, "CUDA不可用，使用CPU"

# 加载模型函数
def load_model(model_name: str):
    # 检查是否已经缓存
    if model_name in model_cache:
        return model_cache[model_name], tokenizer_cache[model_name]
    
    logger.info(f"正在加载模型: {model_name}")
    try:
        # 确定设备
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"使用设备: {device}")
        
        # 加载分词器和模型
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(
            model_name, 
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
            low_cpu_mem_usage=True if device == "cuda" else False
        )
        
        # 缓存模型和分词器
        model_cache[model_name] = model
        tokenizer_cache[model_name] = tokenizer
        
        logger.info(f"模型 {model_name} 加载成功")
        return model, tokenizer
    except Exception as e:
        logger.error(f"加载模型 {model_name} 失败: {str(e)}")
        raise

# 流式文本生成
def generate_stream(model_name: str, prompt: str, params: Dict[str, Any], request_id: str) -> Generator[str, None, None]:
    try:
        # 创建中断信号
        abort_signals[request_id] = Event()
        
        # 加载模型和分词器
        model, tokenizer = load_model(model_name)
        
        # 设置生成参数
        generation_config = {
            "max_new_tokens": params.get("max_tokens", 1000),
            "temperature": params.get("temperature", 0.7),
            "top_p": params.get("top_p", 0.9),
            "top_k": params.get("top_k", 50),
            "repetition_penalty": params.get("repeat_penalty", 1.1),
            "do_sample": params.get("temperature", 0.7) > 0,
            "pad_token_id": tokenizer.eos_token_id
        }
        
        # 编码输入
        inputs = tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        # 创建流式输出器
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, timeout=10.0)
        
        # 启动生成线程
        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            **generation_config
        )
        
        thread = threading.Thread(target=model.generate, kwargs=generation_kwargs)
        thread.start()
        
        # 流式输出生成的文本
        generated_text = ""
        for new_text in streamer:
            # 检查是否请求中断
            if abort_signals[request_id].is_set():
                logger.info(f"请求 {request_id} 被中断")
                break
            
            generated_text += new_text
            yield json.dumps({"response": new_text})
        
        # 生成完成，清理资源
        if request_id in abort_signals:
            del abort_signals[request_id]
        
    except Exception as e:
        logger.error(f"生成流出错: {str(e)}")
        yield json.dumps({"error": str(e)})

# 非流式文本生成
def generate_text(model_name: str, prompt: str, params: Dict[str, Any], request_id: str) -> str:
    try:
        # 创建中断信号
        abort_signals[request_id] = Event()
        
        # 加载模型和分词器
        model, tokenizer = load_model(model_name)
        
        # 设置生成参数
        generation_config = {
            "max_new_tokens": params.get("max_tokens", 1000),
            "temperature": params.get("temperature", 0.7),
            "top_p": params.get("top_p", 0.9),
            "top_k": params.get("top_k", 50),
            "repetition_penalty": params.get("repeat_penalty", 1.1),
            "do_sample": params.get("temperature", 0.7) > 0,
            "pad_token_id": tokenizer.eos_token_id
        }
        
        # 编码输入
        inputs = tokenizer(prompt, return_tensors="pt")
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        # 生成文本
        output = model.generate(**inputs, **generation_config)
        
        # 解码输出，跳过输入提示
        input_length = inputs["input_ids"].shape[1]
        generated_text = tokenizer.decode(output[0][input_length:], skip_special_tokens=True)
        
        # 生成完成，清理资源
        if request_id in abort_signals:
            del abort_signals[request_id]
            
        return generated_text
        
    except Exception as e:
        logger.error(f"生成文本出错: {str(e)}")
        raise

@app.route('/api/generate', methods=['POST'])
def generate():
    # 解析请求数据
    try:
        data = request.json
        model_name = data.get('model', '')
        prompt = data.get('prompt', '')
        stream = data.get('stream', True)
        
        # 合并其他参数
        params = {
            "temperature": data.get('temperature', 0.7),
            "top_p": data.get('top_p', 0.9),
            "top_k": data.get('top_k', 50),
            "max_tokens": data.get('max_tokens', 1000),
            "repeat_penalty": data.get('repeat_penalty', 1.1),
            "stop": data.get('stop', None)
        }
        
        # 生成请求ID
        request_id = f"req_{time.time()}"
        
        logger.info(f"收到生成请求 ID: {request_id}, 模型: {model_name}, 流式: {stream}")
        
        if not model_name:
            return jsonify({"error": "缺少模型名称参数"}), 400
        
        if not prompt:
            return jsonify({"error": "缺少提示词参数"}), 400
            
        # 根据流式标志选择不同处理方式
        if stream:
            # 流式响应
            return Response(
                stream_with_context(generate_stream(model_name, prompt, params, request_id)),
                content_type='application/x-ndjson'
            )
        else:
            # 非流式响应
            result = generate_text(model_name, prompt, params, request_id)
            return jsonify({"response": result})
            
    except Exception as e:
        logger.error(f"处理请求时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/abort', methods=['POST'])
def abort_generation():
    try:
        data = request.json
        request_id = data.get('request_id', '')
        
        if not request_id:
            return jsonify({"error": "缺少请求ID参数"}), 400
            
        # 设置中断信号
        if request_id in abort_signals:
            abort_signals[request_id].set()
            return jsonify({"status": "成功", "message": f"请求 {request_id} 已中断"})
        else:
            return jsonify({"status": "失败", "message": f"请求 {request_id} 未找到"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/models', methods=['GET'])
def list_models():
    """列出可用的本地模型"""
    # 这里可以扫描模型目录或返回预定义的模型列表
    # 示例实现，实际可根据需要修改
    models_dir = os.environ.get("MODELS_DIR", "./models")
    
    # 检查目录是否存在
    if not os.path.exists(models_dir):
        return jsonify({
            "models": [
                {"id": "ChatGLM3-6B", "name": "ChatGLM3-6B", "description": "清华大学开源的对话模型"},
                {"id": "Qwen-7B-Chat", "name": "Qwen-7B-Chat", "description": "阿里通义千问对话模型"},
                {"id": "THUDM/chatglm3-6b", "name": "ChatGLM3-6B (HF)", "description": "从HuggingFace加载的ChatGLM3"}
            ]
        })
    
    # 实际扫描目录下的模型（简化实现）
    models = []
    for item in os.listdir(models_dir):
        item_path = os.path.join(models_dir, item)
        if os.path.isdir(item_path) and os.path.exists(os.path.join(item_path, "config.json")):
            models.append({
                "id": item,
                "name": item,
                "description": f"本地模型: {item}"
            })
    
    return jsonify({"models": models})

@app.route('/api/system', methods=['GET'])
def system_info():
    """获取系统信息"""
    cuda_available, cuda_info = check_cuda_availability()
    
    # 获取加载的模型
    loaded_models = list(model_cache.keys())
    
    # 内存信息
    memory_info = {}
    if cuda_available:
        memory_info["cuda"] = {
            "total": torch.cuda.get_device_properties(0).total_memory / (1024 ** 3),  # GB
            "reserved": torch.cuda.memory_reserved(0) / (1024 ** 3),  # GB
            "allocated": torch.cuda.memory_allocated(0) / (1024 ** 3)  # GB
        }
    
    return jsonify({
        "status": "在线",
        "cuda": cuda_info,
        "loaded_models": loaded_models,
        "memory": memory_info
    })

if __name__ == '__main__':
    # 检查CUDA可用性
    check_cuda_availability()
    app.run(host='0.0.0.0', port=5000, debug=True)