import db, { Message, ChatSession, Model } from "./db";

/**
 * 聊天回调接口
 */
export interface ChatCallbacks {
  // 用户消息保存后回调
  onUserMessageSaved?: (message: Message) => void;
  // AI回复开始生成回调
  onStart?: () => void;
  // AI回复内容更新回调
  onUpdate?: (content: string, messageId: string, sessionId: string, metadata?: {reasoning?: string}) => void;
  // AI回复完成回调
  onComplete?: (message: Message) => void;
  // 会话更新回调
  onSessionUpdated?: () => void;
  // 错误回调
  onError?: (error: Error) => void;
}

/**
 * 聊天服务类 - 使用fetch代替OpenAI SDK
 */
class ChatServiceWithoutOpenai {
  // 固定的会话ID
  private static readonly DEFAULT_SESSION_ID = 'single_chat_session';
  // 全局单例控制器，用于取消请求
  private static abortController: AbortController | null = null;
  
  /**
   * 发送消息并获取AI响应
   * @param content 消息内容
   * @param sessionId 会话ID - 为了兼容原始接口保留，但不使用
   * @param modelId 模型ID
   * @param callbacks 回调函数
   * @param customPrompt 自定义提示词
   * @param disableHistory 是否禁用历史记录
   */
  static async sendMessage(
    content: string,
    sessionId: string | undefined,
    modelId: string,
    callbacks: ChatCallbacks = {},
    customPrompt?: string,
    disableHistory: boolean = false
  ): Promise<void> {
    try {
      // 创建用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        sessionId: this.DEFAULT_SESSION_ID,
        role: 'user',
        content,
        timestamp: new Date()
      };

      // 保存用户消息到数据库
      await db.addMessage(userMessage);
      callbacks.onUserMessageSaved?.(userMessage);

      // 获取模型
      const model = await db.getModel(modelId);
      if (!model) {
        throw new Error('找不到所选模型，请检查模型配置');
      }

      // AI消息ID
      const aiMessageId = (Date.now() + 1).toString();
      
      // 如果有正在进行的请求，先中断它
      this.abortRequest();
      
      // 获取会话消息
      let historyMessages: Message[] = [];
      
      if (disableHistory) {
        // 禁用历史记录时，只使用当前用户消息
        historyMessages = [userMessage];
      } else {
        // 否则获取完整的历史记录
        historyMessages = await db.getMessagesBySession(this.DEFAULT_SESSION_ID);
      }
      
      // 调用AI接口
      await this.callModel({
        model,
        messages: historyMessages,
        callbacks: {
          onStart: callbacks.onStart,
          onUpdate: (content, reasoning) => {
            callbacks.onUpdate?.(content, aiMessageId, this.DEFAULT_SESSION_ID, {reasoning});
          },
          onComplete: async (fullContent, metadata) => {
            // 保存AI消息
            const aiMessage: Message = {
              id: aiMessageId,
              sessionId: this.DEFAULT_SESSION_ID,
              role: 'assistant',
              content: fullContent,
              reasoningContent: metadata?.reasoning,
              timestamp: new Date()
            };
            
            await db.addMessage(aiMessage);
            callbacks.onComplete?.(aiMessage);
            
            // 调用会话更新回调
            callbacks.onSessionUpdated?.();
            
            // 清理控制器
            this.abortController = null;
          },
          onError: (error) => {
            callbacks.onError?.(error);
            this.abortController = null;
          }
        },
        customPrompt
      });
    } catch (error: any) {
      callbacks.onError?.(new Error(error.message || '发送消息失败'));
    }
  }

  /**
   * 调用AI模型 - 使用fetch直接请求API
   */
  private static async callModel(options: {
    model: Model;
    messages: Message[];
    callbacks: {
      onStart?: () => void;
      onUpdate?: (content: string, reasoning?: string) => void;
      onComplete?: (fullContent: string, metadata?: {reasoning?: string}) => void;
      onError?: (error: Error) => void;
    };
    customPrompt?: string;
  }): Promise<void> {
    const { model, messages, callbacks, customPrompt } = options;

    try {
      // 通知开始生成
      callbacks.onStart?.();

      // 创建请求的AbortController
      this.abortController = new AbortController();
      
      // 转换消息格式
      const apiMessages = messages.map(msg => ({
        role: msg.role as any,
        content: msg.content
      }));

      // 处理自定义提示词
      if (customPrompt && customPrompt.trim()) {
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
          // 添加新的系统消息
          apiMessages.unshift({
            role: 'system',
            content: customPrompt
          });
        }
      } else {
        // 移除所有system消息
        const filteredMessages = apiMessages.filter(msg => msg.role !== 'system');
        apiMessages.length = 0;
        apiMessages.push(...filteredMessages);
      }

      // 设置API参数
      const apiModelId = model.apiId || '';
      // 解析自定义参数
      let temperature = 0.7;
      let max_tokens = 2000;
      let stream = true;
      let top_p = 1;
      
      if (model.parameters) {
        try {
          const params = JSON.parse(model.parameters);
          if (params.temperature !== undefined) temperature = params.temperature;
          if (params.max_tokens !== undefined) max_tokens = params.max_tokens;
          if (params.stream !== undefined) stream = params.stream;
          if (params.top_p !== undefined) top_p = params.top_p;
        } catch (e) {
          console.error('解析自定义参数失败:', e);
        }
      }

      // 请求体
      const requestBody = {
        model: apiModelId,
        messages: apiMessages,
        temperature,
        max_tokens,
        top_p,
        stream
      };

      // 设置API URL，优先使用模型配置中的URL，否则使用默认URL
      const originalApiUrl = model.url || 'https://api.openai.com/v1/chat/completions';
      
      // 检查是否需要使用代理
      const useProxy = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
      
      // 如果在本地开发环境，使用代理API
      const apiUrl = useProxy 
        ? `/api/proxy?url=${encodeURIComponent(originalApiUrl)}`
        : originalApiUrl;
      
      console.log(`使用API URL: ${apiUrl} ${useProxy ? '(通过代理)' : ''}`);
      
      // 请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // 只有在不使用代理时才直接添加授权头
      if (!useProxy) {
        headers['Authorization'] = `Bearer ${model.apiKey || ''}`;
      } else {
        // 对于代理请求，将API密钥放在自定义头或请求体中，由服务端代理处理
        headers['X-API-Key'] = model.apiKey || '';
      }

      // 完整内容和思考内容
      let fullContent = '';
      let reasoningContent = '';

      if (stream) {
        // 流式响应处理
        try {
          console.log('开始发送流式请求...');
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal,
            // 添加credentials以便在使用代理时携带cookies
            credentials: useProxy ? 'include' : 'same-origin'
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败 (${response.status}): ${errorText}`);
          }

          if (!response.body) {
            throw new Error('响应没有返回数据流');
          }

          // 使用ReadableStream API处理流式响应
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // 解码数据块
            const chunk = decoder.decode(value, { stream: true });
            
            // 处理数据块
            const lines = chunk
              .split('\n')
              .filter(line => line.trim() !== '' && line.trim() !== 'data: [DONE]');
            
            for (const line of lines) {
              try {
                // 移除"data: "前缀并解析JSON
                const jsonData = line.replace(/^data: /, '').trim();
                if (!jsonData) continue;
                
                const data = JSON.parse(jsonData);
                
                // 提取内容和思考部分
                const content = data.choices?.[0]?.delta?.content || '';
                const reasoning = data.choices?.[0]?.delta?.reasoning_content || '';
                
                if (content) {
                  fullContent += content;
                }
                
                if (reasoning) {
                  reasoningContent += reasoning;
                }
                
                // 更新UI
                callbacks.onUpdate?.(fullContent, reasoningContent);
              } catch (e) {
                console.warn('解析流数据失败:', e, line);
              }
            }
          }

          // 完成回调
          callbacks.onComplete?.(fullContent, { reasoning: reasoningContent });
        } catch (error: any) {
          // 区分中止请求和其他错误
          if (error.name === 'AbortError') {
            console.log('用户中止了请求');
          } else {
            throw error;
          }
        }
      } else {
        // 非流式响应处理
        try {
          console.log('开始发送非流式请求...');
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: this.abortController.signal,
            // 添加credentials以便在使用代理时携带cookies
            credentials: useProxy ? 'include' : 'same-origin'
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败 (${response.status}): ${errorText}`);
          }

          const data = await response.json();
          
          // 提取内容和思考内容
          fullContent = data.choices?.[0]?.message?.content || '';
          reasoningContent = data.choices?.[0]?.message?.reasoning_content || '';
          
          // 更新UI
          callbacks.onUpdate?.(fullContent, reasoningContent);
          // 完成回调
          callbacks.onComplete?.(fullContent, { reasoning: reasoningContent });
        } catch (error: any) {
          // 区分中止请求和其他错误
          if (error.name === 'AbortError') {
            console.log('用户中止了请求');
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      // 处理API错误
      console.error('API调用失败:', error);
      const errorMsg = error.status 
        ? `API调用失败(${error.status}): ${error.message || '未知错误'}`
        : `API调用失败: ${error.message || '未知错误'}`;
      callbacks.onError?.(new Error(errorMsg));
    }
  }
  
  /**
   * 中断当前请求
   */
  static abortRequest(): void {
    if (this.abortController) {
      console.log('执行中断请求操作');
      this.abortController.abort();
      this.abortController = null;
      console.log('已中止AI生成请求');
    } else {
      console.log('无法中断请求：没有活动的控制器');
    }
  }

  /**
   * 清空所有消息历史
   */
  static async clearHistory(): Promise<void> {
    try {
      // 中断当前请求
      this.abortRequest();
      
      // 删除所有消息，使用deleteSession方法可以同时删除会话及其相关的所有消息
      await db.deleteSession(this.DEFAULT_SESSION_ID);
      
      console.log('已清空所有消息历史');
    } catch (error) {
      console.error('清空历史记录失败:', error);
      throw new Error('清空历史记录失败');
    }
  }

  /**
   * 加载会话消息 - 与原始API保持一致
   */
  static async loadSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      // 实际上忽略传入的sessionId，始终使用DEFAULT_SESSION_ID
      return await db.getMessagesBySession(this.DEFAULT_SESSION_ID);
    } catch (error) {
      console.error('加载消息失败:', error);
      throw new Error('加载消息失败');
    }
  }
  
  /**
   * 加载所有会话 - 与原始API保持一致
   */
  static async loadSessions(): Promise<ChatSession[]> {
    try {
      // 因为我们只使用单一会话，所以创建一个虚拟会话列表
      const messages = await db.getMessagesBySession(this.DEFAULT_SESSION_ID);
      if (messages.length === 0) {
        return [];
      }
      
      // 获取最新消息作为会话的最后消息
      const latestMessage = [...messages].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      
      // 创建单一会话对象
      const session: ChatSession = {
        id: this.DEFAULT_SESSION_ID,
        title: '单一对话',
        lastMessage: latestMessage?.content || '',
        timestamp: new Date(),
        messageCount: messages.length
      };
      
      return [session];
    } catch (error) {
      console.error('加载会话失败:', error);
      throw new Error('加载会话列表失败');
    }
  }

  /**
   * 创建新会话 - 与原始API保持一致
   */
  static async createNewSession(firstMessage?: string, title?: string): Promise<string | undefined> {
    try {
      // 清空历史记录
      await this.clearHistory();
      
      // 如果有首条消息，则创建它
      if (firstMessage) {
        const userMessage: Message = {
          id: Date.now().toString(),
          sessionId: this.DEFAULT_SESSION_ID,
          role: 'user',
          content: firstMessage,
          timestamp: new Date()
        };
        await db.addMessage(userMessage);
      }
      
      // 返回固定会话ID
      return this.DEFAULT_SESSION_ID;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw new Error('创建新对话失败');
    }
  }

  /**
   * 删除会话 - 与原始API保持一致
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      // 实际上忽略传入的sessionId，清空默认会话
      if (this.abortController) {
        this.abortRequest();
      }
      await db.deleteSession(this.DEFAULT_SESSION_ID);
    } catch (error) {
      console.error('删除会话失败:', error);
      throw new Error('删除会话失败');
    }
  }
}

export default ChatServiceWithoutOpenai; 