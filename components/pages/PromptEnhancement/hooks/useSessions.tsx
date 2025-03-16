import { useState } from 'react';
import { ChatSession } from '../service/db';
import MessageService from '../service/messageService';
import { toast } from "sonner";

/**
 * 会话管理钩子
 * 处理会话加载、创建新会话、选择会话等操作
 */
export const useSessions = (
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  isGenerating: boolean,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setActiveTemplateId: React.Dispatch<React.SetStateAction<string | null>>,
  setCustomPrompt: React.Dispatch<React.SetStateAction<string>>
) => {
  // 会话状态
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();

  /**
   * 加载聊天会话列表
   */
  const loadSessions = async () => {
    try {
      const sessions = await MessageService.loadSessions();
      setChatSessions(sessions);
      return sessions;
    } catch (error) {
      console.error('加载会话失败:', error);
      toast.error('加载会话列表失败');
      return [];
    }
  };

  /**
   * 创建新会话
   * @param title 会话标题，可选
   * @param firstMessage 首条消息内容，可选
   */
  const createNewSession = async (title?: string, firstMessage?: string): Promise<string | undefined> => {
    try {
      // 创建临时会话ID，不立即保存到数据库
      // 只有当用户发送第一条消息时才真正创建会话
      const tempSessionId = `temp_${Date.now().toString()}`;
      setActiveSessionId(tempSessionId);
      setMessages([]);
      return tempSessionId;
    } catch (error) {
      console.error('创建会话失败:', error);
      toast.error('创建新对话失败');
      return undefined;
    }
  };

  /**
   * 开始新的对话
   */
  const handleNewChat = async (): Promise<void> => {
    // 如果正在生成，先取消当前的生成
    if (isGenerating && activeSessionId) {
      MessageService.cancelGeneration(activeSessionId);
      setIsGenerating(false);
    }
    
    // 创建新的临时会话
    try {
      const tempSessionId = `temp_${Date.now().toString()}`;
      setActiveSessionId(tempSessionId);
      setMessages([]);
      
      // 重置模板相关状态
      setActiveTemplateId(null);
      setCustomPrompt('');
      
      toast.info('请输入内容以开始新对话');
    } catch (error) {
      console.error('创建新对话失败:', error);
      toast.error('创建新对话失败');
    }
  };

  /**
   * 处理会话选择
   * @param sessionId 会话ID
   */
  const handleSelectSession = async (sessionId: string): Promise<void> => {
    // 如果正在生成，先取消当前的生成
    if (isGenerating && activeSessionId) {
      MessageService.cancelGeneration(activeSessionId);
      setIsGenerating(false);
    }
    
    // 设置新的活动会话ID
    setActiveSessionId(sessionId);
    
    // 重置模板状态
    setActiveTemplateId(null);
    setCustomPrompt('');
  };

  return {
    chatSessions,
    setChatSessions,
    activeSessionId,
    setActiveSessionId,
    loadSessions,
    createNewSession,
    handleNewChat,
    handleSelectSession
  };
}; 