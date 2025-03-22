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
def load_model(model_name: str,model_path:str):
    # 检查是否已经缓存
    if model_path in model_cache:
        return model_cache[model_path], tokenizer_cache[model_path]
    
    logger.info(f"正在加载模型: {model_path}")
    try:
        # 确定设备
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"使用设备: {device}")
        
        # 加载分词器和模型
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(
            model_path, 
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
            low_cpu_mem_usage=True if device == "cuda" else False
        )
        
        # 缓存模型和分词器
        model_cache[model_path] = model
        tokenizer_cache[model_path] = tokenizer
        
        logger.info(f"模型 {model_name} 加载成功,模型地址:{model_path}")
        return model, tokenizer
    except Exception as e:
        logger.error(f"加载模型 {model_name} 失败: {str(e)}，模型名称:{model_path}")
        raise

# 卸载模型
def unload_model(model_name: str,model_path:str):
    if model_path in model_cache:
        logger.info(f"正在卸载模型: {model_path}")
        try:
            # 从缓存中删除模型和分词器
            del model_cache[model_path]
            del tokenizer_cache[model_path]
            
            # 尝试手动触发垃圾回收
            import gc
            gc.collect()
            
            # 如果使用CUDA，清理CUDA缓存
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                
            extra_tensors = [t for t in gc.get_objects() if isinstance(t, torch.Tensor) and t.is_cuda]
            for t in extra_tensors:
                del t
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                logger.info(f"模型 {model_name} 已成功卸载，模型地址:{model_path}")
            return True
        except Exception as e:
            logger.error(f"卸载模型 {model_name} 失败: {str(e)}，模型地址:{model_path}")
            return False
    else:
        logger.warning(f"模型 {model_name} 未加载，无需卸载")
        return False

# 流式文本生成
def generate_stream(model_path: str, prompt: str, params: Dict[str, Any], request_id: str) -> Generator[str, None, None]:
    try:
        # 创建中断信号
        abort_signals[request_id] = Event()
        
        # 获取模型和分词器（假设已经加载）
        if model_path not in model_cache or model_path not in tokenizer_cache:
            raise ValueError(f"模型 {model_path} 未加载，请先加载模型")
            
        model = model_cache[model_path]
        tokenizer = tokenizer_cache[model_path]
        
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
        
        # 获取模型和分词器（假设已经加载）
        if model_name not in model_cache or model_name not in tokenizer_cache:
            raise ValueError(f"模型 {model_name} 未加载，请先加载模型")
            
        model = model_cache[model_name]
        tokenizer = tokenizer_cache[model_name]
        
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

@app.route('/api/start', methods=['POST'])
def start():
    try:
        data = request.json
        model_path = data.get('modelpath', '')
        model_name = data.get('modelname', '')

        if not model_path:
            return jsonify({"error": "缺少模型路径参数"}), 400
            
        # 检查模型是否已经加载
        if model_path in model_cache:
            return jsonify({
                "status": "success", 
                "message": f"模型 {model_name} 已经加载",
                "modelpath": model_path
            })
            
        # 加载模型
        _, _ = load_model(model_name,model_path)
        
        return jsonify({
            "status": "success", 
            "message": f"模型 {model_name} 加载成功",
            "modelpath": model_path
        })
        
    except Exception as e:
        logger.error(f"加载模型失败: {str(e)}")
        return jsonify({"error": str(e)}), 500
        
@app.route('/api/delete', methods=['POST'])
def delete():
    try:
        data = request.json
        model_path = data.get('modelpath', '')
        model_name = data.get('modelname', '')
        if not model_path:
            return jsonify({"error": "缺少模型路径参数"}), 400
            
        # 检查模型是否已经加载
        if model_path not in model_cache:
            return jsonify({
                "status": "warning", 
                "message": f"模型 {model_name} 未加载，无需卸载",
                "modelpath": model_path
            })
            
        # 卸载模型
        success = unload_model(model_name,model_path)
        
        if success:
            return jsonify({
                "status": "success", 
                "message": f"模型 {model_name} 卸载成功",
                "modelpath": model_path
            })
        else:
            return jsonify({
                "status": "error", 
                "message": f"模型 {model_name} 卸载失败",
                "modelpath": model_path
            }), 500
            
    except Exception as e:
        logger.error(f"卸载模型失败: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate', methods=['POST'])
def generate():
    # 解析请求数据
    try:
        data = request.json
        model_path = data.get('modelpath', '')
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
        
        logger.info(f"收到生成请求 ID: {request_id}, 模型路径: {model_path}, 流式: {stream}")
        
        if not model_path:
            return jsonify({"error": "缺少模型路径参数"}), 400
        
        if not prompt:
            return jsonify({"error": "缺少提示词参数"}), 400
        
        # 检查模型是否已加载    
        if model_path not in model_cache:
            return jsonify({"error": f"模型 {model_path} 未加载，请先加载模型"}), 400
            
        # 根据流式标志选择不同处理方式
        if stream:
            # 流式响应
            return Response(
                stream_with_context(generate_stream(model_path, prompt, params, request_id)),
                content_type='application/x-ndjson',
                headers={'X-Request-ID': request_id})
        else:
            # 非流式响应
            result = generate_text(model_path, prompt, params, request_id)
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