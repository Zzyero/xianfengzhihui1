import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Edit, Trash, X, Image, ArrowLeft } from "lucide-react";
import type { PromptItem } from './types';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';

interface PromptDetailProps {
  prompt: PromptItem;
  onEdit?: (id: string, prompt: Partial<PromptItem>) => void;
  onDelete?: (id: string) => void;
}

export function PromptDetail({ prompt, onEdit, onDelete }: PromptDetailProps) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 兼容处理，保证tags为数组
  const safeTags = Array.isArray(prompt.tags) ? prompt.tags : [];

  // 合并顶层width/height到parameters
  const paramEntries = {
    ...prompt.parameters,
    ...(prompt.width ? { width: prompt.width } : {}),
    ...(prompt.height ? { height: prompt.height } : {}),
  };

  // 处理返回按钮点击
  const handleBack = () => {
    router.push('/?from=prompt');
  };

  // 处理图片双击事件
  const handleImageDoubleClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // 关闭图片预览
  const closeImagePreview = () => {
    setSelectedImage(null);
  };

  // 处理删除操作
  const handleDeleteClick = async () => {
    const confirmed = window.confirm('确定要删除这个提示词吗？');
    if (confirmed && onDelete) {
        try {
            await onDelete(prompt.id);
            router.push('/?from=prompt');
        } catch (error) {
            console.error('删除提示词失败:', error);
        }
    }
  };

  // 处理编辑按钮点击
  const handleEditClick = () => {
    router.push(`/?from=prompt&edit=${prompt.id}`);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          className="mr-2"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回主页
        </Button>
        <h1 className="text-2xl font-bold flex-1">提示词详情</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleEditClick}
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteClick}
          >
            <Trash className="w-4 h-4 mr-2" />
            删除
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div 
          className="relative mb-6 overflow-hidden bg-white dark:bg-background rounded-lg p-2 cursor-pointer"
          onClick={() => handleImageDoubleClick(prompt.imageUrl)}
        >
          <img
            src={prompt.imageUrl}
            alt={prompt.prompt}
            className="w-full h-auto object-contain max-h-[600px]"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white text-sm opacity-0 hover:opacity-100 transition-opacity">
            双击查看大图
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">标签</h2>
            <div className="flex flex-wrap gap-2">
              {safeTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">中文提示词</h2>
            <p className="text-gray-700 dark:text-muted-foreground whitespace-pre-wrap">{prompt.prompt}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">英文提示词</h2>
            <p className="text-gray-700 dark:text-muted-foreground whitespace-pre-wrap">{prompt.promptEn}</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">参数设置</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(paramEntries).map(([key, value]) => (
                <div key={key} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-600 font-medium">{key}:</span>
                  <span className="text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={closeImagePreview}>
        <DialogContent className="max-w-5xl p-0">
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={closeImagePreview}
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="预览图片"
                className="w-full h-auto object-contain max-h-[90vh]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 