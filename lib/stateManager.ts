/**
 * 状态管理工具 - 用于保存和恢复页面状态
 * 使用localStorage作为存储介质
 */

// 页面类型
export enum PageType {
  Playground = 'playground',
  SmartPS = 'smartPS',
}

// 状态存储键前缀
const STATE_KEY_PREFIX = 'pioneer_state_';

/**
 * 保存页面状态
 * @param pageType 页面类型
 * @param state 要保存的状态对象
 */
export const savePageState = (pageType: PageType, state: any): void => {
  try {
    if (!state) return;
    
    const key = `${STATE_KEY_PREFIX}${pageType}`;
    const stateString = JSON.stringify(state);
    localStorage.setItem(key, stateString);
    console.log(`已保存${pageType}页面状态`, state);
  } catch (error) {
    console.error(`保存${pageType}页面状态失败:`, error);
  }
};

/**
 * 加载页面状态
 * @param pageType 页面类型
 * @returns 保存的状态对象，如果没有则返回null
 */
export const loadPageState = <T = any>(pageType: PageType): T | null => {
  try {
    const key = `${STATE_KEY_PREFIX}${pageType}`;
    const stateString = localStorage.getItem(key);
    
    if (!stateString) return null;
    
    const state = JSON.parse(stateString) as T;
    console.log(`已加载${pageType}页面状态`, state);
    return state;
  } catch (error) {
    console.error(`加载${pageType}页面状态失败:`, error);
    return null;
  }
};

/**
 * 清除页面状态
 * @param pageType 页面类型
 */
export const clearPageState = (pageType: PageType): void => {
  try {
    const key = `${STATE_KEY_PREFIX}${pageType}`;
    localStorage.removeItem(key);
    console.log(`已清除${pageType}页面状态`);
  } catch (error) {
    console.error(`清除${pageType}页面状态失败:`, error);
  }
};

/**
 * 清除所有保存的页面状态
 */
export const clearAllPageStates = (): void => {
  try {
    Object.values(PageType).forEach(pageType => {
      const key = `${STATE_KEY_PREFIX}${pageType}`;
      localStorage.removeItem(key);
    });
    console.log('已清除所有页面状态');
  } catch (error) {
    console.error('清除所有页面状态失败:', error);
  }
};

/**
 * 创建一个状态钩子助手
 * 可用于React组件中方便地保存和恢复状态
 * @param pageType 页面类型
 * @param initialState 初始状态
 * @param onChange 状态变化时的回调函数
 */
export const createStateHelper = <T>(
  pageType: PageType, 
  initialState: T,
  onChange?: (state: T) => void
) => {
  return {
    // 保存当前状态
    saveState: (state: T) => {
      savePageState(pageType, state);
      if (onChange) onChange(state);
    },
    
    // 加载保存的状态
    loadState: (): T => {
      const savedState = loadPageState<T>(pageType);
      return savedState || initialState;
    },
    
    // 清除保存的状态
    clearState: () => {
      clearPageState(pageType);
    }
  };
};

export default {
  savePageState,
  loadPageState,
  clearPageState,
  clearAllPageStates,
  createStateHelper,
  PageType
};