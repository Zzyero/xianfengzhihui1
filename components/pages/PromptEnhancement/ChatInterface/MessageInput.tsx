"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, StopCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import '../styles/ChatInterface.css';
import db from '../service/db'; // 导入数据库工具

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
  const dummyTextareaRef = useRef<HTMLDivElement>(null);  // 用于计算高度的隐藏div

  /**
   * 更准确的自动调整高度实现
   * 使用隐藏的div计算实际内容高度
   */
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    const dummyTextarea = dummyTextareaRef.current;
    
    if (!textarea || !dummyTextarea) return;
    
    // 将内容复制到隐藏div用于计算高度
    // 替换换行符为<br>以保持正确的换行表现
    dummyTextarea.innerHTML = message.replace(/\n/g, '<br>&nbsp;');
    
    // 如果内容为空，添加一个空格占位以获取最小高度
    if (!message) {
      dummyTextarea.innerHTML = '&nbsp;';
    }
    
    // 计算新高度（在40px-250px之间）- 增加最大高度到250px
    // 添加适当的内边距以匹配textarea
    const paddingHeight = 24; // 顶部和底部的内边距和边框总高度
    const maxHeight = 250; // 增加最大高度
    const newHeight = Math.min(maxHeight, Math.max(40, dummyTextarea.scrollHeight + paddingHeight));
    
    // 设置新高度
    textarea.style.height = `${newHeight}px`;
    
    // 设置溢出处理 - 当内容实际需要的高度超过最大高度时启用滚动条
    if (dummyTextarea.scrollHeight + paddingHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
    
    // 通知父组件高度变化
    onResize(newHeight);
  };

  // 监听消息内容变化，调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // 组件挂载时初始化
  useEffect(() => {
    // 初始调整一次高度
    adjustTextareaHeight();
    
    // 监听窗口大小变化
    window.addEventListener('resize', adjustTextareaHeight);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', adjustTextareaHeight);
    };
  }, []);

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
    
    // 清空输入框并重置高度
    setMessage('');
    
    // 使用setTimeout确保在下一个渲染周期调整高度
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
        textareaRef.current.style.overflowY = 'hidden'; // 重置滚动条状态
        onResize(40);
      }
    }, 0);
  };

  /**
   * 处理键盘事件
   * Enter键发送消息，Shift+Enter换行
   * 上下箭头浏览输入历史
   */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
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

  /**
   * 处理输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setMessage(e.target.value);
    // 高度调整在useEffect中处理
  };

  return (
    <div className="message-input-container">
      <div className="input-area">
        {/* 隐藏的div用于计算文本高度 */}
        <div 
          ref={dummyTextareaRef}
          className="dummy-textarea"
          aria-hidden="true"
        ></div>
        
        {/* 消息输入框 */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className="text-input"
          rows={1}
          style={{ 
            height: '40px', // 初始高度
            overflow: 'hidden', // 初始状态隐藏滚动条，会在adjustTextareaHeight中动态改变
            maxHeight: '250px' // 设置最大高度
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