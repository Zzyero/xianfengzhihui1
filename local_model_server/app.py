"""
本地模型服务器
提供本地AI模型的加载、卸载、文本生成和中断功能
通过Flask API与前端交互
"""

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
import os
import threading
import time
import json
import traceback

# 创建Flask应用
app = Flask(__name__)
# 允许跨域请求
CORS(app)

# 全局变量
loaded_model = None  # 加载的模型
loaded_tokenizer = None  # 加载的分词器
model_name = None  # 加载的模型名称
model_path = None  # 加载的模型路径
generation_thread = None  # 用于生成文本的线程
abort_flag = False  # 中断标志
generation_lock = threading.Lock()  # 用于线程同步的锁

# 配置参数
DEFAULT_MAX_LENGTH = 2000  # 默认最大生成长度
DEFAULT_TEMPERATURE = 0.7  # 默认温度参数
DEFAULT_TOP_P = 0.9  # 默认top_p参数

# 自定义流式输出器，每生成指定数量的token就检查终止信号
class CustomTextIteratorStreamer(TextIteratorStreamer):
    def __init__(self, tokenizer, skip_prompt=False, skip_special_tokens=True, check_interval=5):
        super().__init__(tokenizer, skip_prompt, skip_special_tokens)
        self.check_interval = check_interval  # 每生成多少token检查一次终止信号
        self.token_counter = 0  # token计数器
        self.should_abort = False  # 终止标志
    
    def put(self, value):
        """将新生成的token放入队列，并每隔check_interval个token检查终止信号"""
        # 每生成指定数量的token检查一次终止信号
        self.token_counter += 1
        
        # 检查是否应该中断生成
        if self.should_abort or (self.token_counter % self.check_interval == 0 and abort_flag):
            print(f"CustomTextIteratorStreamer: 检测到终止信号，在第{self.token_counter}个token处中断生成")
            
            try:
                # 只抛出异常中断生成，不尝试清空队列或添加终止标记
                # 在迭代器循环中处理中断
                raise StopIteration("生成已中断")
            except Exception as e:
                print(f"中断生成: {str(e)}")
                raise
        
        # 正常情况下放入队列
        try:
            super().put(value)
        except Exception as e:
            print(f"将token放入队列时出错: {str(e)}")
            # 不再尝试直接访问队列

# 检查CUDA是否可用的函数
def check_cuda_availability():
    """检查CUDA是否可用并返回相关信息"""
    if torch.cuda.is_available():
        device_count = torch.cuda.device_count()
        device_names = []
        for i in range(device_count):
            device_name = torch.cuda.get_device_name(i)
            device_names.append(device_name)
        
        cuda_info = f"{device_count}个GPU: {', '.join(device_names)}"
        return True, cuda_info
    else:
        return False, "CUDA不可用，使用CPU"

@app.route('/api/start', methods=['POST'])
def start_model():
    """
    加载模型
    请求参数:
    {
        "modelpath": "模型路径",
        "modelname": "模型名称"
    }
    """
    global loaded_model, loaded_tokenizer, model_name, model_path
    
    try:
        data = request.json
        model_path_input = data.get('modelpath')
        model_name_input = data.get('modelname')
        
        if not model_path_input:
            return jsonify({"status": "error", "message": "模型路径不能为空"}), 400
        
        # 检查模型路径是否存在
        if not os.path.exists(model_path_input):
            return jsonify({"status": "error", "message": f"模型路径不存在: {model_path_input}"}), 404
        
        # 同时加载模型和分词器
        with generation_lock:
            # 先释放之前的模型以释放GPU内存
            if loaded_model is not None:
                del loaded_model
                del loaded_tokenizer
                torch.cuda.empty_cache()
                loaded_model = None
                loaded_tokenizer = None
            
            # 确定设备
            use_cuda = torch.cuda.is_available()
            device = "cuda" if use_cuda else "cpu"
            print(f"正在加载模型到设备: {device}")
            
            # 加载分词器
            loaded_tokenizer = AutoTokenizer.from_pretrained(model_path_input, trust_remote_code=True)
            
            # 加载模型 - 修复device_map参数设置
            if use_cuda:
                # 使用"auto"让transformers自动处理设备映射
                loaded_model = AutoModelForCausalLM.from_pretrained(
                    model_path_input,
                    device_map="auto",  # 使用"auto"自动管理设备映射
                    torch_dtype=torch.float16,
                    trust_remote_code=True
                )
            else:
                # CPU模式不使用device_map
                loaded_model = AutoModelForCausalLM.from_pretrained(
                    model_path_input,
                    torch_dtype=torch.float32,
                    trust_remote_code=True
                )
                loaded_model = loaded_model.to("cpu")
            
            # 更新模型名称和路径
            model_name = model_name_input or os.path.basename(model_path_input)
            model_path = model_path_input
            
            return jsonify({
                "status": "success", 
                "message": f"模型 {model_name} 已成功加载到 {device}",
                "model_info": {
                    "name": model_name,
                    "device": device
                }
            })
    except Exception as e:
        print("加载模型时出错:", str(e))
        traceback.print_exc()
        return jsonify({"status": "error", "message": f"加载模型失败: {str(e)}"}), 500

@app.route('/api/delete', methods=['POST'])
def delete_model():
    """
    卸载模型
    请求参数:
    {
        "modelpath": "模型路径",
        "modelname": "模型名称"
    }
    """
    global loaded_model, loaded_tokenizer, model_name, model_path
    
    try:
        with generation_lock:
            if loaded_model is None:
                return jsonify({"status": "warning", "message": "没有已加载的模型"}), 200
            
            # 获取之前加载的模型名
            old_model_name = model_name
            
            # 释放模型和分词器
            del loaded_model
            del loaded_tokenizer
            torch.cuda.empty_cache()
            loaded_model = None
            loaded_tokenizer = None
            model_name = None
            model_path = None
            
            return jsonify({
                "status": "success", 
                "message": f"模型 {old_model_name} 已成功卸载"
            })
    except Exception as e:
        print("卸载模型时出错:", str(e))
        traceback.print_exc()
        return jsonify({"status": "error", "message": f"卸载模型失败: {str(e)}"}), 500

@app.route('/api/generate', methods=['POST'])
def generate_text():
    """
    生成文本
    请求参数:
    {
        "prompt": "提示词",
        "parameters": { // 可选参数
            "max_length": 2000,
            "temperature": 0.7,
            "top_p": 0.9
        }
    }
    """
    global loaded_model, loaded_tokenizer, abort_flag, generation_thread
    
    if loaded_model is None or loaded_tokenizer is None:
        return jsonify({"status": "error", "message": "模型未加载，请先加载模型"}), 400
    
    try:
        data = request.json
        prompt = data.get('prompt', '')
        custom_prompt = data.get('customPrompt', '')
        
        # 确保prompt不为空，防止空输入
        if not prompt.strip():
            prompt = "请生成一些文本"  # 默认提示词
        
        # 用于模型输入的完整提示词（包含自定义提示词）
        input_prompt = ""
        
        # 如果有自定义提示词，将其添加到输入中
        if custom_prompt and custom_prompt.strip():
            input_prompt = f"{custom_prompt}\n{prompt}"
        else:
            input_prompt = prompt
        
        # 获取生成参数
        parameters = data.get('parameters', {})
        max_length = parameters.get('max_length', DEFAULT_MAX_LENGTH)
        temperature = parameters.get('temperature', DEFAULT_TEMPERATURE)
        top_p = parameters.get('top_p', DEFAULT_TOP_P)
        check_interval = parameters.get('check_interval', 5)  # 每生成5个token检查一次终止信号
        
        # 重置中断标志
        abort_flag = False
        
        def generate():
            global abort_flag
            
            try:
                # 创建自定义流式输出器，设置检查间隔
                streamer = CustomTextIteratorStreamer(
                    loaded_tokenizer, 
                    skip_prompt=True,
                    skip_special_tokens=True,
                    check_interval=check_interval
                )
                
                # 准备输入
                inputs = loaded_tokenizer(input_prompt, return_tensors="pt")
                input_length = inputs["input_ids"].shape[1]  # 记录输入的token长度
                
                # 将输入移动到正确的设备
                if torch.cuda.is_available():
                    inputs = {k: v.to("cuda") for k, v in inputs.items()}
                
                # 创建生成线程
                def generation_worker():
                    global abort_flag
                    try:
                        with generation_lock:
                            # 生成文本
                            with torch.no_grad():
                                _ = loaded_model.generate(
                                    inputs=inputs["input_ids"],
                                    max_length=input_length + max_length,  # 考虑输入长度
                                    temperature=temperature,
                                    top_p=top_p,
                                    do_sample=temperature > 0,
                                    streamer=streamer
                                )
                    except StopIteration as e:
                        # 捕获自定义的终止异常
                        print(f"生成被中断: {str(e)}")
                    except Exception as e:
                        error_msg = f"生成文本时出错: {str(e)}"
                        print(error_msg)
                        traceback.print_exc()
                
                # 启动生成线程
                generation_thread = threading.Thread(target=generation_worker)
                generation_thread.daemon = True  # 设为守护线程，主线程结束时自动终止
                generation_thread.start()
                
                # 生成并发送部分响应
                generated_text = ""
                
                # 发送响应头
                yield json.dumps({"status": "started"}) + "\n"
                
                # 从流中获取生成的文本
                try:
                    for new_text in streamer:
                        # 如果收到None，说明生成已被中断
                        if new_text is None:
                            print("收到终止信号")
                            yield json.dumps({"status": "aborted", "text": generated_text}) + "\n"
                            break
                            
                        # 检查全局终止标志
                        if abort_flag:
                            # 设置streamer的终止标志
                            print("设置终止标志")
                            streamer.should_abort = True
                            # 发送中断状态
                            yield json.dumps({"status": "aborted", "text": generated_text}) + "\n"
                            break
                        
                        # 正常处理生成的文本
                        generated_text += new_text
                        yield json.dumps({"status": "generating", "text": new_text}) + "\n"
                    
                    # 如果没有被中断，发送完成响应
                    if not abort_flag and not streamer.should_abort:
                        yield json.dumps({"status": "completed", "text": generated_text}) + "\n"
                except StopIteration:
                    # 处理StopIteration异常，这通常意味着生成已完成或被中断
                    if abort_flag or streamer.should_abort:
                        yield json.dumps({"status": "aborted", "text": generated_text}) + "\n"
                    else:
                        yield json.dumps({"status": "completed", "text": generated_text}) + "\n"
                except Exception as e:
                    print(f"流处理出错: {str(e)}")
                    traceback.print_exc()
                    yield json.dumps({"status": "error", "message": str(e)}) + "\n"
                
                # 等待生成线程结束，设置更长的超时时间
                if generation_thread.is_alive():
                    generation_thread.join(timeout=5.0)
                
            except Exception as e:
                error_msg = f"流式生成出错: {str(e)}"
                print(error_msg)
                traceback.print_exc()
                yield json.dumps({"status": "error", "message": error_msg}) + "\n"
        
        # 返回流式响应
        return Response(
            stream_with_context(generate()),
            mimetype='application/json',
            headers={
                'X-Accel-Buffering': 'no',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Content-Type': 'application/json'
            }
        )
        
    except Exception as e:
        print("处理生成请求时出错:", str(e))
        traceback.print_exc()
        return jsonify({"status": "error", "message": f"处理生成请求失败: {str(e)}"}), 500

@app.route('/api/abort', methods=['POST'])
def abort_generation():
    """
    中断文本生成
    """
    global abort_flag
    
    try:
        # 设置中断标志
        abort_flag = True
        print("收到中断请求，设置中断标志为True")
        
        # 如果当前有活动的streamer，尝试直接设置其should_abort标志
        if generation_thread and generation_thread.is_alive():
            print("生成线程正在运行，尝试发送中断信号")
        
        # 等待一小段时间，确保设置了中断标志
        time.sleep(0.1)
        
        return jsonify({
            "status": "success",
            "message": "已发送中断信号"
        })
    except Exception as e:
        print("中断生成时出错:", str(e))
        traceback.print_exc()
        return jsonify({"status": "error", "message": f"中断失败: {str(e)}"}), 500

@app.route('/api/system', methods=['GET'])
def system_info():
    """获取系统信息"""
    global model_path
    
    # 检查CUDA是否可用
    cuda_available, cuda_info = check_cuda_availability()
    
    loaded_models = model_path if model_path else None
    
    return jsonify({
        "status": "在线",
        "cuda": cuda_info,
        "loaded_models": loaded_models
    })

if __name__ == '__main__':
    # 启动Flask应用
    app.run(host='0.0.0.0', port=5000, debug=False)
