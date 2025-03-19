import type { PromptItem } from '@/components/prompt-library/types';
import defaultPrompts from '@/data/prompt-library.json';

const STORAGE_KEY = 'prompt-library';
const API_ENDPOINT = '/api/prompt-library';

export class PromptLibraryService {
  // 从服务器获取提示词
  static async getPrompts(): Promise<PromptItem[]> {
    try {
      // 优先从服务器获取
      const response = await fetch(API_ENDPOINT);
      if (response.ok) {
        const data = await response.json();
        return data.prompts;
      }
    } catch (error) {
      console.error('从服务器获取提示词库失败:', error);
    }

    // 如果服务器获取失败，尝试从本地存储获取
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    }

    // 如果本地存储也没有，返回默认数据
    return defaultPrompts.prompts;
  }

  // 保存提示词到服务器和本地存储
  static async savePrompts(prompts: PromptItem[]): Promise<boolean> {
    // 保存到本地存储
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    }

    // 保存到服务器
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompts }),
      });

      if (response.ok) {
        return true;
      } else {
        const error = await response.json();
        console.error('保存提示词库到服务器失败:', error);
        return false;
      }
    } catch (error) {
      console.error('保存提示词库到服务器失败:', error);
      return false;
    }
  }

  // 导出提示词库为JSON文件
  static exportPrompts(): void {
    this.getPrompts().then(prompts => {
      const blob = new Blob([JSON.stringify(prompts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-library-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // 从JSON文件导入提示词库
  static async importPrompts(file: File): Promise<PromptItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const prompts = JSON.parse(e.target?.result as string);
          await this.savePrompts(prompts);
          resolve(prompts);
        } catch (error) {
          reject(new Error('导入文件格式错误'));
        }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  }
} 