import { useAppState } from './useAppState';
import React from 'react';

/**
 * 应用初始化钩子
 * 处理应用启动时的数据加载和初始化
 * 内部使用useAppState
 */
export const useApplicationInit = (
  loadSessions: () => Promise<any[]>,
  loadTemplates: () => Promise<void>,
  createNewSession: (title?: string) => Promise<string | undefined>,
  setActiveSessionId: (id: string | undefined) => void,
  loadSessionMessages: (sessionId: string) => Promise<void>,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>
) => {
  // 使用全局应用状态
  const { state } = useAppState();

  return { 
    isLoading: state.isLoading 
  };
}; 