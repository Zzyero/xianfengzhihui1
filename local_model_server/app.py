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
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer,
    StoppingCriteria, StoppingCriteriaList
)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # 启用CORS以支持前端跨域请求

# 模型缓存
model_cache = {}
tokenizer_cache = {}

# 全局中断标志
stop_generation = threading.Event()

# 请求模型
class GenerateRequest(BaseModel):
    model: str  # 模型名称或路径
    messages: List[Dict[str, str]]  # 消息数组
    stream: bool = True  # 是否使用流式输出
    temperature: float = 0.7  # 温度参数
    top_p: float = 0.9  # Top-p采样
    top_k: int = 50  # Top-k采样
    max_tokens: int = 2000  # 最大生成token数
    stop: Optional[List[str]] = None  # 停止词列表

    class Config:
        arbitrary_types_allowed = True

# 自定义停止生成条件（排除历史记录的token）
class AbortGenerationCriteria(StoppingCriteria):
    def __init__(self, history_token_count: int):
        self.start_time = time.time()
        self.history_token_count = history_token_count  # 历史消息的token数

    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor, **kwargs) -> bool:
        if stop_generation.is_set():
            generated_tokens = input_ids.shape[1] - self.history_token_count
            logger.info(f"检测到中断信号，已生成 {generated_tokens} 个新token，耗时 {time.time() - self.start_time:.2f}s")
            return True

        if input_ids.shape[1] % 10 == 0:
            generated_tokens = input_ids.shape[1] - self.history_token_count
            if generated_tokens % 50 == 0:
                logger.info(f"已生成 {generated_tokens} 个新token，耗时 {time.time() - self.start_time:.2f}s")

        return False

# 检查CUDA是否可用
def check_cuda_availability():
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        device_name = torch.cuda.get_device_name(0) if device_count > 0 else "Unknown"
        return True, f"CUDA可用 ({device_name})"
    else:
        return False, "CUDA不可用，使用CPU"

# 加载模型函数
def load_model(model_name: str, model_path: str):
    if model_path in model_cache:
        return model_cache[model_path], tokenizer_cache[model_path]

    logger.info(f"正在加载模型: {model_path}")
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
            low_cpu_mem_usage=True if device == "cuda" else False
        )

        model_cache[model_path] = model
        tokenizer_cache[model_path] = tokenizer
        logger.info(f"模型 {model_name} 加载成功，模型地址:{model_path}")
        return model, tokenizer
    except Exception as e:
        logger.error(f"加载模型 {model_name} 失败: {str(e)}，模型名称:{model_path}")
        raise

# 卸载模型
def unload_model(model_name: str, model_path: str):
    if model_path in model_cache:
        logger.info(f"正在卸载模型: {model_path}")
        try:
            del model_cache[model_path]
            del tokenizer_cache[model_path]

            import gc
            gc.collect()

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                extra_tensors = [t for t in gc.get_objects() if isinstance(t, torch.Tensor) and t.is_cuda]
                for t in extra_tensors:
                    del t
                gc.collect()
                torch.cuda.empty_cache()

            logger.info(f"模型 {model_name} 已成功卸载，模型地址:{model_path}")
            return True
        except Exception as e:
            logger.error(f"卸载模型 {model_name} 失败: {str(e)}，模型地址:{model_path}")
            return False
    else:
        logger.warning(f"模型 {model_name} 未加载，无需卸载")
        return False

# 转换消息格式为模型输入
def format_messages_for_model(messages: List[Dict[str, str]], tokenizer: AutoTokenizer) -> str:
    logger.info(f"格式化消息，总数: {len(messages)}")
    conversation = []
    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        if role == "system":
            conversation.append(f"<|system|>\n{content}")
        elif role == "user":
            conversation.append(f"<|user|>\n{content}")
        elif role == "assistant":
            conversation.append(f"<|assistant|>\n{content}")

    conversation.append("<|assistant|>")
    prompt = "\n".join(conversation)
    logger.info(f"格式化后的提示词长度: {len(prompt)}")
    return prompt

# 清理资源
def cleanup_resources():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        logger.info("已清理CUDA缓存")

    stop_generation.clear()
    logger.info("已重置中断标志")

# 流式文本生成
def generate_stream(model_path: str, messages: List[Dict[str, str]], params: Dict[str, Any]) -> Generator[str, None, None]:
    try:
        stop_generation.clear()
        logger.info(f"开始生成，模型路径: {model_path}, 消息数: {len(messages)}")

        if model_path not in model_cache or model_path not in tokenizer_cache:
            raise ValueError(f"模型 {model_path} 未加载，请先加载模型")

        model = model_cache[model_path]
        tokenizer = tokenizer_cache[model_path]
        generation_config = {
            "max_new_tokens": params.get("max_tokens", 1000),
            "temperature": params.get("temperature", 0.7),
            "top_p": params.get("top_p", 0.9),
            "top_k": params.get("top_k", 50),
            "repetition_penalty": params.get("repeat_penalty", 1.1),
            "do_sample": params.get("temperature", 0.7) > 0,
            "pad_token_id": tokenizer.eos_token_id
        }

        logger.info("开始生成")
        prompt = format_messages_for_model(messages, tokenizer)
        inputs = tokenizer(prompt, return_tensors="pt")
        history_token_count = inputs["input_ids"].shape[1]
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, timeout=10.0)
        stopping_criteria = StoppingCriteriaList([AbortGenerationCriteria(history_token_count)])

        generation_kwargs = dict(
            **inputs,
            streamer=streamer,
            stopping_criteria=stopping_criteria,
            **generation_config
        )

        thread = threading.Thread(target=model.generate, kwargs=generation_kwargs)
        thread.daemon = True
        thread.start()

        generated_text = ""
        for new_text in streamer:
            generated_text += new_text
            if stop_generation.is_set():
                cleanup_resources()
                yield json.dumps({"status": "terminated", "message": "生成已终止"}) + "\n"
                break
            yield json.dumps({"response": new_text}) + "\n"

        cleanup_resources()

    except Exception as e:
        logger.error(f"生成流出错: {str(e)}")
        yield json.dumps({"error": str(e)}) + "\n"
        cleanup_resources()


@app.route('/api/start', methods=['POST'])
def start():
    try:
        data = request.json
        model_path = data.get('modelpath', '')
        model_name = data.get('modelname', '')

        if not model_path:
            return jsonify({"error": "缺少模型路径参数"}), 400

        if model_path in model_cache:
            return jsonify({
                "status": "success",
                "message": f"模型 {model_name} 已经加载",
                "modelpath": model_path
            })

        _, _ = load_model(model_name, model_path)
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

        if model_path not in model_cache:
            return jsonify({
                "status": "warning",
                "message": f"模型 {model_name} 未加载，无需卸载",
                "modelpath": model_path
            })

        success = unload_model(model_name, model_path)
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
    try:
        data = request.json
        logger.info(f"接收到生成请求")

        model_path = data.get('modelpath', '')
        messages = data.get('messages', [])

        if not model_path:
            return jsonify({"error": "缺少模型路径参数"}), 400

        if not messages:
            return jsonify({"error": "缺少消息参数"}), 400

        if stop_generation.is_set():
            time.sleep(0.5)
            stop_generation.clear()

        params = {
            "temperature": data.get('temperature', 0.7),
            "top_p": data.get('top_p', 0.9),
            "top_k": data.get('top_k', 50),
            "max_tokens": data.get('max_tokens', 1000),
            "repeat_penalty": data.get('repeat_penalty', 1.1),
            "stop": data.get('stop', None)
        }

        if model_path not in model_cache:
            return jsonify({"error": f"模型 {model_path} 未加载，请先加载模型"}), 400

        return Response(
            stream_with_context(generate_stream(model_path, messages, params)),
            content_type='application/x-ndjson'
        )

    except Exception as e:
        logger.error(f"处理请求时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/abort', methods=['POST'])
def abort_generation():
    try:
        logger.info("收到中断请求")
        stop_generation.set()
        time.sleep(0.1)
        return jsonify({
            "status": "success",
            "message": "已发送中断信号"
        })

    except Exception as e:
        logger.error(f"中断请求处理失败: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/system', methods=['GET'])
def system_info():
    cuda_available, cuda_info = check_cuda_availability()
    loaded_models = list(model_cache.keys())
    memory_info = {}

    if cuda_available:
        memory_info["cuda"] = {
            "total": torch.cuda.get_device_properties(0).total_memory / (1024 ** 3),
            "reserved": torch.cuda.memory_reserved(0) / (1024 ** 3),
            "allocated": torch.cuda.memory_allocated(0) / (1024 ** 3)
        }

    return jsonify({
        "status": "在线",
        "cuda": cuda_info,
        "loaded_models": loaded_models,
        "memory": memory_info,
        "generation_active": stop_generation.is_set()
    })


if __name__ == '__main__':
    check_cuda_availability()
    app.run(host='0.0.0.0', port=5000, debug=False)
    