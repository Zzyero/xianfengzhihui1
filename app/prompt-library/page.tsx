'use client';

import { useEffect, useState } from 'react';
import { PromptLibrary } from '@/components/prompt-library/prompt-library';
import { PromptLibraryService } from '@/lib/services/prompt-library-service';
import type { PromptItem } from '@/components/prompt-library/types';
import { Loader } from '@/components/loader';

export default function Page() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setLoading(true);
        const loadedPrompts = await PromptLibraryService.getPrompts();
        setPrompts(loadedPrompts);
        setError(null);
      } catch (err) {
        console.error('加载提示词库失败:', err);
        setError('加载提示词库失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };
    loadPrompts();
  }, []);

  const handleAddPrompt = async (prompt: Partial<PromptItem>) => {
    try {
      // 生成新的提示词对象
      const newPrompt: PromptItem = {
        ...prompt as PromptItem,
        id: Date.now().toString(), // 使用时间戳作为临时ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const newPrompts = [...prompts, newPrompt];
      setPrompts(newPrompts);
      
      // 保存到服务器
      const success = await PromptLibraryService.savePrompts(newPrompts);
      if (!success) {
        console.error('保存提示词到服务器失败');
      }
    } catch (err) {
      console.error('添加提示词失败:', err);
    }
  };

  const handleEditPrompt = async (id: string, prompt: Partial<PromptItem>) => {
    try {
      const newPrompts = prompts.map(p => 
        p.id === id ? { 
          ...p, 
          ...prompt, 
          updatedAt: new Date().toISOString() 
        } : p
      );
      setPrompts(newPrompts);
      
      // 保存到服务器
      const success = await PromptLibraryService.savePrompts(newPrompts);
      if (!success) {
        console.error('保存提示词到服务器失败');
      }
    } catch (err) {
      console.error('编辑提示词失败:', err);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    try {
      const newPrompts = prompts.filter(p => p.id !== id);
      setPrompts(newPrompts);
      
      // 保存到服务器
      const success = await PromptLibraryService.savePrompts(newPrompts);
      if (!success) {
        console.error('保存提示词到服务器失败');
      }
    } catch (err) {
      console.error('删除提示词失败:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-2xl font-bold">提示词库</h1>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : (
          <PromptLibrary
            prompts={prompts}
            onAdd={handleAddPrompt}
            onEdit={handleEditPrompt}
            onDelete={handleDeletePrompt}
            isSidebar={false}
          />
        )}
      </div>
    </div>
  );
} 