"use client";

import React, { useState, useEffect } from 'react';
import '../styles/Loading.css';

/**
 * 加载页面组件
 * @param {Object} props 组件属性
 * @param {boolean} props.isLoading 是否正在加载
 * @param {React.ReactNode} props.children 子组件
 */
const Loading = ({ isLoading = true, children }) => {
  // 加载提示文字列表
  const loadingTips = [
    "正在初始化提示词增强页面...",
    "即将完成，请稍候..."
  ];
  // 当前显示的提示索引
  const [tipIndex, setTipIndex] = useState(0);
  
  // 定时切换加载提示
  useEffect(() => {
    if (isLoading) {
      const tipTimer = setInterval(() => {
        setTipIndex(prev => (prev + 1) % loadingTips.length);
      }, 500);
      
      return () => clearInterval(tipTimer);
    }
  }, [isLoading, loadingTips.length]);
  
  return (
    <div className="loading-wrapper">
      {/* 渲染子组件*/}
      {children}
      
      {/* 加载覆盖层，仅在isLoading为true时显示 */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            <h2 className="loading-title">提示词增强</h2>
            <p className="loading-text">{loadingTips[tipIndex]}</p>
            <div className="loading-progress">
              <div className="loading-progress-bar"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loading;
