"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, StopCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import '../styles/ChatInterface.css';
import db from '../server/db'; // 导入数据库工具

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
  const [inputHistory, setInputHistory] = useState<string[]>([]);  // 输入历史记录
  const [historyIndex, setHistoryIndex] = useState<number>(-1);  // 历史记录索引
  
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
      // 限制高度在40px到150px之间
      const newHeight = Math.min(150, Math.max(40, textarea.scrollHeight));
      textarea.style.height = `${newHeight}px`;
      onResize(newHeight);
    };

    // 初始化高度
    adjustHeight();
    
    // 监听输入事件以调整高度
    textarea.addEventListener('input', adjustHeight);
    return () => textarea.removeEventListener('input', adjustHeight);
  }, [onResize]);

  // 从IndexedDB加载输入历史记录
  useEffect(() => {
    const loadInputHistory = async () => {
      try {
        // 从IndexedDB加载输入历史
        const history = await db.getInputHistory();
        if (history && history.length > 0) {
          setInputHistory(history);
        }
      } catch (error) {
        console.error('加载输入历史失败:', error);
      }
    };
    
    loadInputHistory();
  }, []);

  /**
   * 保存输入历史到IndexedDB
   * @param history 更新后的历史记录
   */
  const saveHistoryToDatabase = async (history: string[]) => {
    try {
      await db.saveInputHistory(history);
    } catch (error) {
      console.error('保存输入历史失败:', error);
    }
  };

  /**
   * 处理消息提交
   */
  const handleSubmit = (): void => {
    if (!message.trim()) return;
    
    // 更新输入历史
    const updatedHistory = [
      message,
      ...inputHistory.filter(item => item !== message).slice(0, 19)  // 保留最近20条，去重
    ];
    setInputHistory(updatedHistory);
    saveHistoryToDatabase(updatedHistory);
    setHistoryIndex(-1);
    
    // 发送消息
    onSend(message);
    setMessage('');
    
    // 重置输入框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      onResize(40);
    }
  };

  /**
   * 处理键盘事件
   * Enter键发送消息，Shift+Enter换行
   * 上下箭头浏览输入历史
   */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp' && !e.shiftKey && inputHistory.length > 0) {
      // 向上浏览历史记录
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
      setHistoryIndex(newIndex);
      setMessage(inputHistory[newIndex]);
    } else if (e.key === 'ArrowDown' && !e.shiftKey && historyIndex > -1) {
      // 向下浏览历史记录
      e.preventDefault();
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (newIndex === -1) {
        setMessage('');
      } else {
        setMessage(inputHistory[newIndex]);
      }
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
          style={{ 
            resize: 'none',
            overflow: 'auto',
            minHeight: '40px',
            maxHeight: '150px'
          }}
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
              aria-label="停止生成"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            // 发送消息按钮
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="send-button"
              aria-label="发送消息"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput; 