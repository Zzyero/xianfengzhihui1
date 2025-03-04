"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, ChevronRight, ArrowLeft, Search, MessageSquare, Trash2, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

// 消息接口定义
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// 历史会话接口
interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

// 组件属性接口
interface ChatWindowProps {
  messages: Message[];        // 消息列表
  isTyping?: boolean;        // 是否正在输入
  className?: string;        // 自定义样式类
  sessions: ChatSession[];   // 历史会话列表
  onSelectSession: (id: string) => void;  // 选择会话的回调
  activeSessionId?: string;  // 当前激活的会话ID
  onNewChat: () => void;  // 新增：创建新对话的回调
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  isTyping = false,
  className,
  sessions,
  onSelectSession,
  activeSessionId,
  onNewChat
}) => {
  // 侧边栏状态
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [width, setWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 处理鼠标拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
  };

  // 处理鼠标拖拽过程
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.min(Math.max(280, dragStartWidth.current + delta), 800);
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 处理鼠标悬停
  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  // 处理侧边栏切换
  const toggleSidebar = () => {
    setIsPinned(!isPinned);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* 顶部按钮区域 */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 bg-background/50 backdrop-blur-sm hover:bg-background/80"
          onClick={onNewChat}
        >
          <PlusCircle className="h-6 w-6" />
        </Button>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-10 h-10 bg-background/50 backdrop-blur-sm hover:bg-background/80",
              isPinned ? 'bg-muted' : ''
            )}
            onClick={toggleSidebar}
          >
            <History className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* 聊天消息区域 */}
      <ScrollArea className={cn(
        "flex-1 px-4 mb-4",
        className,
        isOpen ? 'mr-[320px]' : ''
      )}>
        <div className="flex flex-col-reverse justify-end min-h-full py-4 space-y-reverse space-y-4">
          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 shrink-0">
                <div className="bg-primary text-primary-foreground w-full h-full flex items-center justify-center text-sm font-semibold">
                  AI
                </div>
              </Avatar>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' 
                  ? "w-[calc(100%-3rem)] ml-auto"
                  : "w-full"
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="w-8 h-8 shrink-0">
                  <div className="bg-primary text-primary-foreground w-full h-full flex items-center justify-center text-sm font-semibold">
                    AI
                  </div>
                </Avatar>
              )}
              
              <div
                className={cn(
                  "rounded-lg p-4 max-w-[80%]",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted"
                )}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs mt-2 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {message.role === 'user' && (
                <Avatar className="w-8 h-8 shrink-0">
                  <div className="bg-secondary text-secondary-foreground w-full h-full flex items-center justify-center text-sm font-semibold">
                    你
                  </div>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 历史记录侧边栏 */}
      <div
        ref={sidebarRef}
        className={cn(
          "absolute right-0 top-14 h-[calc(100%-3.5rem)] transition-all duration-300 ease-in-out",
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Card className="h-full relative">
          {/* 拖拽调节宽度的把手 */}
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-border"
            onMouseDown={handleMouseDown}
          />
          
          <CardContent className="h-full p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">历史记录</h3>
            </div>

            {/* 搜索框 */}
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索历史记录..."
                className="pl-8"
              />
            </div>

            {/* 历史记录列表 */}
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer group hover:bg-accent",
                    activeSessionId === session.id ? 'bg-accent' : ''
                  )}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium leading-none">
                          {session.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {session.lastMessage}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 实现删除会话逻辑
                        console.log('删除会话:', session.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatWindow; 