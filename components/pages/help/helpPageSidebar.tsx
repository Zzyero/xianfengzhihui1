'use client';

import React, { useState, useEffect } from 'react';
import './helpPageSidebar.css';

/**
 * 文档内容标题类型
 */
interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * 帮助页面侧边栏组件
 * @param props 组件属性
 * @returns 侧边栏组件
 */
export function HelpPageSidebar({
  headings,
  onHeadingClick
}: {
  headings: Heading[];
  onHeadingClick: (headingId: string) => void;
}) {
  // 折叠状态 (headingId -> isCollapsed)
  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>({});

  // 当前活跃的标题ID
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  // 从localStorage加载折叠状态
  useEffect(() => {
    try {
      const storedState = localStorage.getItem(`helpSidebar_state`);
      if (storedState) {
        setCollapsedState(JSON.parse(storedState));
      } else {
        setCollapsedState({});
      }
    } catch (error) {
      console.error('加载导航折叠状态失败', error);
      setCollapsedState({});
    }
  }, []);

  /**
   * 切换标题的折叠状态
   */
  const toggleHeadingCollapse = (headingId: string) => {
    setCollapsedState(prev => {
      const newState = {
        ...prev,
        [headingId]: !prev[headingId]
      };
      
      // 保存到localStorage
      localStorage.setItem(`helpSidebar_state`, JSON.stringify(newState));
      
      return newState;
    });
  };

  /**
   * 处理标题点击
   */
  const handleHeadingItemClick = (headingId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setActiveHeadingId(headingId);
    onHeadingClick(headingId);
  };

  /**
   * 检查标题是否有子标题
   */
  const hasChildren = (index: number, level: number) => {
    // 检查下一个标题是否存在，且其级别比当前标题深
    return index < headings.length - 1 && headings[index + 1].level > level;
  };

  /**
   * 获取标题的子标题索引范围
   */
  const getChildrenRange = (startIndex: number, level: number) => {
    let endIndex = startIndex;
    
    // 遍历后续标题，直到找到同级或更高级别的标题
    for (let i = startIndex + 1; i < headings.length; i++) {
      if (headings[i].level <= level) {
        break;
      }
      endIndex = i;
    }
    
    return { startIndex: startIndex + 1, endIndex };
  };

  /**
   * 递归渲染标题及其子标题
   */
  const renderHeadings = (startIndex: number, endIndex: number, level: number) => {
    const items = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
      const heading = headings[i];
      
      // 只处理当前级别的标题
      if (heading.level !== level) continue;
      
      const headingHasChildren = hasChildren(i, heading.level);
      const isCollapsed = collapsedState[heading.id] || false;
      
      if (headingHasChildren) {
        // 计算子标题范围
        const { startIndex: childStartIndex, endIndex: childEndIndex } = 
          getChildrenRange(i, heading.level);
        
        items.push(
          <li key={heading.id} className={`heading-item-container level-${heading.level}`}>
            <div 
              className={`heading-item-wrapper ${headingHasChildren ? 'with-children' : ''}`}
              onClick={headingHasChildren ? () => toggleHeadingCollapse(heading.id) : undefined}
            >
              <span 
                className={`heading-item ${activeHeadingId === heading.id ? 'active' : ''}`}
                onClick={(e) => handleHeadingItemClick(heading.id, e)}
              >
                {heading.text}
              </span>
              
              {headingHasChildren && (
                <span className={`collapse-icon ${isCollapsed ? 'collapsed' : ''}`}>
                  ▼
                </span>
              )}
            </div>
            
            {headingHasChildren && (
              <div className={`heading-children ${isCollapsed ? 'collapsed' : ''}`}>
                <ul className="headings-list">
                  {/* 递归渲染所有子级 */}
                  {renderHeadings(childStartIndex, childEndIndex, heading.level + 1)}
                </ul>
              </div>
            )}
          </li>
        );
      } else {
        // 没有子标题的简单项
        items.push(
          <li key={heading.id} className={`heading-item-container level-${heading.level}`}>
            <div className="heading-item-wrapper">
              <span 
                className={`heading-item ${activeHeadingId === heading.id ? 'active' : ''}`}
                onClick={() => handleHeadingItemClick(heading.id)}
              >
                {heading.text}
              </span>
            </div>
          </li>
        );
      }
    }
    
    return items;
  };

  return (
    <aside className="help-sidebar">
      {/* 内容导航 */}
      <div className="content-navigation">
        <h3 className="nav-title">文档导航</h3>
        <nav>
          <ul className="headings-list">
            {headings.length > 0 && renderHeadings(0, headings.length - 1, 1)}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
