import { useState } from 'react';
import { Message } from '../service/db';
import MessageService from '../service/messageService';
import { toast } from "sonner";

/**
 * 消息管理钩子
 * 处理发送消息、停止生成等操作
 */
export const useMessages = (
  activeSessionId: string | undefined,
  setActiveSessionId: (id: string) => void, 
  selectedModel: string,
  loadSessions: () => void,
  activeTemplateId: string | null,
  customPrompt: string
) => {
  // 消息状态
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  /**
   * 加载会话消息
   * @param sessionId 会话ID
   */
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const messages = await MessageService.loadSessionMessages(sessionId);
      setMessages(messages);
    } catch (error) {
      console.error('加载消息失败:', error);
      toast.error('加载消息失败');
    }
  };
  
  /**
   * 处理发送消息
   * @param content 要发送的消息内容
   */
  const handleSendMessage = async (content: string): Promise<void> => {
    // 设置生成状态
    setIsGenerating(true);

    // 检查是否需要创建新会话（对临时会话ID的情况）
    let currentSessionId = activeSessionId;
    if (!currentSessionId || currentSessionId.startsWith('temp_')) {
      try {
        // 使用用户首次输入的内容作为会话名称
        const sessionTitle = content.length > 20
          ? `${content.substring(0, 20)}...`
          : content;
        
        currentSessionId = await MessageService.createNewSession(content, sessionTitle);
        if (!currentSessionId) {
          throw new Error('创建会话失败');
        }
        setActiveSessionId(currentSessionId);
      } catch (error) {
        console.error('创建会话失败:', error);
        toast.error('创建新对话失败');
        setIsGenerating(false);
        return;
      }
    }

    // 调用消息服务发送消息
    MessageService.sendMessage(
      content,
      currentSessionId,
      selectedModel,
      {
        // 当用户消息保存完成
        onUserMessageSaved: (userMessage) => {
          setMessages(prev => [...prev, userMessage]);
        },
        // 当AI回复内容更新（流式输出）
        onAiMessageUpdate: (partialMessage) => {
          setMessages(prev => {
            // 检查是否已存在此ID的消息
            const existingIndex = prev.findIndex(m => m.id === partialMessage.id);
            
            if (existingIndex >= 0) {
              // 更新现有消息
              const newMessages = [...prev];
              newMessages[existingIndex] = {
                ...newMessages[existingIndex],
                content: partialMessage.content
              };
              return newMessages;
            } else {
              // 添加新消息
              return [...prev, {
                id: partialMessage.id || Date.now().toString(), // 确保ID不为undefined
                sessionId: partialMessage.sessionId || currentSessionId || '',
                role: 'assistant' as const,
                content: partialMessage.content || '',
                timestamp: new Date()
              }];
            }
          });
        },
        // 当AI回复完成
        onAiMessageComplete: () => {
          setIsGenerating(false);
        },
        // 当会话更新
        onSessionUpdated: () => {
          loadSessions();
        },
        // 当发生错误
        onError: (error) => {
          console.error('消息服务错误:', error);
          toast.error(error.message || '发送消息失败');
          setIsGenerating(false);
        }
      },
      // 只有当存在激活的模板ID时才传递自定义提示词
      activeTemplateId ? customPrompt : undefined
    ).catch(error => {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败');
      setIsGenerating(false);
    });
  };

  /**
   * 停止生成回复
   */
  const handleStopGeneration = (): void => {
    if (!activeSessionId) return;
    
    // 取消当前会话的生成
    MessageService.cancelGeneration(activeSessionId);
    
    setIsGenerating(false);
    toast.info('已停止生成回复');
  };

  return {
    messages,
    setMessages,
    isGenerating,
    setIsGenerating,
    loadSessionMessages,
    handleSendMessage,
    handleStopGeneration
  };
}; 