import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { PartialPromptItem, PromptTag } from './types';
import { ImageUpload } from './image-upload';

interface PromptFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (prompt: PartialPromptItem) => void;
  initialData?: PartialPromptItem | null;
  title: string;
}

export function PromptForm({
  open,
  onClose,
  onSubmit,
  initialData,
  title
}: PromptFormProps) {
  const [formData, setFormData] = useState<PartialPromptItem>(() => ({
    prompt: '',
    promptEn: '',
    parameters: {
      steps: '',
      sampler: '',
      seed: '',
      scheduler: '',
      denoise: '',
      cfg: '',
      negative: '',
    },
    tags: [],
    imageUrl: '',
  }));

  const [newTag, setNewTag] = useState('');
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamValue, setNewParamValue] = useState('');

  useEffect(() => {
    if (open && initialData) {
      setFormData(initialData);
    }
    setNewTag('');
    setNewParamKey('');
    setNewParamValue('');
  }, [open, initialData]);

  const handleAddTag = () => {
    if (newTag.trim()) {
      const tag: PromptTag = {
        id: Date.now().toString(),
        name: newTag.trim(),
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      };
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
      setNewTag('');
    }
  };

  const handleAddParameter = () => {
    if (newParamKey.trim() && newParamValue.trim()) {
      setFormData(prev => ({
        ...prev,
        parameters: {
          ...(prev.parameters || {}),
          [newParamKey.trim()]: newParamValue.trim(),
        },
      }));
      setNewParamKey('');
      setNewParamValue('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 保证width/height在顶层
    const { width, height, ...restParams } = formData.parameters || {};
    onSubmit({
      ...formData,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      parameters: restParams,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>图片</Label>
            <ImageUpload
              value={formData.imageUrl}
              onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
            />
          </div>

          <div className="grid gap-2">
            <Label>标签</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="输入新标签"
              />
              <Button type="button" onClick={handleAddTag}>添加</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags?.map(tag => (
                <div
                  key={tag.id}
                  className="px-2 py-1 rounded-md text-sm"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <button
                    className="ml-2 text-xs"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      tags: prev.tags?.filter(t => t.id !== tag.id)
                    }))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>参数</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'steps', name: '步数', defaultValue: '20' },
                { key: 'sampler', name: '采样器', defaultValue: 'euler' },
                { key: 'scheduler', name: '调度器', defaultValue: 'normal' },
                { key: 'loraName', name: 'Lora名称', defaultValue: '' },
                { key: 'width', name: '宽度', defaultValue: '' },
                { key: 'height', name: '高度', defaultValue: '' }
              ].map(param => (
                <div key={param.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.parameters?.[param.key] !== undefined}
                    onChange={(e) => {
                      const newParams = { ...formData.parameters };
                      if (e.target.checked) {
                        newParams[param.key] = param.defaultValue;
                      } else {
                        delete newParams[param.key];
                      }
                      setFormData(prev => ({ ...prev, parameters: newParams }));
                    }}
                  />
                  <Label>{param.name}</Label>
                  {formData.parameters?.[param.key] !== undefined && (
                    <Input
                      value={formData.parameters[param.key]}
                      onChange={(e) => {
                        const newParams = { ...formData.parameters };
                        newParams[param.key] = e.target.value;
                        setFormData(prev => ({ ...prev, parameters: newParams }));
                      }}
                      className="flex-1"
                      type={param.key === 'steps' || param.key === 'width' || param.key === 'height' ? 'number' : 'text'}
                      min={param.key === 'steps' || param.key === 'width' || param.key === 'height' ? '1' : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>提示词</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-sm text-gray-500">中文</Label>
            <Textarea
              value={formData.prompt || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="输入中文提示词"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-500">英文</Label>
                <Textarea
                  value={formData.promptEn || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, promptEn: e.target.value }))}
                  placeholder="输入英文提示词"
                  rows={3}
            />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-white border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={handleSubmit}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 