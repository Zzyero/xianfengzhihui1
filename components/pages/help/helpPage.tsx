'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { HelpPageSidebar } from './helpPageSidebar';
import './helpPage.css';

/**
 * 标题类型
 */
interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * 帮助页面组件
 * 显示应用程序的帮助信息和文档
 */
export function HelpPage() {
  // 当前活跃的文档
  const [activeDoc, setActiveDoc] = useState('Introducer.md');
  // 文档内容
  const [markdownContent, setMarkdownContent] = useState('');
  // 文档中的标题列表
  const [headings, setHeadings] = useState<Heading[]>([]);
  // 内容容器引用，用于滚动
  const contentRef = useRef<HTMLDivElement>(null);
  // 文档是否已经加载完成
  const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);
  // 保存标题的原始文本到ID的映射
  const [headingMap, setHeadingMap] = useState<Map<string, string>>(new Map());

  // 加载文档内容
  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        setIsDocumentLoaded(false);
        setHeadingMap(new Map()); // 重置标题映射
        
        // 从public目录加载文档
        const response = await fetch(`/help/documents/${activeDoc}`);
        if (!response.ok) {
          throw new Error(`文档加载失败: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        setMarkdownContent(text);
        
        // 提取标题
        const extractedHeadings = extractHeadings(text);
        setHeadings(extractedHeadings);
        
        // 标记文档已加载完成
        setTimeout(() => {
          setIsDocumentLoaded(true);
        }, 300);
      } catch (error) {
        console.error('加载Markdown文件失败:', error);
        setMarkdownContent('# 加载文档失败\n\n无法加载请求的文档。请稍后再试。');
        setHeadings([]);
      }
    };

    fetchMarkdown();
  }, [activeDoc]);
  
  /**
   * 为文本生成一个稳定的ID
   * 使用简单的哈希函数来增加唯一性
   */
  const generateStableId = (text: string, level: number): string => {
    // 首先创建一个基础ID 
    const baseId = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-')     // 空格替换为连字符
      .replace(/^-+|-+$/g, ''); // 移除开头和结尾的连字符
    
    // 添加前缀以提高唯一性
    return `h${level}-${baseId}`;
  };

  /**
   * 从Markdown文本中提取标题
   * @param text Markdown文本
   */
  const extractHeadings = (text: string): Heading[] => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const extractedHeadings: Heading[] = [];
    const newHeadingMap = new Map<string, string>();
    const usedIds = new Set<string>();
    let match;

    while ((match = headingRegex.exec(text)) !== null) {
      const level = match[1].length;
      const headingText = match[2].trim();
      
      // 生成稳定ID
      let id = generateStableId(headingText, level);
      
      // 确保ID是唯一的
      if (usedIds.has(id)) {
        let counter = 1;
        while (usedIds.has(`${id}-${counter}`)) {
          counter++;
        }
        id = `${id}-${counter}`;
      }
      
      usedIds.add(id);
      newHeadingMap.set(headingText, id);
      
      extractedHeadings.push({
        id,
        text: headingText,
        level,
      });
    }
    
    // 更新ID映射
    setHeadingMap(newHeadingMap);
    
    return extractedHeadings;
  };

  /**
   * 处理文档切换
   * @param docPath 文档路径
   */
  const handleDocChange = (docPath: string) => {
    setActiveDoc(docPath);
    // 内容区域滚动到顶部
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  /**
   * 处理标题点击，滚动到相应位置
   * @param headingId 标题ID
   */
  const handleHeadingClick = (headingId: string) => {
    if (!isDocumentLoaded) {
      console.warn('文档尚未完全加载，请稍后再试');
      return;
    }
    
    const element = document.getElementById(headingId);
    
    if (element) {
      // 计算元素位置和窗口高度
      const elementRect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // 滚动到元素位置，保证元素在视窗中间位置
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center' // 使元素在视图中居中
      });
      
      // 添加高亮效果
      element.classList.add('active-heading');
      
      // 一段时间后移除高亮效果
      setTimeout(() => {
        element.classList.remove('active-heading');
      }, 2000);
    } else {
      console.warn(`没有找到ID为 "${headingId}" 的标题元素`);
    }
  };

  // 创建符合类型要求的自定义组件配置
  const components = {
    h1: ({ node, ...props }: any) => {
      const text = props.children?.toString() || '';
      const id = headingMap.get(text) || generateStableId(text, 1);
      return <h1 id={id} className="help-heading" {...props} />;
    },
    h2: ({ node, ...props }: any) => {
      const text = props.children?.toString() || '';
      const id = headingMap.get(text) || generateStableId(text, 2);
      return <h2 id={id} className="help-heading" {...props} />;
    },
    h3: ({ node, ...props }: any) => {
      const text = props.children?.toString() || '';
      const id = headingMap.get(text) || generateStableId(text, 3);
      return <h3 id={id} className="help-heading" {...props} />;
    },
    h4: ({ node, ...props }: any) => {
      const text = props.children?.toString() || '';
      const id = headingMap.get(text) || generateStableId(text, 4);
      return <h4 id={id} className="help-heading" {...props} />;
    },
    h5: ({ node, ...props }: any) => {
      const text = props.children?.toString() || '';
      const id = headingMap.get(text) || generateStableId(text, 5);
      return <h5 id={id} className="help-heading" {...props} />;
    },
    h6: ({ node, ...props }: any) => {
      const text = props.children?.toString() || '';
      const id = headingMap.get(text) || generateStableId(text, 6);
      return <h6 id={id} className="help-heading" {...props} />;
    },
    img: ({ node, src, alt, ...props }: any) => {
      // 处理图片路径，使用public目录下的图片
      const imgSrc = src?.startsWith('/') || src?.startsWith('http')
        ? src
        : `/help/images/${src}`;
      return <img src={imgSrc} alt={alt || ''} className="doc-image" {...props} />;
    }
  };

  return (
    <div className="help-page-container">
      {/* 文档内容区域 */}
      <div className="content-container" ref={contentRef}>
        <ReactMarkdown components={components}>{markdownContent}</ReactMarkdown>
      </div>
      
      {/* 侧边栏导航 */}
      <HelpPageSidebar
        activeDoc={activeDoc}
        headings={headings}
        onDocChange={handleDocChange}
        onHeadingClick={handleHeadingClick}
      />
    </div>
  );
} 