"use client";
/**
 * 提示词增强页面组件
 * 该组件整合了聊天界面、模板管理、模型选择等功能
 */
// 导入 react
import React, { useEffect, useState } from 'react';
// 导入组件
import { Card, CardContent } from "@/components/ui/card";
import ChatWindow from './ChatInterface/ChatWindow';
import MessageInput from './ChatInterface/MessageInput';
import ExportData from './service/DataTransfer';
import TemplateBar from './TemplateManagement/TemplateBar';
import ChangeModel from "./ModelManagement/ChangeModel";
import DisableHistory from "./ModelManagement/DisableHistory";
import HistorySidebarControl from './ChatInterface/HistorySidebarControl';
import { Toaster } from "sonner";
// 导入样式
import './styles/PromptEnhancement.css';
// 导入自定义钩子
import { AppStateProvider, useAppState } from './service/useAppState';
// 导入加载动画
import Loading from './ChatInterface/Loading';
/**
 * 应用内部组件
 * 使用全局状态管理的内部组件
 */
const PromptEnhancementInner: React.FC<{ isactive: boolean }> = ({ isactive }) => {
  // 使用全局应用状态
  const { state, actions } = useAppState();

  // 当选择会话时加载消息
  useEffect(() => {
    if (state.activeSessionId) {
      actions.loadSessionMessages(state.activeSessionId);
    }
  }, [state.activeSessionId]);

  return (
    <div className={`prompt-enhancement-container ${isactive ? 'active' : ''}`}>
      <div className="main-content">
        <Card className="chat-card">
          <CardContent className="chat-card-content">
            {/* 顶部控制栏 */}
            <div className="control-bar">
              {/* 中间的模型选择器 */}
              <div className="model-selector-container">
                <ChangeModel
                  selectedModel={state.selectedModel}
                  setSelectedModel={actions.handleModelChange}
                />
                
                <DisableHistory />
              </div>

              {/* 右侧控制按钮 */}
              <div className="control-actions">
                {/* 导入导出按钮 */}
                <ExportData />

                {/* 历史和新建按钮 */}
                <HistorySidebarControl
                  isOpen={state.sidebarOpen}
                  setIsOpen={actions.setSidebarOpen}
                  onNewChat={actions.handleNewChat}
                />
              </div>
            </div>

            {/* 聊天窗口 */}
            <div className="chat-window-container">
              <ChatWindow
                messages={state.messages}
                isTyping={state.isGenerating}
                onNewChat={actions.handleNewChat}
                className="chat-window"
                sidebarOpen={state.sidebarOpen}
                setSidebarOpen={actions.setSidebarOpen}
                sessions={state.chatSessions}
                onSelectSession={actions.handleSelectSession}
                activeSessionId={state.activeSessionId}
              />
            </div>

            {/* 输入窗口 */}
            <div className="input-container">
              <Card>
                <MessageInput
                  onSend={actions.handleSendMessage}
                  onStop={actions.handleStopGeneration}
                  isGenerating={state.isGenerating}
                  onResize={actions.handleInputResize}
                />
              </Card>
            </div>

            {/* 模板栏 */}
            <div className="template-bar-container">
              <TemplateBar
                onAddTemplate={actions.handleAddTemplate}
                templates={state.templates}
                onUseTemplate={actions.handleUseTemplate}
                activeTemplateId={state.activeTemplateId}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


/**
 * 主应用组件
 * 使用 AppStateProvider 包装整个应用
 */
const PromptEnhancementPage: React.FC<{ isactive: boolean }> = ({ isactive }) => {
  // 使用组件内的状态，不依赖模块级变量
  const [isLoading, setIsLoading] = useState(true);
  
  // 组件初次挂载和激活状态变化时执行
  useEffect(() => {
      console.log('首次激活提示词增强页面，显示加载动画');
      // 延迟关闭加载动画
      const timer = setTimeout(() => {
        console.log('关闭加载动画');
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  , []);

  return (
    <>
      {/* 内联加载动画 - 只在加载状态显示 */}
      {isLoading && <Loading />}
      
      {/* Toast通知器 */}
      <Toaster position="top-center" />
      
      {/* 主应用内容 */}
      <AppStateProvider>
        <PromptEnhancementInner isactive={isactive} />
      </AppStateProvider>
    </>
  );
};

export default PromptEnhancementPage;