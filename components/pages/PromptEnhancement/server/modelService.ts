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
      if (customPrompt) {
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
      }

      // 设置默认参数
      let modelName = model.name;
      let temperature = 0.7;
      let max_tokens = 2000;
      let stream = true; // 默认使用流式输出

      // 如果有自定义参数，解析并使用
      if (model.parameters) {
        try {
          const customParams = JSON.parse(model.parameters);
          if (customParams.model) modelName = customParams.model;
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
          model: modelName,
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
          model: modelName,
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
        callbacks.onError?.(new Error('生成已停止'));
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
   * 调用本地模型（如Ollama）
   * @param options 调用选项
   */
  static async callLocalModel(options: LocalModelOptions): Promise<void> {
    const { model, prompt, callbacks, signal, customPrompt } = options;

    try {
      // 调用开始回调
      callbacks.onStart?.();

      // 设置默认参数
      let modelPath = model.path || '';
      // 使用自定义提示词或原始提示
      let promptContent = customPrompt ? `${customPrompt}\n\n${prompt}` : prompt;
      let stream = true; // 默认使用流式输出
      let ollamaParams: Record<string, any> = {};

      // 如果有自定义参数，解析并使用
      if (model.parameters) {
        try {
          const customParams = JSON.parse(model.parameters);
          if (customParams.stream !== undefined) stream = customParams.stream;
          // 提取其他Ollama参数
          const validKeys = ['temperature', 'top_p', 'top_k', 'repeat_penalty', 'seed', 'num_predict', 'stop', 'format'];
          validKeys.forEach(key => {
            if (customParams[key] !== undefined) {
              ollamaParams[key] = customParams[key];
            }
          });
        } catch (e) {
          console.error('解析自定义参数失败:', e);
        }
      }

      // 流式响应处理
      if (stream) {
        const ollamaUrl = 'http://localhost:11434/api/generate';
        
        // 构建Ollama请求体
        const requestBody = {
          model: modelPath,
          prompt: promptContent,
          stream: true,
          ...ollamaParams
        };

        let fullContent = '';

        // 创建读取流
        const response = await fetch(ollamaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: signal, // 使用信号来支持取消
        });

        if (!response.ok) {
          throw new Error(`Ollama请求失败: ${response.status}`);
        }

        // 获取响应流
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法创建响应流读取器');
        }

        // 处理流式响应
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          // 检查是否已取消
          if (signal?.aborted) {
            throw new Error('请求已取消');
          }
          
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          // Ollama返回的是每行一个JSON，需要分行处理
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                fullContent += data.response;
                callbacks.onUpdate?.(fullContent);
              }
            } catch (e) {
              console.warn('解析Ollama响应失败:', e);
            }
          }
        }

        // 调用完成回调
        callbacks.onComplete?.(fullContent);
      } else {
        // 非流式调用
        const ollamaUrl = 'http://localhost:11434/api/generate';
        
        // 构建Ollama请求体
        const requestBody = {
          model: modelPath,
          prompt: promptContent,
          stream: false,
          ...ollamaParams
        };

        const response = await fetch(ollamaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: signal, // 使用信号来支持取消
        });

        if (!response.ok) {
          throw new Error(`Ollama请求失败: ${response.status}`);
        }

        const responseData = await response.json();
        const fullContent = responseData.response || '';
        callbacks.onComplete?.(fullContent);
      }
    } catch (error: any) {
      // 检查是否是取消的错误
      if (error.name === 'AbortError' || (signal && signal.aborted)) {
        console.log('本地模型调用已取消');
        callbacks.onError?.(new Error('生成已停止'));
        return;
      }
      
      // 处理API错误
      console.error('本地模型调用失败:', error);
      callbacks.onError?.(new Error(`Ollama调用失败: ${error.message || '未知错误'}`));
    }
  }
}

export default ModelService; 