"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Message } from '../server/db';
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import '../styles/MessageDisplay.css';

interface MessageDisplayProps {
  message: Message;
  showTimestamp?: boolean;
}

/**
 * 消息显示组件
 * 支持Markdown格式和代码高亮
 */
const MessageDisplay: React.FC<MessageDisplayProps> = ({ message, showTimestamp = true }) => {
  const isUser = message.role === 'user';
  
  // 检测内容是否可能包含Markdown
  const containsMarkdown = (content: string): boolean => {
    // 检查常见的Markdown标记
    const markdownPatterns = [
      /```[\s\S]+?```/,      // 代码块
      /\[.+?\]\(.+?\)/,      // 链接
      /!\[.+?\]\(.+?\)/,     // 图片
      /\*\*.+?\*\*/,          // 粗体
      /\*.+?\*/,              // 斜体
      /^#+\s/m,               // 标题
      /^>\s/m,                // 引用
      /^-\s/m,                // 无序列表
      /^[0-9]+\.\s/m,         // 有序列表
      /\|.+\|.+\|/,           // 表格
      /~~.+?~~/,              // 删除线
      /\`[^`]+\`/,           // 行内代码
    ];
    
    // 如果匹配任一模式，则视为包含Markdown
    return markdownPatterns.some(pattern => pattern.test(content));
  };
  
  // 是否包含可能的Markdown格式
  const hasMarkdown = containsMarkdown(message.content);
  
  return (
    <div className={cn(
      "message",
      isUser ? "user-message" : "assistant-message"
    )}>
      <div className="message-avatar">
        <Avatar>
          <div className="avatar-content">
            {isUser ? '用户' : 'AI'}
          </div>
        </Avatar>
      </div>
      
      <div className="message-content">
        {hasMarkdown ? (
          <div className="markdown-content">
            <ReactMarkdown 
              rehypePlugins={[rehypeRaw]} 
              remarkPlugins={[remarkGfm]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="plain-text">
            {message.content.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < message.content.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        )}
        
        {showTimestamp && (
          <div className="message-timestamp">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageDisplay; 