"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ChatWindow from './ChatInterface/ChatWindow';
import MessageInput from './ChatInterface/MessageInput';
import TemplateBar from './TemplateManagement/TemplateBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChangeModel from "./ModelManagement/ChangeModel";
import './styles/PromptEnhancement.css';
// 导入数据库和服务类
import db, { Message, ChatSession, Template } from './server/db';
import MessageService from './server/messageService';
import { Toaster, toast } from "sonner";

/**
 * 提示词增强页面组件
 * 该组件整合了聊天界面、模板管理、模型选择等功能
 * 用于提供一个完整的AI对话和提示词管理体验
 */
const PromptEnhancementPage: React.FC = () => {
  // ===== 状态管理 =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [isAddTemplateDialogOpen, setIsAddTemplateDialogOpen] = useState<boolean>(false);
  const [newTemplate, setNewTemplate] = useState<Template>({ id: '', name: '', content: '' });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [inputHeight, setInputHeight] = useState<number>(56);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * 处理发送消息
   * @param content 要发送的消息内容
   */
  const handleSendMessage = async (content: string): Promise<void> => {
    // 设置生成状态
    setIsGenerating(true);

    // 调用消息服务发送消息
    MessageService.sendMessage(
      content,
      activeSessionId,
      selectedModel,
      {
        // 当用户消息保存完成
        onUserMessageSaved: (userMessage) => {
          setMessages(prev => [...prev, userMessage]);
        },
        // 当AI回复内容更新（流式输出）
        onAiMessageUpdate: (partialMessage) => {
          setMessages(prev => {
            // 检查是否已存在此ID的消息
            const existingIndex = prev.findIndex(m => m.id === partialMessage.id);
            
            if (existingIndex >= 0) {
              // 更新现有消息
              const newMessages = [...prev];
              newMessages[existingIndex] = {
                ...newMessages[existingIndex],
                content: partialMessage.content
              };
              return newMessages;
            } else {
              // 添加新消息
              return [...prev, {
                id: partialMessage.id || Date.now().toString(), // 确保ID不为undefined
                sessionId: partialMessage.sessionId || activeSessionId || '',
                role: 'assistant' as const,
                content: partialMessage.content || '',
                timestamp: new Date()
              }];
            }
          });
        },
        // 当AI回复完成
        onAiMessageComplete: () => {
          setIsGenerating(false);
        },
        // 当会话更新
        onSessionUpdated: () => {
          loadSessions();
        },
        // 当发生错误
        onError: (error) => {
          console.error('消息服务错误:', error);
          toast.error(error.message || '发送消息失败');
          setIsGenerating(false);
        }
      }
    ).catch(error => {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败');
      setIsGenerating(false);
    });
  };

  /**
   * 加载聊天会话列表
   */
  const loadSessions = async () => {
    try {
      const sessions = await MessageService.loadSessions();
      setChatSessions(sessions);
      return sessions;
    } catch (error) {
      console.error('加载会话失败:', error);
      toast.error('加载会话列表失败');
      return [];
    }
  };

  /**
   * 加载会话消息
   * @param sessionId 会话ID
   */
  const loadSessionMessages = async (sessionId: string) => {
    try {
      const messages = await MessageService.loadSessionMessages(sessionId);
      setMessages(messages);
    } catch (error) {
      console.error('加载消息失败:', error);
      toast.error('加载消息失败');
    }
  };

  /**
   * 创建新会话
   * @param title 会话标题，可选
   * @param firstMessage 首条消息内容，可选
   */
  const createNewSession = async (title?: string, firstMessage?: string): Promise<string | undefined> => {
    try {
      const sessionId = await MessageService.createNewSession(firstMessage, title);
      setActiveSessionId(sessionId);
      setMessages([]);
      await loadSessions();
      return sessionId;
    } catch (error) {
      console.error('创建会话失败:', error);
      toast.error('创建新对话失败');
      return undefined;
    }
  };

  /**
   * 停止生成回复
   */
  const handleStopGeneration = (): void => {
    setIsGenerating(false);
    // 注意：目前还没有实现真正的取消流式输出的功能
    toast.info('已停止生成回复');
  };

  /**
   * 处理添加模板
   */
  const handleAddTemplate = (): void => {
    setIsAddTemplateDialogOpen(true);
  };

  /**
   * 保存新模板
   */
  const handleSaveTemplate = async (): Promise<void> => {
    try {
      // 生成ID
      const templateToSave: Template = {
        ...newTemplate,
        id: newTemplate.id || Date.now().toString()
      };
      
      // 保存模板到数据库
      await db.saveTemplate(templateToSave);
      
      // 重新加载模板列表
      loadTemplates();
      
      // 关闭对话框并重置状态
      setIsAddTemplateDialogOpen(false);
      setNewTemplate({ id: '', name: '', content: '' });
      
      toast.success('模板保存成功');
    } catch (error) {
      console.error('保存模板失败:', error);
      toast.error('保存模板失败');
    }
  };
  
  /**
   * 使用模板
   * @param template 要使用的模板
   */
  const handleUseTemplate = (template: Template): void => {
    handleSendMessage(template.content);
  };
  
  /**
   * 加载模板列表
   */
  const loadTemplates = async (): Promise<void> => {
    try {
      const loadedTemplates = await db.getAllTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('加载模板失败:', error);
      toast.error('加载模板失败');
    }
  };

  /**
   * 开始新的对话
   */
  const handleNewChat = async (): Promise<void> => {
    // 检查当前会话是否有消息
    if (activeSessionId) {
      try {
        const currentMessages = await MessageService.loadSessionMessages(activeSessionId);
        
        // 如果当前会话没有消息，直接使用当前会话
        if (currentMessages.length === 0) {
          return;
        }
        
        // 否则，创建新会话
        await createNewSession();
      } catch (error) {
        console.error('检查会话消息失败:', error);
        // 出错时尝试创建新会话
        await createNewSession();
      }
    } else {
      // 如果没有活动会话，直接创建新会话
      await createNewSession();
    }
  };

  /**
   * 处理输入框大小调整
   * @param height 新的高度值
   */
  const handleInputResize = (height: number): void => {
    setInputHeight(height);
  };

  /**
   * 处理会话选择
   * @param sessionId 会话ID
   */
  const handleSelectSession = (sessionId: string): void => {
    setActiveSessionId(sessionId);
  };

  // 组件初始化时确保数据库已初始化和加载会话数据
  useEffect(() => {
    const initApplication = async () => {
      setIsLoading(true);
      try {
        // 确保数据库初始化
        await db.initDefaultModels();
        
        // 加载API模型列表
        const apiModels = await db.getAllModels('api');
        if (apiModels.length > 0) {
          // 使用第一个API模型作为默认
          setSelectedModel(apiModels[0].id);
        } else {
          // 尝试加载本地模型
          const localModels = await db.getAllModels('local');
          if (localModels.length > 0) {
            setSelectedModel(localModels[0].id);
          }
        }
        
        // 加载会话列表
        const sessions = await loadSessions();
        
        // 加载模板列表
        await loadTemplates();
        
        // 如果有会话，加载最近的一个会话
        if (sessions.length > 0) {
          // 按时间戳排序，获取最新的会话
          const sortedSessions = [...sessions].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          const latestSessionId = sortedSessions[0].id;
          setActiveSessionId(latestSessionId);
          await loadSessionMessages(latestSessionId);
        } else {
          // 如果没有会话，创建一个新会话
          await createNewSession("新对话");
        }
      } catch (error) {
        console.error('应用初始化失败:', error);
        toast.error('初始化应用失败，请刷新页面重试');
      } finally {
        setIsLoading(false);
      }
    };
    
    initApplication();
  }, []);
  
  // 当选择会话时加载消息
  useEffect(() => {
    if (activeSessionId) {
      loadSessionMessages(activeSessionId);
    }
  }, [activeSessionId]);

  return (
    <div className="prompt-enhancement-container">
      <Toaster position="top-center" />
      <div className="main-content">
        <Card className="chat-card">
          <CardContent className="chat-card-content">
            <ChangeModel 
              selectedModel={selectedModel} 
              setSelectedModel={setSelectedModel} 
            />
            <div className="chat-window-container">
              {isLoading ? (
                <div className="loading-indicator">加载中...</div>
              ) : (
                <ChatWindow 
                  messages={messages}
                  isTyping={isGenerating}
                  sessions={chatSessions}
                  onSelectSession={handleSelectSession}
                  activeSessionId={activeSessionId}
                  onNewChat={handleNewChat}
                  className="chat-window"
                />
              )}
            </div>

            <div className="input-container">
              <Card>
                <MessageInput
                  onSend={handleSendMessage}
                  onStop={handleStopGeneration}
                  isGenerating={isGenerating}
                  onResize={handleInputResize}
                />
              </Card>
            </div>

            <div className="template-bar-container">
              <TemplateBar 
                onAddTemplate={handleAddTemplate} 
                templates={templates}
                onUseTemplate={handleUseTemplate}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 添加模板对话框 */}
      <Dialog open={isAddTemplateDialogOpen} onOpenChange={setIsAddTemplateDialogOpen}>
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
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="content" className="text-right">
                模板内容
              </label>
              <Textarea
                id="content"
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                className="col-span-3"
                rows={5}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAddTemplateDialogOpen(false)}>
              取消
            </Button>
            <Button type="submit" onClick={handleSaveTemplate}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptEnhancementPage; 