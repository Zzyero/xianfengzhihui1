import { useAppState } from './useAppState';
import { Message } from '../service/db';
import React from 'react';

/**
 * 会话管理钩子
 * 处理会话加载、创建新会话、选择会话等操作
 * 兼容旧版接口的包装器，内部使用useAppState
 */
export const useSessions = (
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  isGenerating: boolean,
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>,
  setActiveTemplateId: React.Dispatch<React.SetStateAction<string | null>>,
  setCustomPrompt: React.Dispatch<React.SetStateAction<string>>
) => {
  // 使用全局应用状态
  const { state, actions } = useAppState();

  return {
    chatSessions: state.chatSessions,
    setChatSessions: (sessions: any) => {
      console.log('使用了旧版setChatSessions接口，建议直接使用全局状态');
    },
    activeSessionId: state.activeSessionId,
    setActiveSessionId: actions.setActiveSessionId,
    loadSessions: actions.loadSessions,
    createNewSession: actions.createNewSession,
    handleNewChat: actions.handleNewChat,
    handleSelectSession: actions.handleSelectSession
  };
}; 