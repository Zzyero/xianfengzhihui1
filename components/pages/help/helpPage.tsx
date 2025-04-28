'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { HelpPageSidebar } from './helpPageSidebar';
import './helpPage.css';
import { saveDocState, getDocState, getLastVisitedDoc } from './db';

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
  // 活跃的标题ID
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  // 是否正在加载中
  const [isLoading, setIsLoading] = useState(true);
  // 是否应该恢复滚动位置
  const shouldRestoreScroll = useRef(true);

  // 在初始加载时，从数据库恢复上次访问的文档
  useEffect(() => {
    const restoreLastVisitedDoc = async () => {
      try {
        const lastDocPath = await getLastVisitedDoc();
        if (lastDocPath) {
          setActiveDoc(lastDocPath);
        }
      } catch (error) {
        console.error('恢复上次访问文档失败:', error);
      }
    };

    restoreLastVisitedDoc();
  }, []);

  // 加载文档内容
  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        // 开始加载，先显示加载动画
        setIsLoading(true);
        setIsDocumentLoaded(false);
        setHeadingMap(new Map()); // 重置标题映射
        
        // 从public目录加载文档
        const response = await fetch(`/help/documents/${activeDoc}`);
        if (!response.ok) {
          throw new Error(`文档加载失败: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        
        // 立即设置文档内容，让它在背景中开始渲染
        setMarkdownContent(text);
        
        // 提取标题
        const extractedHeadings = extractHeadings(text);
        setHeadings(extractedHeadings);
        
        // 保持加载动画显示500ms，同时文档在背景中渲染
        setTimeout(() => {
          // 关闭加载动画，此时文档已经在背景中渲染完成
          setIsLoading(false);
          setIsDocumentLoaded(true);
        }, 500);
      } catch (error) {
        console.error('加载Markdown文件失败:', error);
        setMarkdownContent('# 加载文档失败\n\n无法加载请求的文档。请稍后再试。');
        setHeadings([]);
        
        // 显示错误信息500ms
        setTimeout(() => {
          setIsLoading(false);
        }, 100);
      }
    };

    fetchMarkdown();
  }, [activeDoc]);

  // 在文档加载完成后，恢复滚动位置
  useEffect(() => {
    const restoreScrollPosition = async () => {
      if (isDocumentLoaded && shouldRestoreScroll.current && contentRef.current) {
        shouldRestoreScroll.current = false;
        
        try {
          // 获取当前文档的状态
          const docState = await getDocState(activeDoc);
          if (docState) {
            // 恢复滚动位置
            const { scrollPosition, activeHeadingId } = docState;
            const container = contentRef.current;
            container.scrollTo({
            top: scrollPosition,
            behavior: 'smooth' // 平滑滚动效果
          });
          // 如果有活跃标题，设置它
          if (docState.activeHeadingId) {
            setActiveHeadingId(docState.activeHeadingId);
          }
          }
        } catch (error) {
          console.error('恢复滚动位置失败:', error);
        }
      }
    };

    restoreScrollPosition();
  }, [isDocumentLoaded, activeDoc]);

  // 保存当前文档状态
  const saveDocumentState = () => {
    if (contentRef.current && isDocumentLoaded) {
      const scrollPosition = contentRef.current.scrollTop;
      saveDocState(
        activeDoc,
        scrollPosition,
        activeHeadingId
      ).catch(error => {
        console.error('保存文档状态失败:', error);
      });
    }
  };

  // 监听滚动事件，保存文档状态
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !isDocumentLoaded) return;

    let scrollTimeout: number;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        saveDocumentState();
      }, 300);
    };

    container.addEventListener('scroll', handleScroll);
    
    return () => {
      clearTimeout(scrollTimeout);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isDocumentLoaded, activeDoc, activeHeadingId]);

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
    // 保存当前状态
    saveDocumentState();
    
    // 设置新文档
    setActiveDoc(docPath);
    
    // 设置标记，以便在新文档加载完成后恢复滚动位置
    shouldRestoreScroll.current = true;
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
    
    setActiveHeadingId(headingId);
    
    const element = document.getElementById(headingId);
    
    if (element) {
      // 滚动到元素位置
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center' // 使元素在视图中居中
      });
      
      // 保存状态
      setTimeout(saveDocumentState, 500);
    } else {
      console.warn(`没有找到ID为 "${headingId}" 的标题元素`);
    }
  };

  /**
   * 从alt标签中提取图片尺寸信息和说明文字
   * @param alt 图片alt属性文本
   * @returns 处理后的alt文本、尺寸类名、样式和说明文字
   */
  const extractImageSize = (alt: string) => {
    // 默认尺寸类为空（使用默认样式）
    let sizeClass = '';
    let alignClass = '';
    let cleanAlt = alt || '';
    let captionText = ''; // 图片说明文字
    let customStyle: Record<string, any> = {}; // 自定义样式对象
    
    // 检查是否包含尺寸标记 [size:值]
    const sizeMatch = cleanAlt.match(/\[size:(.*?)\]/);
    
    if (sizeMatch) {
      const sizeValue = sizeMatch[1].trim().toLowerCase();
      
      // 移除尺寸标记
      cleanAlt = cleanAlt.replace(sizeMatch[0], '').trim();
      
      // 处理预定义尺寸
      if (['tiny', 'x-small', 'small', 'medium', 'large', 'x-large', 'full'].includes(sizeValue)) {
        sizeClass = `img-${sizeValue}`;
      } 
      // 处理百分比尺寸
      else if (sizeValue.endsWith('%')) {
        const percentage = parseInt(sizeValue, 10);
        if (!isNaN(percentage) && percentage > 0 && percentage <= 100) {
          customStyle.maxWidth = sizeValue;
        }
      }
    }
    
    // 检查是否包含宽度设置 [width:值]
    const widthMatch = cleanAlt.match(/\[width:(.*?)\]/);
    if (widthMatch) {
      const widthValue = widthMatch[1].trim();
      
      // 移除宽度标记
      cleanAlt = cleanAlt.replace(widthMatch[0], '').trim();
      
      // 添加到自定义样式
      if (widthValue.endsWith('px') || widthValue.endsWith('%') || 
          widthValue.endsWith('em') || widthValue.endsWith('rem') ||
          !isNaN(parseInt(widthValue, 10))) {
        // 如果没有单位，默认添加px
        const width = widthValue.match(/^\d+$/) ? `${widthValue}px` : widthValue;
        customStyle.width = width;
      }
    }
    
    // 检查是否包含高度设置 [height:值]
    const heightMatch = cleanAlt.match(/\[height:(.*?)\]/);
    if (heightMatch) {
      const heightValue = heightMatch[1].trim();
      
      // 移除高度标记
      cleanAlt = cleanAlt.replace(heightMatch[0], '').trim();
      
      // 添加到自定义样式
      if (heightValue.endsWith('px') || heightValue.endsWith('%') || 
          heightValue.endsWith('em') || heightValue.endsWith('rem') ||
          !isNaN(parseInt(heightValue, 10))) {
        // 如果没有单位，默认添加px
        const height = heightValue.match(/^\d+$/) ? `${heightValue}px` : heightValue;
        customStyle.height = height;
      }
    }
    
    // 检查是否包含对齐标记 [align:left|right]
    const alignMatch = cleanAlt.match(/\[align:(.*?)\]/);
    
    if (alignMatch) {
      const alignValue = alignMatch[1].trim().toLowerCase();
      
      // 移除对齐标记
      cleanAlt = cleanAlt.replace(alignMatch[0], '').trim();
      
      // 处理对齐方式
      if (['left', 'right'].includes(alignValue)) {
        alignClass = `img-${alignValue}`;
      }
    }
    
    // 检查是否包含说明文字标记 [text:文本]
    const textMatch = cleanAlt.match(/\[text:(.*?)\]/);
    
    if (textMatch) {
      captionText = textMatch[1].trim();
      
      // 移除说明文字标记
      cleanAlt = cleanAlt.replace(textMatch[0], '').trim();
    }
    
    // 检查是否只设置了宽度或高度中的一个
    if ((customStyle.width && !customStyle.height) || (!customStyle.width && customStyle.height)) {
      // 设置objectFit为contain，保持原始图片比例
      customStyle.objectFit = 'contain';
    }
    
    return { 
      alt: cleanAlt, 
      classes: `${sizeClass} ${alignClass}`.trim(), 
      style: customStyle,
      caption: captionText
    };
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
    p: ({ children, ...props }: any) => {
      // 检查段落内容是否只包含清除浮动标记
      const text = typeof children === 'string' ? children : '';
      if (text === '[clear]') {
        return <div className="clear-float"></div>;
      }
      
      return <div {...props}>{children}</div>;
    },
    img: ({ node, src, alt, ...props }: any) => {
      // 处理图片路径，使用public目录下的图片
      const imgSrc = src?.startsWith('/') || src?.startsWith('http')
        ? src
        : `/help/images/${src}`;
      
      // 提取图片尺寸信息和说明文字
      const { alt: cleanAlt, classes, style, caption } = extractImageSize(alt || '');
      
      // 处理特殊宽度情况
      const customStyle = { ...style };
      
      // 处理width:100%的情况，确保不溢出
      if (customStyle.width === '100%') {
        customStyle.boxSizing = 'border-box';
        customStyle.marginLeft = 0;
        customStyle.marginRight = 0;
      }
      
      // 合并类名
      const className = `doc-image ${classes}`.trim();
      
      // 如果有说明文字，则创建一个包含图片和说明文字的容器
      if (caption) {
        // 检查是否有对齐类
        const isLeftAligned = classes.includes('img-left');
        const isRightAligned = classes.includes('img-right');
        const isFullWidth = classes.includes('img-full') || customStyle.width === '100%';
        
        // 创建figure类名，如果有对齐方式，添加对应的类
        const figureClassName = `image-figure ${isLeftAligned ? 'img-left' : ''} ${isRightAligned ? 'img-right' : ''} ${isFullWidth ? 'img-full' : ''}`.trim();
        
        // 如果图片设置了对齐，从图片类中移除对齐类，避免重复对齐
        const imgClassName = className
          .replace('img-left', '')
          .replace('img-right', '')
          .trim();
        
        return (
          <>
            <figure className={figureClassName} style={isFullWidth ? { width: '100%' } : undefined}>
              <img 
                src={imgSrc} 
                alt={cleanAlt} 
                className={imgClassName}
                style={customStyle}
                {...props} 
              />
              <figcaption className="image-caption">{caption}</figcaption>
            </figure>
          </>
        );
      }
      
      // 没有说明文字，直接返回图片
      return <img 
        src={imgSrc} 
        alt={cleanAlt} 
        className={className}
        style={customStyle}
        {...props} 
      />;
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
        activeHeadingId={activeHeadingId}
      />
    </div>
  );
} 