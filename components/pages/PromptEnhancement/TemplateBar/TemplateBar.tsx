"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, MoreHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Template {
  id: string;
  name: string;
  content: string;
}

interface TemplateBarProps {
  onAddTemplate: () => void;
}

const TemplateBar: React.FC<TemplateBarProps> = ({ onAddTemplate }) => {
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([
    { id: '1', name: '创意写作', content: '写一个关于...' },
    { id: '2', name: '代码优化', content: '优化以下代码...' },
    { id: '3', name: '故事创作', content: '创作一个故事...' },
    { id: '4', name: '文案修改', content: '修改以下文案...' },
    { id: '5', name: '翻译助手', content: '翻译以下内容...' },
    { id: '6', name: '数据分析', content: '分析以下数据...' },
  ]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(4);
  
  // 计算可见模板数量
  useEffect(() => {
    const calculateVisibleCount = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const buttonWidth = 100; // 估计每个模板按钮的宽度（包含间距）
      const controlsWidth = 100; // 新增和删除按钮的总宽度
      const maxVisible = Math.floor((containerWidth - controlsWidth) / buttonWidth);
      
      setVisibleCount(Math.max(1, maxVisible)); // 至少显示1个
    };

    calculateVisibleCount();
    window.addEventListener('resize', calculateVisibleCount);
    return () => window.removeEventListener('resize', calculateVisibleCount);
  }, []);

  const visibleTemplates = templates.slice(0, visibleCount);
  const hiddenTemplates = templates.slice(visibleCount);

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(template => template.id !== id));
  };

  const TemplateBox = ({ template }: { template: Template }) => (
    <div className="relative group shrink-0">
      <Button
        variant="outline"
        className="h-8 px-3 relative w-[90px] text-sm truncate"
      >
        {template.name}
        {isDeleteMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTemplate(template.id);
            }}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </Button>
    </div>
  );

  return (
    <div className="flex items-center space-x-2 mb-4 p-2 border rounded-lg" ref={containerRef}>
      <div className="flex-1 flex items-center space-x-2 overflow-x-hidden">
        {visibleTemplates.map(template => (
          <TemplateBox key={template.id} template={template} />
        ))}
        
        {hiddenTemplates.length > 0 && templates.length > visibleCount && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 shrink-0">
                <MoreHorizontal className="h-4 w-4 mr-1" />
                {hiddenTemplates.length}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[120px]">
              {hiddenTemplates.map(template => (
                <div key={template.id} className="p-2">
                  <TemplateBox template={template} />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="flex items-center space-x-2 shrink-0">
        <Button
          variant="outline"
          size="icon"
          onClick={onAddTemplate}
          className="h-8 w-8"
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsDeleteMode(!isDeleteMode)}
          className={`h-8 w-8 ${isDeleteMode ? 'bg-destructive text-destructive-foreground' : ''}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TemplateBar; 