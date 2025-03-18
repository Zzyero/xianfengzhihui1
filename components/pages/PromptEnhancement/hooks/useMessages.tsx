import { useAppState } from './useAppState';
import { Message } from '../service/db';

/**
 * 消息管理钩子
 * 处理发送消息、停止生成等操作
 * 内部使用useAppState
 */
export const useMessages = (
  activeSessionId: string | undefined,
  setActiveSessionId: (id: string) => void, 
  selectedModel: string,
  loadSessions: () => void,
  activeTemplateId: string | null,
  customPrompt: string
) => {
  // 使用全局应用状态
  const { state, actions } = useAppState();

  /**
   * 兼容旧版接口的setMessages函数
   */
  const setMessages = (messages: Message[] | ((prev: Message[]) => Message[])) => {
    console.log('使用了旧版setMessages接口，建议直接使用全局状态');
  };

  /**
   * 兼容旧版接口的setIsGenerating函数
   */
  const setIsGenerating = (value: boolean) => {
    console.log('使用了旧版setIsGenerating接口，建议直接使用全局状态');
  };

  return {
    messages: state.messages,
    setMessages,
    isGenerating: state.isGenerating,
    setIsGenerating,
    loadSessionMessages: actions.loadSessionMessages,
    handleSendMessage: actions.handleSendMessage,
    handleStopGeneration: actions.handleStopGeneration
  };
}; 