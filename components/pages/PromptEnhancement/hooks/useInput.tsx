import { useAppState } from './useAppState';

/**
 * 输入管理钩子
 * 处理输入框的大小调整等操作
 * 兼容旧版接口的包装器，内部使用useAppState
 */
export const useInput = () => {
  // 使用全局应用状态
  const { state, actions } = useAppState();

  return {
    inputHeight: state.inputHeight,
    handleInputResize: actions.handleInputResize
  };
}; 