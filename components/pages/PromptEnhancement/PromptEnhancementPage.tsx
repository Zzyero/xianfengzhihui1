"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ChatWindow from './ChatInterface/ChatWindow';
import MessageInput from './ChatInterface/MessageInput';
import TemplateBar from './TemplateManagement/TemplateBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChangeModel from "./ModelManagement/ChangeModel";
import './styles/PromptEnhancement.css';

// 定义类型接口
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface Template {
  name: string;
  content: string;
}

/**
 * 提示词增强页面组件
 * 该组件整合了聊天界面、模板管理、模型选择等功能
 * 用于提供一个完整的AI对话和提示词管理体验
 */
const PromptEnhancementPage: React.FC = () => {
  // ===== 状态管理 =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [isAddTemplateDialogOpen, setIsAddTemplateDialogOpen] = useState<boolean>(false);
  const [newTemplate, setNewTemplate] = useState<Template>({ name: '', content: '' });
  const [inputHeight, setInputHeight] = useState<number>(56);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4');

  // ===== 示例数据 =====
  const chatSessions: ChatSession[] = [
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
   * 处理发送消息
   * @param message 要发送的消息内容
   */
  const handleSendMessage = (message: string): void => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    setIsGenerating(true);

    // 模拟AI响应
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `使用 ${selectedModel} 的模拟响应...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsGenerating(false);
    }, 1000);
  };

  /**
   * 停止生成回复
   */
  const handleStopGeneration = (): void => {
    setIsGenerating(false);
  };

  /**
   * 处理添加模板
   */
  const handleAddTemplate = (): void => {
    setIsAddTemplateDialogOpen(true);
  };

  /**
   * 开始新的对话
   */
  const handleNewChat = (): void => {
    setMessages([]);
    setActiveSessionId(undefined);
  };

  /**
   * 处理输入框大小调整
   * @param height 新的高度值
   */
  const handleInputResize = (height: number): void => {
    setInputHeight(height);
  };

  return (
    <div className="prompt-enhancement-container">
      <div className="main-content">
        <Card className="chat-card">
          <CardContent className="chat-card-content">
            <ChangeModel 
              selectedModel={selectedModel} 
              setSelectedModel={setSelectedModel} 
            />
            <div className="chat-window-container">
              <ChatWindow 
                messages={messages}
                isTyping={isGenerating}
                sessions={chatSessions}
                onSelectSession={setActiveSessionId}
                activeSessionId={activeSessionId}
                onNewChat={handleNewChat}
                className="chat-window"
              />
            </div>

            <div className="input-container">
              <Card>
                <MessageInput
                  onSend={handleSendMessage}
                  onStop={handleStopGeneration}
                  isGenerating={isGenerating}
                  onResize={handleInputResize}
                />
              </Card>
            </div>

            <div className="template-bar-container">
              <TemplateBar onAddTemplate={handleAddTemplate} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromptEnhancementPage; 