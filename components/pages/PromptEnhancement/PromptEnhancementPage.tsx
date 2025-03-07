"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ChatWindow from './ChatInterface/ChatWindow';
import MessageInput from './ChatInterface/MessageInput';
import TemplateBar from './TemplateBar/TemplateBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * 提示词增强页面组件
 * 包含聊天界面、模板管理、历史记录等功能
 */
const PromptEnhancementPage = () => {
  // ===== 状态管理 =====
  const [messages, setMessages] = useState<any[]>([]);              // 聊天消息列表
  const [isGenerating, setIsGenerating] = useState(false);         // 是否正在生成回复
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();  // 当前会话ID
  const [isAddTemplateDialogOpen, setIsAddTemplateDialogOpen] = useState(false); // 添加模板对话框状态
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' });     // 新模板数据
  const [inputHeight, setInputHeight] = useState(56); // 输入框默认高度
  const [selectedModel, setSelectedModel] = useState('gpt-4');

  // ===== 示例数据 =====
  // 历史会话数据
  const chatSessions = [
    {
      id: '1',
      title: '创意写作讨论',
      lastMessage: '这是一个很好的故事开头...',
      timestamp: new Date(),
      messageCount: 10
    },
    {
      id: '2',
      title: '代码优化建议',
      lastMessage: '建议使用更高效的算法...',
      timestamp: new Date(),
      messageCount: 15
    }
  ];

  // ===== 事件处理函数 =====
  /**
   * 处理消息发送
   * @param message 消息内容
   */
  const handleSendMessage = (message: string) => {
    const newMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    setIsGenerating(true);

    // 模拟AI响应
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: `使用 ${selectedModel} 的模拟响应...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsGenerating(false);
    }, 1000);
  };

  /**
   * 处理停止生成
   */
  const handleStopGeneration = () => {
    setIsGenerating(false);
    // TODO: 实现停止生成逻辑
  };

  /**
   * 处理添加模板
   */
  const handleAddTemplate = () => {
    setIsAddTemplateDialogOpen(true);
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveSessionId(undefined);
  };

  const handleInputResize = (height: number) => {
    setInputHeight(height);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden relative">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">

            {/* 聊天窗口 */}
            <div className="flex-1 overflow-hidden">
              <ChatWindow 
                messages={messages}
                isTyping={isGenerating}
                sessions={chatSessions}
                onSelectSession={setActiveSessionId}
                activeSessionId={activeSessionId}
                onNewChat={handleNewChat}
                className="h-[calc(100vh-16rem)]"
              />
            </div>

            {/* 底部输入区域 */}
            <div 
              className={cn(
                "w-full transition-all duration-200 ease-in-out",
                "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
              )}
              style={{
                transform: `translateY(-${Math.max(0, inputHeight - 56)}px)`
              }}
            >

              {/* 输入框 */}
              <div className="px-4 pb-4">
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <MessageInput
                      onSend={handleSendMessage}
                      onStop={handleStopGeneration}
                      isGenerating={isGenerating}
                      onResize={handleInputResize}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* 模板栏 */}
              <div className="px-4 py-2 border-t">
                <TemplateBar onAddTemplate={() => setIsAddTemplateDialogOpen(true)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default PromptEnhancementPage; 