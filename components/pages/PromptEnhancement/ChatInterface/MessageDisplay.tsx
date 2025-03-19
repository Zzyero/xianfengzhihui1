"use client";

import React, { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Message } from '../service/db';
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import '../styles/MessageDisplay.css';
import { Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Components } from 'react-markdown';
import { Code } from 'lucide-react';

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

  // 处理代码复制
  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        toast.success("代码已复制到剪贴板");
      })
      .catch((error) => {
        console.error("复制失败:", error);
        toast.error("复制失败，请手动复制");
      });
  }, []);

  // 自定义组件配置
  const customComponents: Components = {
    // 自定义pre标签渲染
    pre: (props) => {
      const { children, className, ...rest } = props;
      // 获取代码内容和语言类型
      const codeElement = React.Children.toArray(children).find(
        child => React.isValidElement(child) && child.type === 'code'
      );
      
      let code = '';
      let language = 'code'; // 默认语言
      
      if (React.isValidElement(codeElement)) {
        // 从code元素的className中提取语言类型
        const langMatch = /language-(\w+)/.exec(codeElement.props.className || '');
        if (langMatch && langMatch[1]) {
          language = langMatch[1];
        }
        
        code = React.Children.toArray(codeElement.props.children)
          .join('')
          .replace(/\n$/, '');
      }
      
      // 创建带导航栏的代码块
      return (
        <div className="code-block-container">
          <div className="code-block-header">
            <div className="code-language">
              <Code className="h-3.5 w-3.5 mr-1" /> {language}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="copy-button"
              onClick={() => handleCopyCode(code)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <pre className={className} {...rest}>
            {children}
          </pre>
        </div>
      );
    },
    // 正常渲染code标签
    code: (props) => {
      const { children, className, ...rest } = props;
      // 如果是独立的代码块，由pre标签处理
      if (className && className.includes('language-')) {
        return <code className={className} {...rest}>{children}</code>;
      }
      // 如果是行内代码，添加内联样式
      return (
        <code className={cn("inline-code", className)} {...rest}>
          {children}
        </code>
      );
    }
  };
  
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
        {isUser ? (
          // 用户消息始终以纯文本形式显示
          <div className="plain-text">
            {message.content.split("\n").map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < message.content.split("\n").length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        ) : (
          // AI助手消息使用Markdown解析
          <div className="markdown-content">
            <ReactMarkdown 
              rehypePlugins={[rehypeRaw]} 
              remarkPlugins={[remarkGfm]}
              components={customComponents}
            >
              {message.content}
            </ReactMarkdown>
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