"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Plus, Star, Trash2 } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  isFavorite: boolean;
}

const TemplateList = () => {
  // 示例模板数据
  const templates: Template[] = [
    {
      id: '1',
      title: '创意写作助手',
      description: '帮助生成创意文章和故事',
      content: '请帮我写一个关于[主题]的故事，风格要[风格]，字数大约[数字]字。',
      isFavorite: true
    },
    {
      id: '2',
      title: '代码优化助手',
      description: '优化代码结构和性能',
      content: '请帮我优化以下代码，重点关注[优化重点]：\n```\n[代码]\n```',
      isFavorite: false
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">提示词模板</h3>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          新建模板
        </Button>
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id} className="cursor-pointer hover:bg-accent/50">
              <CardHeader className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{template.title}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className={template.isFavorite ? "text-yellow-500" : ""}>
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {template.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TemplateList; 