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
// 导入数据库工具类
import db, { Message, ChatSession, Template } from './server/db';
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
  const [inputHeight, setInputHeight] = useState<number>(56);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ===== 数据加载 =====
  
  /**
   * 加载聊天会话列表
   */
  const loadSessions = async () => {
    try {
      const sessions = await db.getAllSessions();
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
      const messages = await db.getMessagesBySession(sessionId);
      setMessages(messages);
    } catch (error) {
      console.error('加载消息失败:', error);
      toast.error('加载消息失败');
    }
  };

  /**
   * 创建新会话
   * @param title 会话标题，可选
   * @param firstMessage 首条消息内容（用于设置默认会话名称），可选
   */
  const createNewSession = async (title?: string, firstMessage?: string): Promise<string | undefined> => {
    try {
      // 生成会话标题
      let sessionTitle: string = '新对话'; // 默认值
      
      if (title) {
        // 如果提供了标题，直接使用
        sessionTitle = title;
      } else if (firstMessage) {
        // 如果没有提供标题但有首条消息，使用首条消息的前15个字符作为标题
        sessionTitle = firstMessage.length > 15 
          ? `${firstMessage.substring(0, 15)}...` 
          : firstMessage;
      }

      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: sessionTitle,
        lastMessage: firstMessage || '',
        timestamp: new Date(),
        messageCount: firstMessage ? 1 : 0
      };

      await db.saveSession(newSession);
      setActiveSessionId(newSession.id);
      setMessages([]);
      await loadSessions();
      return newSession.id;
    } catch (error) {
      console.error('创建会话失败:', error);
      toast.error('创建新对话失败');
      return undefined;
    }
  };

  /**
   * 更新会话信息
   * @param sessionId 会话ID
   * @param lastMessage 最新消息内容
   */
  const updateSessionInfo = async (sessionId: string, lastMessage: string) => {
    try {
      // 获取现有会话
      const session = await db.getSession(sessionId);
      if (!session) return;

      // 更新会话信息
      const updatedSession: ChatSession = {
        ...session,
        lastMessage,
        timestamp: new Date(),
        messageCount: session.messageCount + 1
      };

      await db.saveSession(updatedSession);
      await loadSessions();
    } catch (error) {
      console.error('更新会话信息失败:', error);
    }
  };

  /**
   * 处理发送消息
   * @param message 要发送的消息内容
   */
  const handleSendMessage = async (content: string): Promise<void> => {
    // 确保有活动会话，如果没有则创建一个
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      // 创建新会话并传入首条消息内容作为会话标题
      currentSessionId = await createNewSession(undefined, content);
      if (!currentSessionId) return; // 创建会话失败
    }

    // 创建用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      sessionId: currentSessionId,
      role: 'user',
      content,
      timestamp: new Date()
    };

    try {
      // 保存用户消息到数据库
      await db.addMessage(userMessage);
      // 更新状态
      setMessages(prev => [...prev, userMessage]);
      setIsGenerating(true);
      // 更新会话信息
      await updateSessionInfo(currentSessionId, content);

      // 模拟AI响应
      setTimeout(async () => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          sessionId: currentSessionId,
          role: 'assistant',
          content: `使用 ${selectedModel} 的模拟响应...`,
          timestamp: new Date()
        };

        // 保存AI回复到数据库
        await db.addMessage(aiResponse);
        setMessages(prev => [...prev, aiResponse]);
        setIsGenerating(false);
        // 更新会话信息
        await updateSessionInfo(currentSessionId, aiResponse.content);
      }, 1000);
    } catch (error) {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败');
      setIsGenerating(false);
    }
  };

  /**
   * 停止生成回复
   */
  const handleStopGeneration = (): void => {
    setIsGenerating(false);
  };

  /**
   * 处理添加模板
   */
  const handleAddTemplate = (): void => {
    setIsAddTemplateDialogOpen(true);
  };

  /**
   * 开始新的对话
   */
  const handleNewChat = async (): Promise<void> => {
    // 检查当前会话是否有消息
    if (activeSessionId) {
      try {
        const currentMessages = await db.getMessagesBySession(activeSessionId);
        
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
        
        // 获取默认模型
        const defaultModel = await db.getDefaultModel();
        if (defaultModel) {
          setSelectedModel(defaultModel.id);
        }
        
        // 加载会话列表
        const sessions = await loadSessions();
        
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
              <TemplateBar onAddTemplate={handleAddTemplate} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromptEnhancementPage; 