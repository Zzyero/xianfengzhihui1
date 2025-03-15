"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Search, MessageSquare, PlusCircle, Trash, Edit, Star, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import '../styles/ChatInterface.css';
// 导入数据库工具类和类型定义
import db, { Message, ChatSession } from '../server/db';
import { Toaster, toast } from "sonner";
// 导入消息显示组件
import MessageDisplay from './MessageDisplay';

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
    
    // 不允许删除当前活动对话
    if (sessionId === activeSessionId) {
      toast.error('不能删除当前正在使用的对话');
      return;
    }
    
    try {
      // 确保从数据库中彻底删除会话及其消息
      await db.deleteSession(sessionId);
      
      // 本地状态更新
      setFilteredSessions(prev => prev.filter(s => s.id !== sessionId));
      
      toast.success('会话已删除');
    } catch (error) {
      console.error('删除会话失败:', error);
      toast.error('删除会话失败');
    }
  };

  /**
   * 处理会话标题编辑
   * @param e 事件对象
   * @param session 会话对象
   */
  const handleEditSession = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation(); // 阻止事件冒泡
    
    // 如果当前正在编辑这个会话，则保存编辑
    if (editingSessionId === session.id) {
      handleSaveEdit(session);
    } else {
      // 否则开始编辑
      setEditingSessionId(session.id);
      setEditedTitle(session.title);
    }
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
          {messages.map((message) => (
            <MessageDisplay 
              key={message.id}
              message={message} 
              showTimestamp={true} 
            />
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
                      session.starred && 'starred'
                    )}
                    onClick={() => onSelectSession(session.id)}
                  >
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
                            onClick={(e) => handleEditSession(e, session)}
                          >
                            {editingSessionId === session.id ? (
                              <Save className="h-3 w-3" />
                            ) : (
                              <Edit className="h-3 w-3" />
                            )}
                          </Button>
                          
                          {/* 删除按钮 - 当前活动会话不显示删除按钮 */}
                          {session.id !== activeSessionId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="delete-button"
                              onClick={(e) => handleDeleteSession(e, session.id)}
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          )}
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