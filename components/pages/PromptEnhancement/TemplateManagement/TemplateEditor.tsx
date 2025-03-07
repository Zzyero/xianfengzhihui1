"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
//模板编辑参数
interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  template?: {
    id?: string;
    title: string;
    description: string;
    content: string;
    category: string;
  };
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  isOpen,
  onClose,
  template
}) => {
  const isNewTemplate = !template?.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isNewTemplate ? '创建新模板' : '编辑模板'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">模板名称</Label>
            <Input
              id="title"
              placeholder="输入模板名称"
              defaultValue={template?.title}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Select defaultValue={template?.category || "general"}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">通用</SelectItem>
                <SelectItem value="writing">写作</SelectItem>
                <SelectItem value="coding">编程</SelectItem>
                <SelectItem value="business">商务</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Input
              id="description"
              placeholder="输入模板描述"
              defaultValue={template?.description}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">提示词内容</Label>
            <Textarea
              id="content"
              placeholder="输入提示词模板内容..."
              className="min-h-[200px]"
              defaultValue={template?.content}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="submit">
            {isNewTemplate ? '创建' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateEditor; 