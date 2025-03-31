import db, { Message, ChatSession } from "./db";
import ModelService, { ModelResponseCallbacks } from "./modelService";

/**
 * 消息服务结果回调
 */
export interface MessageServiceCallbacks {
  onUserMessageSaved?: (message: Message) => void;
  onAiMessageUpdate?: (partialMessage: Partial<Message> & { content: string }) => void;
  onAiMessageComplete?: (message: Message) => void;
  onSessionUpdated?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 消息服务类
 */
class MessageService {
  // 当前活动的会话请求ID
  private static activeRequests: Map<string, string> = new Map(); // sessionId -> requestId

  /**
   * 取消指定会话的生成请求
   * @param sessionId 会话ID
   */
  static cancelGeneration(sessionId: string): void {
    const requestId = this.activeRequests.get(sessionId);
    if (requestId) {
      ModelService.abortRequest(requestId);
      this.activeRequests.delete(sessionId);
    }
  }

  /**
   * 取消所有生成请求
   */
  static cancelAllGenerations(): void {
    ModelService.abortAllRequests();
    this.activeRequests.clear();
  }

  /**
   * 删除会话及其所有消息
   * @param sessionId 会话ID
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      // 先取消任何正在进行的请求
      this.cancelGeneration(sessionId);
      
      // 使用数据库的deleteSession方法删除会话及其消息
      await db.deleteSession(sessionId);
    } catch (error) {
      console.error('删除会话失败:', error);
      throw new Error('删除会话失败');
    }
  }

  /**
   * 发送用户消息并获取AI响应
   * @param content 消息内容
   * @param sessionId 会话ID
   * @param modelId 模型ID
   * @param callbacks 回调函数
   * @param customPrompt 自定义提示词，用于定制模型行为
   */
  static async sendMessage(
    content: string,
    sessionId: string | undefined,
    modelId: string,
    callbacks: MessageServiceCallbacks,
    customPrompt?: string
  ): Promise<void> {
    try {
      // 如果没有会话ID或是临时会话ID，创建新会话
      let currentSessionId = sessionId;
      if (!currentSessionId || currentSessionId.startsWith('temp_')) {
        // 使用当前内容作为会话标题
        currentSessionId = await this.createNewSession(content);
        if (!currentSessionId) {
          throw new Error('创建会话失败');
        }
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
      
      // 用户消息保存回调
      callbacks.onUserMessageSaved?.(userMessage);
      
      // 更新会话信息
      await this.updateSessionInfo(currentSessionId, content);
      callbacks.onSessionUpdated?.();

      // 获取当前选中的模型信息
      const model = await db.getModel(modelId);
      
      if (!model) {
        throw new Error('找不到所选模型，请检查模型配置');
      }

      // AI响应ID
      const aiMessageId = (Date.now() + 1).toString();
      
      // 创建请求ID（用于取消）
      const requestId = `req_${currentSessionId}_${Date.now()}`;
      
      // 记录当前会话的请求ID
      this.activeRequests.set(currentSessionId, requestId);
      
      // 创建取消控制器
      const controller = ModelService.createController(requestId);
      
      // 准备调用模型的回调函数
      const modelCallbacks: ModelResponseCallbacks = {
        onStart: () => {
          // AI开始生成回调
        },
        onUpdate: (content) => {
          // AI内容更新回调
          callbacks.onAiMessageUpdate?.({
            id: aiMessageId,
            sessionId: currentSessionId,
            role: 'assistant',
            content,
          });
        },
        onComplete: async (fullContent) => {
          // AI生成完成，保存完整消息
          const aiMessage: Message = {
            id: aiMessageId,
            sessionId: currentSessionId!,
            role: 'assistant',
            content: fullContent,
            timestamp: new Date()
          };

          // 保存AI回复到数据库
          await db.addMessage(aiMessage);
          
          // 更新会话信息
          await this.updateSessionInfo(currentSessionId!, aiMessage.content);
          
          // 完成回调
          callbacks.onAiMessageComplete?.(aiMessage);
          callbacks.onSessionUpdated?.();
          
          // 清理请求ID
          this.activeRequests.delete(currentSessionId!);
        },
        onError: (error) => {
          // 处理错误
          callbacks.onError?.(error);
          
          // 清理请求ID
          this.activeRequests.delete(currentSessionId!);
        }
      };

      // 获取历史消息以提供上下文
      const historyMessages = await db.getMessagesBySession(currentSessionId);
      
      // 调用API模型
      await ModelService.callApiModel({
        model,
        messages: historyMessages,
        callbacks: modelCallbacks,
        signal: controller.signal,
        customPrompt // 传递自定义提示词
      });
    } catch (error: any) {
      console.error('发送消息失败:', error);
      callbacks.onError?.(new Error(error.message || '发送消息失败'));
    }
  }

  /**
   * 加载会话消息
   * @param sessionId 会话ID
   * @returns 消息数组
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
   * @returns 会话数组
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
   * 创建新会话
   * @param firstMessage 首条消息内容（用于设置默认会话名称），可选
   * @param title 会话标题，可选
   * @returns 新会话ID
   */
  static async createNewSession(firstMessage?: string, title?: string): Promise<string | undefined> {
    try {
      // 生成会话标题
      let sessionTitle: string = '新对话'; // 默认值
      
      if (title) {
        // 如果提供了标题，直接使用
        sessionTitle = title;
      } else if (firstMessage) {
        // 如果没有提供标题但有首条消息，使用首条消息的前15个字符作为标题
        sessionTitle = firstMessage.length > 15 
          ? `${firstMessage.substring(0, 15)}...` 
          : firstMessage;
      }

      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: sessionTitle,
        lastMessage: firstMessage || '',
        timestamp: new Date(),
        messageCount: firstMessage ? 1 : 0
      };

      await db.saveSession(newSession);
      // 记录目前的会话
      db.saveLastUsedSessionId(newSession.id)
      return newSession.id;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw new Error('创建新对话失败');
    }
  }

  /**
   * 更新会话信息
   * @param sessionId 会话ID
   * @param lastMessage 最新消息内容
   */
  static async updateSessionInfo(sessionId: string, lastMessage: string): Promise<void> {
    try {
      // 获取现有会话
      const session = await db.getSession(sessionId);
      if (!session) return;

      // 更新会话信息
      const updatedSession: ChatSession = {
        ...session,
        lastMessage,
        timestamp: new Date(),
        messageCount: session.messageCount + 1
      };

      await db.saveSession(updatedSession);
    } catch (error) {
      console.error('更新会话信息失败:', error);
    }
  }
}

export default MessageService; 