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

const PromptEnhancementPage: React.FC = () => {
  // ===== 状态和模型选择 =====
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
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
        {/* 添加模型选择器到页面右上角 */}

        
        <Card className="chat-card">
          <CardContent className="chat-card-content">
            <div className="flex items-center justify-end gap-2">
              <ExportData />
              <ChangeModel 
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
              />
            </div>
            <div className="chat-window-container">
              {(
                <ChatWindow 
                  messages={messagesHook.messages}
                  isTyping={messagesHook.isGenerating}
                  sessions={sessions.chatSessions}
                  onSelectSession={sessions.handleSelectSession}
                  activeSessionId={sessions.activeSessionId}
                  onNewChat={sessions.handleNewChat}
                  className="chat-window"
                />
              )}
            </div>
              
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
      
      {/* 添加模板对话框 */}
      <Dialog open={templates.isAddTemplateDialogOpen} onOpenChange={templates.setIsAddTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>添加提示词模板</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                模板名称
              </label>
              <Input
                id="name"
                value={templates.newTemplate.name}
                onChange={(e) => templates.setNewTemplate({...templates.newTemplate, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="content" className="text-right">
                模板内容
              </label>
              <Textarea
                id="content"
                value={templates.newTemplate.content}
                onChange={(e) => templates.setNewTemplate({...templates.newTemplate, content: e.target.value})}
                className="col-span-3"
                rows={5}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => templates.setIsAddTemplateDialogOpen(false)}>
              取消
            </Button>
            <Button type="submit" onClick={templates.handleSaveTemplate}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptEnhancementPage; 