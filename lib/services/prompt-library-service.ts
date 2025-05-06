import type { PromptItem } from '@/components/prompt-library/types';
import defaultPrompts from '@/data/prompt-library.json';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const STORAGE_KEY = 'prompts';
const API_ENDPOINT = '/api/prompt-library';

export class PromptLibraryService {
  // 从本地存储或默认数据获取提示词
  static async getPrompts(): Promise<PromptItem[]> {
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
      const defaultData = defaultPrompts.prompts;
      // 将默认数据保存到本地存储
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      return defaultData;
    } catch (error) {
      console.error('获取提示词列表失败:', error);
      // 发生错误时返回默认数据
      return defaultPrompts.prompts;
    }
  }

  // 清理未使用的图片
  static async cleanupUnusedImages(): Promise<void> {
    try {
      // 获取所有提示词
      const prompts = await this.getPrompts();
      
      // 获取所有提示词使用的图片文件名
      const usedImages = new Set(
        prompts
          .map(p => p.imageUrl?.split('/').pop())
          .filter(Boolean)
      );

      // 删除未使用的图片
      try {
        const response = await fetch('/api/upload/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ usedImages: Array.from(usedImages) }),
        });

        if (!response.ok) {
          console.error('清理未使用图片失败:', await response.text());
        }
      } catch (error) {
        console.error('清理图片请求失败:', error);
      }
    } catch (error) {
      console.error('清理未使用图片失败:', error);
    }
  }

  // 修改 savePrompts 方法，在保存后自动清理未使用的图片
  static async savePrompts(prompts: PromptItem[]): Promise<void> {
    try {
      // 保存提示词数据到本地存储
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
      
      // 同时保存到服务器
      try {
        const response = await fetch('/api/prompt-library', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompts }),
        });

        if (!response.ok) {
          console.error('保存提示词到服务器失败:', await response.text());
        }
      } catch (error) {
        console.error('保存提示词到服务器失败:', error);
      }

      // 清理未使用的图片
      await this.cleanupUnusedImages();
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
        // 保留原有的图片URL，除非新数据中有新的图片URL
        const imageUrl = updatedPrompt.imageUrl || prompts[index].imageUrl;
        
        prompts[index] = {
          ...prompts[index],
          ...updatedPrompt,
          imageUrl,
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
      // 1. 获取当前提示词数据
      const prompts = await this.getPrompts();
      const promptToDelete = prompts.find(p => p.id === id);

      if (promptToDelete && promptToDelete.imageUrl) {
        // 2. 删除图片文件
        try {
          const response = await fetch('/api/upload', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: promptToDelete.imageUrl.split('/').pop() }),
          });

          if (!response.ok) {
            console.error('删除图片失败:', await response.text());
          }
        } catch (error) {
          console.error('删除图片请求失败:', error);
        }
      }

      // 3. 更新提示词列表
      const updatedPrompts = prompts.filter(p => p.id !== id);
      await this.savePrompts(updatedPrompts);
    } catch (error) {
      console.error('删除提示词失败:', error);
      throw error;
    }
  }
} 