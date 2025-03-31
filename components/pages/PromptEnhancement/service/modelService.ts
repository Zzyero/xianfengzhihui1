/**
 * 模型调用服务
 * 处理API模型和本地模型的调用
 * 支持流式输出和普通输出
 */

import { Model, Message } from "./db";
import OpenAI from 'openai';

/**
 * 模型响应回调函数接口
 */
export interface ModelResponseCallbacks {
  // 开始生成回调
  onStart?: () => void;
  // 流式内容更新回调
  onUpdate?: (content: string) => void;
  // 完成回调
  onComplete?: (fullContent: string) => void;
  // 错误回调
  onError?: (error: Error) => void;
}

/**
 * API模型调用参数
 */
interface ApiModelOptions {
  model: Model;
  messages: Message[];
  callbacks: ModelResponseCallbacks;
  signal?: AbortSignal; // 添加AbortSignal用于取消请求
  customPrompt?: string; // 添加自定义提示词参数
}

/**
 * 本地模型调用参数
 */
interface LocalModelOptions {
  model: Model;
  prompt: string;
  callbacks: ModelResponseCallbacks;
  signal?: AbortSignal; // 添加AbortSignal用于取消请求
  customPrompt?: string; // 添加自定义提示词参数
}

/**
 * 本地模型服务操作类型
 */
export enum LocalModelOperation {
  START = 'start',
  DELETE = 'delete'
}

/**
 * 模型服务类
 */
class ModelService {
  // 保存请求控制器的映射，用于取消请求
  private static controllers: Map<string, AbortController> = new Map();
  
  /**
   * 创建一个新的取消控制器
   * @param id 请求ID
   * @returns AbortController实例
   */
  static createController(id: string): AbortController {
    // 如果已存在同ID的控制器，先中断之前的请求
    if (this.controllers.has(id)) {
      this.abortRequest(id);
    }
    
    // 创建新控制器
    const controller = new AbortController();
    this.controllers.set(id, controller);
    return controller;
  }
  
  /**
   * 中断请求
   * @param id 请求ID
   */
  static abortRequest(id: string): void {
    const controller = this.controllers.get(id);
    if (controller) {
      controller.abort();
      this.controllers.delete(id);
    }
  }
  
  /**
   * 中断所有请求
   */
  static abortAllRequests(): void {
    // 使用Array.from转换为数组后迭代，避免类型错误
    const controllerEntries = Array.from(this.controllers.entries());
    for (const [id, controller] of controllerEntries) {
      controller.abort();
      this.controllers.delete(id);
    }
  }

  /**
   * 操作本地模型（加载或卸载）
   * @param operation 操作类型（加载或卸载）
   * @param modelPath 模型路径
   * @param modelName 模型名称（用于显示）
   * @returns 操作结果
   */
  static async operateLocalModel(operation: LocalModelOperation, modelPath: string, modelName: string): Promise<{
    status: string;
    message: string;
  }> {
    try {
      // 确定API路径
      const apiUrl = `http://localhost:5000/api/${operation}`;
      
      // 发送请求
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modelpath: modelPath, modelname: modelName })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`服务器错误 (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      return {
        status: result.status || 'error',
        message: result.message || '操作完成'
      };
    } catch (error: any) {
      console.error(`${operation}模型失败:`, error);
      return {
        status: 'error',
        message: error.message || `${operation}模型失败`
      };
    }
  }

  /**
   * 调用API模型（如OpenAI）
   * @param options 调用选项
   */
  static async callApiModel(options: ApiModelOptions): Promise<void> {
    const { model, messages, callbacks, signal, customPrompt } = options;

    try {
      // 调用开始回调
      callbacks.onStart?.();

      // 创建OpenAI客户端
      const openai = new OpenAI({
        apiKey: model.apiKey || '',
        dangerouslyAllowBrowser: true,
        baseURL: model.url || undefined
      });

      // 转换消息格式
      const apiMessages = messages.map(msg => ({
        role: msg.role as any,
        content: msg.content
      }));

      // 如果存在自定义提示词，将其添加到系统消息中
      if (customPrompt && customPrompt.trim()) {
        // 检查是否已有系统消息
        const hasSystemMessage = apiMessages.some(msg => msg.role === 'system');
        
        if (hasSystemMessage) {
          // 更新现有的系统消息
          for (let i = 0; i < apiMessages.length; i++) {
            if (apiMessages[i].role === 'system') {
              apiMessages[i].content = customPrompt;
              break;
            }
          }
        } else {
          // 添加新的系统消息作为第一条消息
          apiMessages.unshift({
            role: 'system',
            content: customPrompt
          });
        }
      } else {
        // 如果没有自定义提示词，确保移除所有system消息
        const filteredMessages = apiMessages.filter(msg => msg.role !== 'system');
        apiMessages.length = 0; // 清空数组
        apiMessages.push(...filteredMessages); // 重新填充
      }

      // 设置默认参数
      // 使用apiId
      let apiModelId = model.apiId;
      let temperature = 0.7;
      let max_tokens = 2000;
      let stream = true; // 默认使用流式输出

      // 如果有自定义参数，解析并使用
      if (model.parameters) {
        try {
          const customParams = JSON.parse(model.parameters);
          if (customParams.temperature !== undefined) temperature = customParams.temperature;
          if (customParams.max_tokens !== undefined) max_tokens = customParams.max_tokens;
          if (customParams.stream !== undefined) stream = customParams.stream;
        } catch (e) {
          console.error('解析自定义参数失败:', e);
        }
      }

      let fullContent = '';

      // 流式调用
      if (stream) {
        // 创建请求选项对象，正确处理signal
        const requestOptions = signal ? { signal } : {};
        
        const stream = await openai.chat.completions.create({
          model: apiModelId || '', 
          messages: apiMessages,
          temperature: temperature,
          max_tokens: max_tokens,
          stream: true
        }, requestOptions);

        for await (const chunk of stream) {
          // 检查是否已取消
          if (signal?.aborted) {
            throw new Error('请求已取消');
          }
          
          const content = chunk.choices[0]?.delta?.content || '';
          fullContent += content;
          callbacks.onUpdate?.(fullContent);
        }

        // 调用完成回调
        callbacks.onComplete?.(fullContent);
      } else {
        // 非流式调用
        // 创建请求选项对象，正确处理signal
        const requestOptions = signal ? { signal } : {};
        
        const completion = await openai.chat.completions.create({
          model: apiModelId || '',
          messages: apiMessages,
          temperature: temperature,
          max_tokens: max_tokens,
          stream: false
        }, requestOptions);

        fullContent = completion.choices[0].message.content || '';
        callbacks.onComplete?.(fullContent);
      }
    } catch (error: any) {
      // 检查是否是取消的错误
      if (error.name === 'AbortError' || (signal && signal.aborted)) {
        console.log('API调用已取消');
        return;
      }
      
      // 处理API错误
      console.error('API模型调用失败:', error);
      const errorMsg = error.status 
        ? `API调用失败(${error.status}): ${error.message || '未知错误'}`
        : `API调用失败: ${error.message || '未知错误'}`;
      callbacks.onError?.(new Error(errorMsg));
    }
  }

/**
   * 调用本地模型（使用Python后端）
   * @param options 调用选项
   */
  static async callLocalModel(options: LocalModelOptions): Promise<void> {
    const { model, prompt, callbacks, signal, customPrompt } = options;

    // 调用开始回调
    callbacks.onStart?.();

    // 创建AbortController用于中断fetch请求
    const controller = new AbortController();
    if (signal) {
      // 如果原始请求被中断，同时中断本地请求
      signal.addEventListener('abort', () => {
        controller.abort();
        this.abortLocalModelRequest().catch(console.error);
      });
    }

    try {
      // 准备请求参数
      const requestData = {
        prompt: prompt,
        customPrompt: customPrompt,
        parameters: {
          // 解析model.parameters中的参数，如果有的话
          ...(model.parameters ? JSON.parse(model.parameters) : {}),
          // 默认参数
          max_length: 2000,
          temperature: 0.7,
          top_p: 0.9,
          // 添加检查间隔参数，设置为2，每生成2个token检查一次终止信号
          check_interval: 2
        }
      };

      // 发送请求到本地服务器
      const response = await fetch('http://localhost:5000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal // 添加中断信号
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`服务器错误 (${response.status}): ${errorText}`);
      }

      // 获取响应流
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法创建响应流读取器');
      }

      // 用于解码
      const decoder = new TextDecoder();
      let fullContent = '';
      
      // 处理流式响应
      while (true) {
        // 检查是否已取消
        if (signal?.aborted || controller.signal.aborted) {
          console.log('本地模型请求已取消');
          await this.abortLocalModelRequest();
          break;
        }

        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        // 解码文本
        const text = decoder.decode(value, { stream: true });
        
        // 处理每一行JSON响应
        const lines = text.split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            // 根据状态处理
            if (data.status === 'started') {
              // 开始生成
              console.log('本地模型开始生成');
            } else if (data.status === 'generating') {
              // 更新生成的文本
              fullContent += data.text;
              callbacks.onUpdate?.(fullContent);
            } else if (data.status === 'completed') {
              // 生成完成
              callbacks.onComplete?.(data.text || fullContent);
              return;
            } else if (data.status === 'aborted') {
              // 生成被中断
              console.log('本地模型生成被中断');
              callbacks.onComplete?.(data.text || fullContent);
              return;
            } else if (data.status === 'error') {
              // 处理错误
              throw new Error(data.message || '生成过程中出错');
            }
          } catch (e) {
            console.error('解析JSON响应失败:', e, line);
          }
        }
      }

      // 如果流结束但没有完成回调，执行完成回调
      if (fullContent) {
        callbacks.onComplete?.(fullContent);
      }
    } catch (error: any) {
      // 检查是否是取消的错误
      if (error.name === 'AbortError' || (signal && signal.aborted)) {
        console.log('本地模型调用已取消');
        return;
      }
      
      // 处理错误
      console.error('本地模型调用失败:', error);
      callbacks.onError?.(new Error(`本地模型调用失败: ${error.message || '未知错误'}`));
    }
  }

    /**
   * 中断本地模型的生成过程
   */
    public static async abortLocalModelRequest(): Promise<void> {
      let success = false;
      try {
        console.log(`发送中断请求到服务器`);
        
        const response = await fetch('http://localhost:5000/api/abort', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}), // 空请求体
          // 设置较短的超时时间
          signal: AbortSignal.timeout(5000)
        });
        
        const result = await response.json();
        console.log('服务器响应:', result);
        
        if (response.ok) {
          console.log('成功发送中断信号:', result.message);
          success = true;// 请求成功
        } else {
          console.error('发送中断信号失败:', result.message || '未知错误');
        }
      } catch (error) {
        console.error(`发送中断请求失败`, error);
      }
      
  
      if (!success) {
        throw new Error('无法中断生成过程，请尝试刷新页面');
      }
      
      return;
    }
}

export default ModelService; 