"use client";
import React, { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";
import '../styles/ChatInterface.css';
import { Message, ChatSession } from '../service/db';
import { Toaster } from "sonner";
import MessageDisplay from './MessageDisplay';
import HistorySidebar from './HistorySidebar';

// 定义 ChatWindow 组件的属性接口
interface ChatWindowProps {
  messages: Message[];
  isTyping?: boolean;
  className?: string;
  onNewChat: () => void;
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
  sidebarOpen,
  setSidebarOpen,
  sessions,
  onSelectSession,
  activeSessionId
}) => {
  // 用于标记消息列表底部的元素引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 用于引用消息容器的元素
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // 控制是否自动滚动的状态
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  // 记录上一次消息列表的长度
  const prevMessagesLengthRef = useRef<number>(0);
  // 记录上一次 AI 的输入状态
  const prevIsTypingRef = useRef<boolean>(false);

  // 处理滚动事件，根据滚动位置控制自动滚动状态
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // 向上滚动超过阈值，禁用自动滚动
    if (distanceFromBottom > 20 && shouldAutoScroll) {
      console.log("用户已向上滚动，禁用自动滚动");
      setShouldAutoScroll(false);
    } 
    // 接近底部，重新启用自动滚动
    else if (distanceFromBottom < 4 && !shouldAutoScroll) {
      console.log("用户已接近底部，重新启用自动滚动");
      setShouldAutoScroll(true);
    }
  };

  // 处理鼠标滚轮事件，向上滚动时禁用自动滚动
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0 && shouldAutoScroll) {
      console.log("鼠标滚轮上移，禁用自动滚动");
      setShouldAutoScroll(false);
    }
  };

  // 消息列表更新时的副作用处理
  useEffect(() => {
    const currentLength = messages.length;
    if (currentLength > prevMessagesLengthRef.current && currentLength > 0) {
      const lastMessage = messages[currentLength - 1];
      // 用户发送新消息，启用自动滚动
      if (lastMessage.role === 'user') {
        console.log("用户发送新消息，启用自动滚动");
        setShouldAutoScroll(true);
      }
    }
    // 若允许自动滚动且有底部标记元素，执行滚动操作
    if (shouldAutoScroll && messagesEndRef.current) {
      console.log("执行自动滚动");
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
    // 更新上一次消息列表长度
    prevMessagesLengthRef.current = currentLength;
  }, [messages, shouldAutoScroll]);

  // AI 输入状态变化时的副作用处理
  useEffect(() => {
    // AI 停止输入，禁用自动滚动
    if (prevIsTypingRef.current && !isTyping) {
      console.log("AI停止输入，禁用自动滚动");
      setShouldAutoScroll(false);
    }
    // 更新上一次 AI 输入状态
    prevIsTypingRef.current = isTyping;
  }, [isTyping]);

  // 会话切换时的副作用处理
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
      setShouldAutoScroll(true);
      console.log("会话切换，滚动到底部");
    }
  }, [activeSessionId]);

  return (
    <div className="chat-window">
      {/* 消息通知组件 */}
      <Toaster position="top-center" />
      <div 
        className={cn(
          "message-list",
          sidebarOpen && "with-sidebar",
          className,
          "overflow-y-auto" // 添加滚动样式
        )}
        ref={messagesContainerRef} 
        onScroll={handleScroll} 
        onWheel={handleWheel}
      >
        {/* 渲染消息列表 */}
        {messages.map((message) => (
          <MessageDisplay 
            key={message.id}
            message={message} 
            showTimestamp={true} 
          />
        ))}
        {/* 消息列表底部标记元素 */}
        <div ref={messagesEndRef} className="messages-end-marker" />
      </div>
      {/* 历史会话侧边栏组件 */}
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