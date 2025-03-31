"use client";
import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Message } from '../service/db';
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Components } from 'react-markdown';
import { Code } from 'lucide-react';
import '../styles/MessageDisplay.css';

interface MessageDisplayProps {
  message: Message;
  showTimestamp?: boolean;
}

// 定义 React 元素类型，解决类型检查问题
interface ReactElementWithChildren {
  props: {
    children?: React.ReactNode;
    className?: string;
    [key: string]: any;
  };
  type: string | React.JSXElementConstructor<any>;
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
    if (!code || code.trim() === '') {
      toast.error("无代码内容可复制");
      return;
    }
    
    navigator.clipboard.writeText(code)
      .then(() => {
        toast.success("代码已复制到剪贴板");
      })
      .catch((error) => {
        console.error("复制失败:", error);
        toast.error("复制失败，请手动复制");
      });
  }, []);

  // 从Markdown代码块中提取语言
  const extractLanguageFromMarkdown = (content: string, codeBlockIndex: number = 0): string => {
    const codeBlockRegex = /```(\w*)\n[\s\S]*?```/g;
    let match;
    let currentIndex = 0;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (currentIndex === codeBlockIndex) {
        // 返回语言名称，如果没有指定则返回默认值
        return match[1] || 'code';
      }
      currentIndex++;
    }
    
    return 'code'; // 默认语言
  };

  // 安全地提取代码内容
  const extractCodeContent = (element: React.ReactElement | React.ReactNode | string): string => {
    // 处理字符串元素
    if (typeof element === 'string') {
      return element;
    }
    
    // 处理React元素
    if (React.isValidElement(element)) {
      // 如果元素有children属性，递归处理
      const elementWithProps = element as ReactElementWithChildren;
      if (elementWithProps.props && elementWithProps.props.children) {
        if (Array.isArray(elementWithProps.props.children)) {
          return elementWithProps.props.children.map((child) => 
            extractCodeContent(child)
          ).join('');
        } else {
          return extractCodeContent(elementWithProps.props.children);
        }
      }
    }
    
    return '';
  };

  // 跟踪当前渲染的代码块索引
  const codeBlockIndexRef = useRef<number>(0);
  
  // 在组件挂载时重置代码块索引
  useEffect(() => {
    codeBlockIndexRef.current = 0;
  }, [message.content]);

  // 自定义组件配置
  const customComponents: Components = {
    // 自定义pre标签渲染
    pre: (props) => {
      const { children, className, ...rest } = props;
      const preRef = useRef<HTMLPreElement>(null);
      
      // 获取代码内容和语言类型
      const codeElement = React.Children.toArray(children).find(
        child => React.isValidElement(child) && (child as React.ReactElement).type === 'code'
      ) as React.ReactElement | undefined;
      
      let code = '';
      // 从markdown原始内容中提取语言
      let language = extractLanguageFromMarkdown(message.content, codeBlockIndexRef.current);
      
      // 递增代码块索引，为下一个代码块准备
      codeBlockIndexRef.current += 1;
      
      if (codeElement && React.isValidElement(codeElement)) {
        const codeElementWithProps = codeElement as ReactElementWithChildren;
        
        // 尝试从className提取语言 (备用方法)
        if (codeElementWithProps.props.className) {
          const langMatch = /language-(\w+)/.exec(codeElementWithProps.props.className);
          if (langMatch && langMatch[1] && langMatch[1] !== 'null') {
            language = langMatch[1];
          }
        }
        
        // 提取代码内容
        const codeChildren = codeElementWithProps.props.children;
        if (Array.isArray(codeChildren)) {
          code = codeChildren.map((child) => extractCodeContent(child)).join('');
        } else {
          code = extractCodeContent(codeChildren || '');
        }
        
        // 删除末尾的换行符
        code = code.replace(/\n$/, '');
      }
      
      // 复制按钮点击处理函数
      const handleCopyClick = () => {
        // 如果code为空，尝试从DOM元素获取内容
        if (!code && preRef.current) {
          const codeElement = preRef.current.querySelector('code');
          if (codeElement) {
            code = codeElement.textContent || '';
          }
        }
        handleCopyCode(code);
      };
      
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
              onClick={handleCopyClick}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <pre ref={preRef} className={className} {...rest}>
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
    <div className="message-display-wrapper">
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
                skipHtml={true}
                unwrapDisallowed={true}
              >
                {message.content.replace(/<think>[\s\S]*?<\/think>/g, '')}
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
    </div>
  );
};

export default MessageDisplay; 