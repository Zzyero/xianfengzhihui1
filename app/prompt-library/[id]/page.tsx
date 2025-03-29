'use client';

import { useEffect, useState } from 'react';
import { PromptDetail } from '@/components/prompt-library/prompt-detail';
import { PromptLibraryService } from '@/lib/services/prompt-library-service';
import type { PromptItem } from '@/components/prompt-library/types';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function PromptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [prompt, setPrompt] = useState<PromptItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrompt() {
      if (!id) {
        router.push('/prompt-library');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const promptData = await PromptLibraryService.getPromptById(id);
        
        if (promptData) {
          setPrompt(promptData);
        } else {
          setError('提示词不存在');
          router.push('/prompt-library');
        }
      } catch (error) {
        console.error('加载提示词失败:', error);
        setError('加载提示词失败');
        router.push('/prompt-library');
      } finally {
        setLoading(false);
      }
    }

    loadPrompt();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || '提示词不存在'}</p>
          <Button variant="outline" onClick={() => router.push('/prompt-library')}>
            返回提示词库
          </Button>
        </div>
      </div>
    );
  }

  const handleEdit = async (id: string, updatedPrompt: Partial<PromptItem>) => {
    try {
      await PromptLibraryService.updatePrompt(id, updatedPrompt);
      const updated = await PromptLibraryService.getPromptById(id);
      if (updated) {
        setPrompt(updated);
      }
    } catch (error) {
      console.error('更新提示词失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await PromptLibraryService.deletePrompt(id);
      router.push('/prompt-library');
    } catch (error) {
      console.error('删除提示词失败:', error);
    }
  };

  return (
    <PromptDetail
      prompt={prompt}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
} 