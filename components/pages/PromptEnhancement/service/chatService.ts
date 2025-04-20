import db, { Message, ChatSession, Model } from "./db";
import OpenAI from 'openai';

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
 * 聊天服务类
 */
class ChatService {
  // 全局单例控制器，用于取消请求
  private static abortController: AbortController | null = null;
  
  /**
   * 发送消息并获取AI响应
   * @param content 消息内容
   * @param sessionId 会话ID
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
      // 处理会话ID - 如果不存在则创建新会话
      let currentSessionId = sessionId || '';
      if (!currentSessionId && !disableHistory) {
        // 在非单轮对话模式下创建并保存新会话
        const newSessionId = await this.createNewSession(content);
        if (!newSessionId) {
          throw new Error('创建会话失败');
        }
        currentSessionId = newSessionId;
      } else if (!currentSessionId && disableHistory) {
        // 单轮对话模式下，如果没有会话ID，创建一个临时ID但不创建新会话
        currentSessionId = `session_temp_${Date.now()}`;
      }

      // 创建用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        sessionId: currentSessionId,
        role: 'user',
        content,
        timestamp: new Date()
      };

      // 保存用户消息到数据库
      await db.addMessage(userMessage);
      callbacks.onUserMessageSaved?.(userMessage);
      
      // 更新会话信息
      await this.updateSessionInfo(currentSessionId, content);
      callbacks.onSessionUpdated?.();

      // 获取模型
      const model = await db.getModel(modelId);
      if (!model) {
        throw new Error('找不到所选模型，请检查模型配置');
      }

      // AI消息ID
      const aiMessageId = (Date.now() + 1).toString();
      
      // 如果有正在进行的请求，先中断它
      this.abortRequest();
      
      // 创建新的控制器
      this.abortController = new AbortController();
      console.log('已创建新的请求控制器');
      
      // 获取会话消息
      let historyMessages: Message[] = [];
      
      if (disableHistory) {
        // 禁用历史记录时，只使用当前用户消息
        historyMessages = [userMessage];
      } else {
        // 否则获取完整的历史记录
        historyMessages = await db.getMessagesBySession(currentSessionId);
      }
      
      // 调用AI接口
      await this.callModel({
        model,
        messages: historyMessages,
        callbacks: {
          onStart: callbacks.onStart,
          onUpdate: (content, reasoning, messageId, sessionId) => {
            callbacks.onUpdate?.(content, aiMessageId, currentSessionId!, {reasoning});
          },
          onComplete: async (fullContent, metadata) => {
            // 保存AI消息
            const aiMessage: Message = {
              id: aiMessageId,
              sessionId: currentSessionId!,
              role: 'assistant',
              content: fullContent,
              reasoningContent: metadata?.reasoning,
              timestamp: new Date()
            };
            
            await db.addMessage(aiMessage);
            await this.updateSessionInfo(currentSessionId!, fullContent);
            
            callbacks.onComplete?.(aiMessage);
            callbacks.onSessionUpdated?.();
            
            // 清理控制器
            this.abortController = null;
          },
          onError: (error) => {
            callbacks.onError?.(error);
            this.abortController = null;
          }
        },
        signal: this.abortController.signal,
        customPrompt,
        aiMessageId,
        currentSessionId
      });
    } catch (error: any) {
      callbacks.onError?.(new Error(error.message || '发送消息失败'));
    }
  }

  /**
   * 调用AI模型
   */
  private static async callModel(options: {
    model: Model;
    messages: Message[];
    callbacks: {
      onStart?: () => void;
      onUpdate?: (content: string, reasoning?: string, messageId?: string, sessionId?: string) => void;
      onComplete?: (fullContent: string, metadata?: {reasoning?: string}) => void;
      onError?: (error: Error) => void;
    };
    signal?: AbortSignal;
    customPrompt?: string;
    aiMessageId?: string;
    currentSessionId?: string;
  }): Promise<void> {
    const { model, messages, callbacks, signal, customPrompt, aiMessageId, currentSessionId } = options;

    try {
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
      let temperature = 0.7;
      let max_tokens = 2000;
      let stream = true;
      let top_p = 1;
      // 解析自定义参数
      if (model.parameters) {
        try {
          const params = JSON.parse(model.parameters);
          if (params.temperature !== undefined) temperature = params.temperature;
          if (params.max_tokens !== undefined) max_tokens = params.max_tokens;
          if (params.stream !== undefined) stream = Boolean(params.stream);
          if (params.top_p !== undefined) top_p = params.top_p;
          
          // 打印参数信息便于调试
          console.log('模型参数设置:', {
            modelId: apiModelId,
            temperature,
            max_tokens,
            stream,
            top_p
          });
        } catch (e) {
          console.error('解析自定义参数失败:', e);
        }
      }

      let fullContent = '';
      // 传递中断信号到API请求
      const requestOptions = signal ? { signal } : {};

      // 打印是否使用流式响应
      console.log(`使用${stream ? '流式' : '非流式'}响应模式`);
      
      // 使用流式响应
      if (stream) {
        const stream = await openai.chat.completions.create({
          model: apiModelId, 
          messages: apiMessages,
          temperature,
          max_tokens,
          top_p,
          stream: true
        }, requestOptions);

        let reasoningContent = ''; // 添加变量保存思考内容

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          // 获取思考内容（reasoning_content）
          const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content || '';
          
          // 处理思考内容
          if (reasoning) {
            // 如果有思考内容，将其累加到reasoningContent变量中
            reasoningContent += reasoning;
          }
          
          fullContent += content;
          callbacks.onUpdate?.(fullContent, reasoningContent, aiMessageId, currentSessionId);
        }

        callbacks.onComplete?.(fullContent, { reasoning: reasoningContent });
      } else {
        // 非流式响应
        console.log('开始执行非流式请求...');
        try {
          const completion = await openai.chat.completions.create({
            model: apiModelId,
            messages: apiMessages,
            temperature,
            max_tokens,
            top_p,
            stream: false
          }, requestOptions);
          
          console.log('非流式请求完成，获取内容');
          fullContent = completion.choices[0]?.message?.content || '';
          // 获取思考内容
          const reasoningContent = (completion.choices[0]?.message as any)?.reasoning_content || '';
          console.log(`获取到的内容长度: ${fullContent.length}字符`);
          
          // 先调用 onUpdate 回调更新界面显示
          callbacks.onUpdate?.(fullContent, reasoningContent, aiMessageId, currentSessionId);
          console.log('已调用onUpdate回调');
          
          // 然后调用 onComplete 回调
          callbacks.onComplete?.(fullContent, { reasoning: reasoningContent });
          console.log('已调用onComplete回调');
        } catch (error) {
          console.error('非流式请求失败:', error);
          throw error; // 将错误传递给外部错误处理
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
   * 创建新会话
   */
  static async createNewSession(firstMessage?: string, title?: string): Promise<string | undefined> {
    try {
      // 生成会话标题
      let sessionTitle = '新对话';
      if (title) {
        sessionTitle = title;
      } else if (firstMessage) {
        sessionTitle = firstMessage.length > 15 
          ? `${firstMessage.substring(0, 15)}...` 
          : firstMessage;
      }

      // 创建会话ID - 使用更加统一的格式
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const newSession: ChatSession = {
        id: sessionId,
        title: sessionTitle,
        lastMessage: firstMessage || '',
        timestamp: new Date(),
        messageCount: 0, // 初始化为0，在添加消息后会更新
        starred: false
      };

      await db.saveSession(newSession);
      
      // 如果有首条消息，添加到数据库并更新会话信息
      if (firstMessage) {
        const userMessage: Message = {
          id: Date.now().toString(),
          sessionId: sessionId,
          role: 'user',
          content: firstMessage,
          timestamp: new Date()
        };
        
        await db.addMessage(userMessage);
        
        // 更新会话信息以正确反映消息数量
        await this.updateSessionInfo(sessionId, firstMessage);
      }
      
      await db.saveLastUsedSessionId(sessionId);
      return sessionId;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw new Error('创建新对话失败');
    }
  }

  /**
   * 更新会话信息
   */
  static async updateSessionInfo(sessionId: string, lastMessage: string): Promise<void> {
    try {
      const session = await db.getSession(sessionId);
      if (!session) return;
      
      // 获取会话的所有消息数量
      const messages = await db.getMessagesBySession(sessionId);
      const messageCount = messages.length;
      
      // 如果是第一条用户消息且标题是默认的"新对话"，则更新标题
      let sessionTitle = session.title;
      if (messageCount === 1 && session.title === "新对话" && messages[0]?.role === 'user') {
        const userMessage = messages[0].content;
        sessionTitle = userMessage.length > 15 
          ? `${userMessage.substring(0, 15)}...` 
          : userMessage;
      }

      const updatedSession: ChatSession = {
        ...session,
        title: sessionTitle,
        lastMessage,
        timestamp: new Date(),
        messageCount: messageCount
      };

      await db.saveSession(updatedSession);
    } catch (error) {
      console.error('更新会话信息失败:', error);
    }
  }

  /**
   * 加载会话消息
   */
  static async loadSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      return await db.getMessagesBySession(sessionId);
    } catch (error) {
      console.error('加载消息失败:', error);
      throw new Error('加载消息失败');
    }
  }

  /**
   * 加载所有会话
   */
  static async loadSessions(): Promise<ChatSession[]> {
    try {
      return await db.getAllSessions();
    } catch (error) {
      console.error('加载会话失败:', error);
      throw new Error('加载会话列表失败');
    }
  }

  /**
   * 删除会话及其所有消息
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      await db.deleteSession(sessionId);
    } catch (error) {
      console.error('删除会话失败:', error);
      throw new Error('删除会话失败');
    }
  }
}

export default ChatService; 