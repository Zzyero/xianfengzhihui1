"use client";
/**
 * 提示词增强页面组件
 * 该组件整合了聊天界面、模板管理、模型选择等功能
 */
//导入react
import React, { useEffect} from 'react';
//导入组件
import { Card, CardContent } from "@/components/ui/card";
import ChatWindow from './ChatInterface/ChatWindow';
import MessageInput from './ChatInterface/MessageInput';
import ExportData from './service/DataTransfer';
import TemplateBar from './TemplateManagement/TemplateBar';
import ChangeModel from "./ModelManagement/ChangeModel";
import HistorySidebarControl from './ChatInterface/HistorySidebarControl';
import { Toaster } from "sonner";
//导入样式
import './styles/PromptEnhancement.css';
// 导入自定义钩子
import {AppStateProvider,useAppState} from './hooks/index';

/**
 * 应用内部组件
 * 使用全局状态管理的内部组件
 */
const PromptEnhancementInner: React.FC = () => {
  // 使用全局应用状态
  const { state, actions } = useAppState();
  
  // 当选择会话时加载消息
  useEffect(() => {
    if (state.activeSessionId) {
      actions.loadSessionMessages(state.activeSessionId);
    }
  }, [state.activeSessionId]);

  return (
    <div className="prompt-enhancement-container">
      <Toaster position="top-center" />
      <div className="main-content">
        <Card className="chat-card">
          <CardContent className="chat-card-content">
            {/* 顶部控制栏 */}
            <div className="control-bar flex items-center justify-between py-2 px-4 border-b mb-2">
              {/* 中间的模型选择器 */}
              <div className="flex-1 flex justify-center">
                <ChangeModel 
                  selectedModel={state.selectedModel}
                  setSelectedModel={actions.handleModelChange}
                />
              </div>
              
              {/* 右侧控制按钮 */}
              <div className="flex items-center gap-2">
                {/* 导入导出按钮 */}
                <ExportData />
                
                {/* 历史和新建按钮 */}
                <HistorySidebarControl
                  isOpen={state.sidebarOpen}
                  setIsOpen={actions.setSidebarOpen}
                  sessions={state.chatSessions}
                  onSelectSession={actions.handleSelectSession}
                  activeSessionId={state.activeSessionId}
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
 * 使用AppStateProvider包装整个应用
 */
const PromptEnhancementPage: React.FC = () => {
  return (
    <AppStateProvider>
      <PromptEnhancementInner />
    </AppStateProvider>
  );
};

export default PromptEnhancementPage; 
