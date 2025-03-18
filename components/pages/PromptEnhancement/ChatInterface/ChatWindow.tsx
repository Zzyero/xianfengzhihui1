"use client";

import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import '../styles/ChatInterface.css';
// 导入数据库工具类和类型定义
import { Message, ChatSession } from '../service/db';
import { Toaster } from "sonner";
// 导入消息显示组件
import MessageDisplay from './MessageDisplay';
// 导入历史侧边栏组件
import HistorySidebar from './HistorySidebar';

interface ChatWindowProps {
  messages: Message[];
  isTyping?: boolean;
  className?: string;
  onNewChat: () => void;
  // 添加历史侧边栏相关的属性
  sidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  activeSessionId?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isTyping = false,
  className,
  onNewChat,
  // 添加历史侧边栏相关的属性
  sidebarOpen,
  setSidebarOpen,
  sessions,
  onSelectSession,
  activeSessionId
}) => {
  return (
    <div className="chat-window">
      <Toaster position="top-center" />

      <ScrollArea className={cn(
        "message-list",
        sidebarOpen && "with-sidebar",
        className
      )}>
        <div className="messages-container">
          {messages.map((message) => (
            <MessageDisplay 
              key={message.id}
              message={message} 
              showTimestamp={true} 
            />
          ))}
        </div>
      </ScrollArea>

      {/* 集成历史侧边栏 */}
      <HistorySidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        sessions={sessions}
        onSelectSession={onSelectSession}
        activeSessionId={activeSessionId}
      />
    </div>
  );
};

export default ChatWindow; 