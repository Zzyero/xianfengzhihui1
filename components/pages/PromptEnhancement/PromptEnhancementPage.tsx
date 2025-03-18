"use client";
/**
 * 提示词增强页面组件
 * 该组件整合了聊天界面、模板管理、模型选择等功能
 * 用于提供一个完整的AI对话和提示词管理体验
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ChatWindow from './ChatInterface/ChatWindow';
import MessageInput from './ChatInterface/MessageInput';
import TemplateBar from './TemplateManagement/TemplateBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import './styles/PromptEnhancement.css';
import { Toaster } from "sonner";
import db from './service/db';
// 导入模型选择器组件
import ChangeModel from "./ModelManagement/ChangeModel";
// 在 PromptEnhancementPage.tsx 中添加导入导出组件
// 在 import 部分添加
import ExportData from './Data/DataTransfer';
// 导入自定义钩子
import {useMessages,useSessions,useTemplates,useApplicationInit,useInput} from './hooks/index';
import HistorySidebarControl from './ChatInterface/HistorySidebarControl';
const PromptEnhancementPage: React.FC = () => {
  // ===== 状态和模型选择 =====
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  // 创建模型选择的处理函数，保存最后使用的模型ID
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    // 保存最后使用的模型ID到数据库
    db.saveLastUsedModelId(modelId)
      .then(() => {
        console.log(`已保存最后使用的模型ID: ${modelId}`);
      })
      .catch(error => {
        console.error('保存模型ID失败:', error);
      });
  }, []);
  
  // 使用自定义钩子
  const templates = useTemplates();
  
  const sessions = useSessions(
    setMessages,
    isGenerating,
    setIsGenerating,
    templates.setActiveTemplateId,
    templates.setCustomPrompt
  );
  
  const messagesHook = useMessages(
    sessions.activeSessionId,
    sessions.setActiveSessionId,
    selectedModel,
    sessions.loadSessions,
    templates.activeTemplateId,
    templates.customPrompt
  );
  
  const input = useInput();
  
  const appInit = useApplicationInit(
    sessions.loadSessions,
    templates.loadTemplates,
    sessions.createNewSession,
    sessions.setActiveSessionId,
    messagesHook.loadSessionMessages,
    messagesHook.setMessages,
    setSelectedModel
  );

  // 使用钩子返回的状态更新组件状态
  useEffect(() => {
    setMessages(messagesHook.messages);
    setIsLoading(appInit.isLoading);
    setIsGenerating(messagesHook.isGenerating);
  }, [messagesHook.messages, appInit.isLoading, messagesHook.isGenerating]);

  // 当选择会话时加载消息
  useEffect(() => {
    if (sessions.activeSessionId) {
      messagesHook.loadSessionMessages(sessions.activeSessionId);
    }
  }, [sessions.activeSessionId]);

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
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                />
              </div>
              
              {/* 右侧控制按钮 */}
              <div className="flex items-center gap-2">
                {/* 导入导出按钮 */}
                <ExportData />
                
                {/* 历史和新建按钮 */}
                <HistorySidebarControl
                  isOpen={sidebarOpen}
                  setIsOpen={setSidebarOpen}
                  sessions={sessions.chatSessions}
                  onSelectSession={sessions.handleSelectSession}
                  activeSessionId={sessions.activeSessionId}
                  onNewChat={sessions.handleNewChat}
                />
              </div>
            </div>
            {/* 聊天窗口 */}
            <div className="chat-window-container">
              <ChatWindow 
                messages={messagesHook.messages}
                isTyping={messagesHook.isGenerating}
                onNewChat={sessions.handleNewChat}
                className="chat-window"
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sessions={sessions.chatSessions}
                onSelectSession={sessions.handleSelectSession}
                activeSessionId={sessions.activeSessionId}
              />
            </div>
              {/* 输入窗口 */}
            <div className="input-container">
              <Card>
                <MessageInput
                  onSend={messagesHook.handleSendMessage}
                  onStop={messagesHook.handleStopGeneration}
                  isGenerating={messagesHook.isGenerating}
                  onResize={input.handleInputResize}
                />
              </Card>
            </div>

               {/* 模板栏 */}
            <div className="template-bar-container">
              <TemplateBar 
                onAddTemplate={templates.handleAddTemplate} 
                templates={templates.templates}
                onUseTemplate={templates.handleUseTemplate}
                activeTemplateId={templates.activeTemplateId}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
};

export default PromptEnhancementPage; 
