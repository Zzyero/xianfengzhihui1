/**
 * 内联加载组件 - 不依赖外部CSS和组件
 */
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const Loading = () => {
  const [tipIndex, setTipIndex] = useState(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const loadingTips = [
    "正在初始化提示词增强页面...",
    "即将完成，请稍候..."
  ];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % loadingTips.length);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // 内联样式
  const styles = {
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      maxWidth: '80%',
    },
    spinner: {
      width: '50px',
      height: '50px',
      border: `4px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
      borderRadius: '50%',
      borderTopColor: '#3b82f6',
      animation: 'spin 1s linear infinite',
      marginBottom: '2rem',
    },
    title: {
      fontSize: '2rem',
      fontWeight: 600,
      color: isDark ? '#f9fafb' : '#1f2937',
      marginBottom: '1rem',
    },
    text: {
      fontSize: '1rem',
      color: isDark ? '#d1d5db' : '#6b7280',
      minHeight: '1.5rem',
      marginBottom: '1.5rem',
    },
    progressContainer: {
      width: '200px',
      height: '6px',
      backgroundColor: isDark ? '#374151' : '#e5e7eb',
      borderRadius: '3px',
      overflow: 'hidden',
      marginTop: '1rem',
    },
    progressBar: {
      height: '100%',
      width: '30%',
      backgroundColor: '#3b82f6',
      borderRadius: '3px',
      animation: 'progress 2s ease-in-out infinite alternate',
    },
  };
  
  // 添加关键帧动画
  const keyframesStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes progress {
      0% { width: 5%; transform: translateX(0); }
      50% { width: 30%; }
      100% { width: 40%; transform: translateX(380%); }
    }
  `;
  
  return (
    <div style={styles.overlay as React.CSSProperties}>
      <style>{keyframesStyle}</style>
      <div style={styles.content as React.CSSProperties}>
        <div style={styles.spinner as React.CSSProperties} />
        <h2 style={styles.title as React.CSSProperties}>提示词增强</h2>
        <p style={styles.text as React.CSSProperties}>{loadingTips[tipIndex]}</p>
        <div style={styles.progressContainer as React.CSSProperties}>
          <div style={styles.progressBar as React.CSSProperties} />
        </div>
      </div>
    </div>
  );
};

export default Loading;
