"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Search, MessageSquare, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import '../styles/ChatInterface.css';

// 类型定义
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

interface ChatWindowProps {
  messages: Message[];
  isTyping?: boolean;
  className?: string;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  activeSessionId?: string;
  onNewChat: () => void;
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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [width, setWidth] = useState<number>(320);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent): void => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDragging) return;
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.min(Math.max(280, dragStartWidth.current + delta), 800);
      setWidth(newWidth);
    };

    const handleMouseUp = (): void => {
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

  const handleMouseEnter = (): void => {
    setIsOpen(true);
  };

  const handleMouseLeave = (): void => {
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  const toggleSidebar = (): void => {
    setIsPinned(!isPinned);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-controls">
        <Button
          variant="ghost"
          size="icon"
          className="new-chat-button"
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
            className={cn("history-button", isPinned && 'pinned')}
            onClick={toggleSidebar}
          >
            <History className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <ScrollArea className={cn(
        "message-list",
        className,
        isOpen && 'with-sidebar'
      )}>
        <div className="messages-container">
          {isTyping && (
            <div className="message-item assistant-message">
              <Avatar className="avatar">
                <div className="avatar-content">AI</div>
              </Avatar>
              <div className="message-content typing">
                <div className="typing-indicator">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "message-item",
                message.role === 'user' ? 'user-message' : 'assistant-message'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="avatar">
                  <div className="avatar-content">AI</div>
                </Avatar>
              )}
              
              <div className="message-content">
                <div className="message-text">{message.content}</div>
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {message.role === 'user' && (
                <Avatar className="avatar">
                  <div className="avatar-content user">你</div>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div
        ref={sidebarRef}
        className={cn(
          "sidebar",
          isOpen && 'open'
        )}
        style={{ width }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Card className="sidebar-content">
          <div className="resize-handle" onMouseDown={handleMouseDown} />
          
          <CardContent className="sidebar-inner">
            <div className="sidebar-header">
              <h3>历史记录</h3>
            </div>

            <div className="search-container">
              <Search className="search-icon" />
              <Input
                placeholder="搜索历史记录..."
                className="search-input"
              />
            </div>

            <div className="sessions-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "session-item",
                    activeSessionId === session.id && 'active'
                  )}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="session-content">
                    <div className="session-title">
                      <MessageSquare className="h-4 w-4" />
                      <span>{session.title}</span>
                    </div>
                    <div className="session-info">
                      <span className="message-count">{session.messageCount} 条消息</span>
                      <span className="session-time">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="session-preview">{session.lastMessage}</p>
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