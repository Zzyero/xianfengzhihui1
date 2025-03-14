"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Search, MessageSquare, PlusCircle, Trash, Edit, Star, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import '../styles/ChatInterface.css';
// 导入数据库工具类和类型定义
import db, { Message, ChatSession } from '../server/db';
import { Toaster, toast } from "sonner";

// 从db.ts导入的类型
// import type { Message, ChatSession } from '../server/db';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>(sessions);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // 编辑状态相关
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  
  // 拖拽相关
  const [draggedSession, setDraggedSession] = useState<string | null>(null);
  const [draggedOverSession, setDraggedOverSession] = useState<string | null>(null);
  
  const dragStartX = useRef<number>(0);
  const dragStartWidth = useRef<number>(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // 当会话列表变化时更新过滤后的会话
  useEffect(() => {
    setFilteredSessions(sessions);
  }, [sessions]);

  // 处理会话搜索
  useEffect(() => {
    // 清除之前的搜索超时
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // 使用防抖处理搜索
    searchTimeout.current = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setFilteredSessions(sessions);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await db.searchSessions(searchQuery);
        setFilteredSessions(results);
      } catch (error) {
        console.error('搜索会话失败:', error);
        toast.error('搜索失败');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, sessions]);

  // 调整宽度相关处理
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

  /**
   * 处理删除会话
   * @param e 事件对象
   * @param sessionId 会话ID
   */
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // 阻止事件冒泡
    
    try {
      await db.deleteSession(sessionId);
      
      // 本地状态更新，立即反映删除操作
      setFilteredSessions(prev => prev.filter(s => s.id !== sessionId));
      
      // 如果删除的是当前会话，清空消息并重置activeSessionId
      if (sessionId === activeSessionId) {
        onNewChat();
      }
      
      toast.success('会话已删除');
    } catch (error) {
      console.error('删除会话失败:', error);
      toast.error('删除会话失败');
    }
  };

  /**
   * 开始编辑会话标题
   * @param e 事件对象
   * @param session 会话对象
   */
  const handleStartEdit = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation(); // 阻止事件冒泡
    setEditingSessionId(session.id);
    setEditedTitle(session.title);
  };

  /**
   * 保存编辑的会话标题
   */
  const handleSaveEdit = async (session: ChatSession) => {
    if (!editedTitle.trim()) {
      setEditingSessionId(null);
      return;
    }

    try {
      const updatedSession = {
        ...session,
        title: editedTitle.trim()
      };
      
      await db.saveSession(updatedSession);
      
      // 本地状态更新，立即反映编辑结果
      setFilteredSessions(prev => 
        prev.map(s => s.id === session.id ? {...s, title: editedTitle.trim()} : s)
      );
      
      setEditingSessionId(null);
      toast.success('会话标题已更新');
    } catch (error) {
      console.error('更新会话标题失败:', error);
      toast.error('更新会话标题失败');
    }
  };

  /**
   * 处理标星/取消标星
   * @param e 事件对象
   * @param session 会话对象
   */
  const handleToggleStar = async (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation(); // 阻止事件冒泡
    
    try {
      const updatedSession = {
        ...session,
        starred: !session.starred
      };
      
      await db.saveSession(updatedSession);
      
      // 本地状态更新，立即反映星标状态变化
      setFilteredSessions(prev => 
        prev.map(s => s.id === session.id ? {...s, starred: !s.starred} : s)
      );
      
      toast.success(updatedSession.starred ? '已添加到星标' : '已从星标移除');
    } catch (error) {
      console.error('更新会话星标失败:', error);
      toast.error('更新会话星标失败');
    }
  };

  /**
   * 拖拽开始处理
   * @param e 拖拽事件
   * @param sessionId 被拖拽的会话ID
   */
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    setDraggedSession(sessionId);
    e.dataTransfer.effectAllowed = 'move';
    // 设置拖拽时的透明图片
    const img = new Image();
    e.dataTransfer.setDragImage(img, 0, 0);
    e.currentTarget.classList.add('dragging');
  };

  /**
   * 拖拽结束处理
   */
  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedSession(null);
    setDraggedOverSession(null);
  };

  /**
   * 拖拽进入区域处理
   */
  const handleDragOver = (e: React.DragEvent, sessionId: string) => {
    e.preventDefault();
    if (draggedSession === sessionId) return;
    setDraggedOverSession(sessionId);
  };

  /**
   * 拖拽放置处理
   */
  const handleDrop = async (e: React.DragEvent, targetSessionId: string) => {
    e.preventDefault();
    
    if (!draggedSession || draggedSession === targetSessionId) {
      return;
    }
    
    try {
      // 找到目标会话和源会话的索引
      const sourceIndex = filteredSessions.findIndex(s => s.id === draggedSession);
      const targetIndex = filteredSessions.findIndex(s => s.id === targetSessionId);
      
      if (sourceIndex === -1 || targetIndex === -1) return;
      
      // 计算新的顺序值
      let newOrder: number;
      
      // 如果向上移动
      if (sourceIndex > targetIndex) {
        const prevSession = targetIndex > 0 ? filteredSessions[targetIndex - 1] : null;
        const targetSession = filteredSessions[targetIndex];
        
        newOrder = prevSession 
          ? (prevSession.order || 0) + ((targetSession.order || 0) - (prevSession.order || 0)) / 2
          : (targetSession.order || 0) - 1000;
      } 
      // 如果向下移动
      else {
        const targetSession = filteredSessions[targetIndex];
        const nextSession = targetIndex < filteredSessions.length - 1 ? filteredSessions[targetIndex + 1] : null;
        
        newOrder = nextSession
          ? (targetSession.order || 0) + ((nextSession.order || 0) - (targetSession.order || 0)) / 2
          : (targetSession.order || 0) + 1000;
      }
      
      // 更新源会话的顺序
      const sourceSession = filteredSessions[sourceIndex];
      const updatedSession = {
        ...sourceSession,
        order: newOrder
      };
      
      await db.saveSession(updatedSession);
      toast.success('会话顺序已更新');
    } catch (error) {
      console.error('更新会话顺序失败:', error);
      toast.error('更新会话顺序失败');
    }
  };

  return (
    <div className="chat-window">
      <Toaster position="top-center" />
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="sessions-list">
              {isSearching ? (
                <div className="searching-indicator">搜索中...</div>
              ) : filteredSessions.length === 0 ? (
                <div className="no-sessions">
                  {searchQuery ? '没有找到匹配的会话' : '没有历史会话'}
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "session-item",
                      activeSessionId === session.id && 'active',
                      session.starred && 'starred',
                      draggedSession === session.id && 'dragging',
                      draggedOverSession === session.id && 'drag-over'
                    )}
                    onClick={() => onSelectSession(session.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, session.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, session.id)}
                    onDrop={(e) => handleDrop(e, session.id)}
                  >
                    <div className="session-drag-handle">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="session-content">
                      <div className="session-title">
                        <div className="title-content">
                          <MessageSquare className="h-4 w-4" />
                          {editingSessionId === session.id ? (
                            <Input
                              className="title-edit-input"
                              value={editedTitle}
                              onChange={(e) => setEditedTitle(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(session);
                                } else if (e.key === 'Escape') {
                                  setEditingSessionId(null);
                                }
                              }}
                              autoFocus
                              onBlur={() => handleSaveEdit(session)}
                            />
                          ) : (
                            <span>{session.title}</span>
                          )}
                        </div>
                        
                        <div className="session-actions">
                          {/* 星标按钮 */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("star-button", session.starred && "starred")}
                            onClick={(e) => handleToggleStar(e, session)}
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                          
                          {/* 编辑按钮 */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="edit-button"
                            onClick={(e) => handleStartEdit(e, session)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          
                          {/* 删除按钮 */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="delete-button"
                            onClick={(e) => handleDeleteSession(e, session.id)}
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
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
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatWindow; 