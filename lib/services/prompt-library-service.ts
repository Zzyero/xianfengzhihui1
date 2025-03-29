import type { PromptItem } from '@/components/prompt-library/types';
import defaultPrompts from '@/data/prompt-library.json';

const STORAGE_KEY = 'prompts';
const API_ENDPOINT = '/api/prompt-library';

export class PromptLibraryService {
  // 从本地存储或默认数据获取提示词
  static async getPrompts(): Promise<PromptItem[]> {
    if (typeof window === 'undefined') return defaultPrompts.prompts;
    
    try {
      // 尝试从本地存储获取数据
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        // 如果数据是数组，直接返回
        if (Array.isArray(parsedData)) {
          return parsedData;
        }
        // 如果数据有 prompts 属性且为数组，返回该数组
        if (parsedData && Array.isArray(parsedData.prompts)) {
          return parsedData.prompts;
        }
      }
      
      // 如果本地存储没有数据或数据格式不正确，使用默认数据
      return defaultPrompts.prompts;
    } catch (error) {
      console.error('获取提示词列表失败:', error);
      // 发生错误时返回默认数据
      return defaultPrompts.prompts;
    }
  }

  // 保存提示词到本地存储
  static async savePrompts(prompts: PromptItem[]): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      // 直接保存数组格式
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    } catch (error) {
      console.error('保存提示词失败:', error);
    }
  }

  // 导出提示词库为JSON文件
  static async exportPrompts(): Promise<string> {
    const prompts = await this.getPrompts();
    // 导出时使用与原始格式相同的结构
    return JSON.stringify({ prompts }, null, 2);
  }

  // 导入提示词，确保处理不同的数据格式
  static async importPrompts(file: File): Promise<PromptItem[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          let importedPrompts: PromptItem[];

          // 处理不同的数据格式
          if (Array.isArray(parsed)) {
            importedPrompts = parsed;
          } else if (parsed && Array.isArray(parsed.prompts)) {
            importedPrompts = parsed.prompts;
          } else {
            throw new Error('导入的数据格式错误');
          }

          const currentPrompts = await this.getPrompts();
          await this.savePrompts([...currentPrompts, ...importedPrompts]);
          resolve(importedPrompts);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  }

  static async getPromptById(id: string): Promise<PromptItem | null> {
    try {
      const prompts = await this.getPrompts();
      return prompts.find(prompt => prompt.id === id) || null;
    } catch (error) {
      console.error('获取提示词详情失败:', error);
      return null;
    }
  }

  static async addPrompt(prompt: Partial<PromptItem>): Promise<void> {
    try {
      const prompts = await this.getPrompts();
      const newPrompt = {
        ...prompt,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      } as PromptItem;
      
      await this.savePrompts([...prompts, newPrompt]);
    } catch (error) {
      console.error('添加提示词失败:', error);
    }
  }

  static async updatePrompt(id: string, updatedPrompt: Partial<PromptItem>): Promise<void> {
    try {
      const prompts = await this.getPrompts();
      const index = prompts.findIndex(p => p.id === id);
      
      if (index !== -1) {
        prompts[index] = {
          ...prompts[index],
          ...updatedPrompt,
          updatedAt: new Date().toISOString(),
        };
        await this.savePrompts(prompts);
      }
    } catch (error) {
      console.error('更新提示词失败:', error);
    }
  }

  static async deletePrompt(id: string): Promise<void> {
    try {
      const prompts = await this.getPrompts();
      const filteredPrompts = prompts.filter(p => p.id !== id);
      await this.savePrompts(filteredPrompts);
    } catch (error) {
      console.error('删除提示词失败:', error);
    }
  }
} 