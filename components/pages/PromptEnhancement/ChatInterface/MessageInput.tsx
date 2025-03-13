"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, StopCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import '../styles/ChatInterface.css';

/**
 * 消息输入组件属性接口
 */
interface MessageInputProps {
  onSend: (message: string) => void;  // 发送消息回调
  onStop: () => void;                 // 停止生成回调
  isGenerating: boolean;              // 是否正在生成回复
  onResize: (height: number) => void; // 输入框大小调整回调
}

/**
 * 消息输入组件
 * 处理用户消息输入、发送，以及输入框大小自适应
 */
const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onStop,
  isGenerating,
  onResize
}) => {
  // ===== 状态管理 =====
  const [message, setMessage] = useState<string>('');  // 输入的消息内容
  
  // ===== Refs =====
  const textareaRef = useRef<HTMLTextAreaElement>(null);  // 文本输入框引用

  /**
   * 处理输入框高度自适应
   */
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = (): void => {
      textarea.style.height = 'auto';
      // 限制高度在56px到200px之间
      const newHeight = Math.min(200, Math.max(56, textarea.scrollHeight));
      textarea.style.height = `${newHeight}px`;
      onResize(newHeight);
    };

    // 监听输入事件以调整高度
    textarea.addEventListener('input', adjustHeight);
    return () => textarea.removeEventListener('input', adjustHeight);
  }, [onResize]);

  /**
   * 处理消息提交
   */
  const handleSubmit = (): void => {
    if (!message.trim()) return;
    onSend(message);
    setMessage('');
    // 重置输入框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px';
      onResize(56);
    }
  };

  /**
   * 处理键盘事件
   * Enter键发送消息，Shift+Enter换行
   */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="message-input-container">
      <div className="input-area">
        {/* 消息输入框 */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className="text-input"
        />
        {/* 操作按钮 */}
        <div className="button-container">
          {isGenerating ? (
            // 停止生成按钮
            <Button
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="stop-button"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            // 发送消息按钮
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="send-button"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput; 