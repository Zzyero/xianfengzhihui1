import { useState } from 'react';

/**
 * 输入管理钩子
 * 处理输入框的大小调整等操作
 */
export const useInput = () => {
  // 输入状态
  const [inputHeight, setInputHeight] = useState<number>(56);

  /**
   * 处理输入框大小调整
   * @param height 新的高度值
   */
  const handleInputResize = (height: number): void => {
    setInputHeight(height);
  };

  return {
    inputHeight,
    handleInputResize
  };
}; 