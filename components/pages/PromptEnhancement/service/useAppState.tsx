"use client";
import { useState, useEffect, createContext, useContext } from 'react';
import { Message, Template, ChatSession } from './db';
import db from './db';
import ChatService from './chatService';
import { toast } from "sonner";

// 定义应用状态类型
interface AppState {
  // 会话相关
  chatSessions: ChatSession[];
  activeSessionId: string | undefined;
  
  // 消息相关
  messages: Message[];
  isGenerating: boolean;
  
  // 模板相关
  templates: Template[];
  activeTemplateId: string | null;
  customPrompt: string;
  isAddTemplateDialogOpen: boolean;
  newTemplate: Template;
  
  // 输入相关
  inputHeight: number;
  
  // 模型相关
  selectedModel: string;
  
  // 历史记录控制
  isDisableHistory: boolean;
  
  // 应用状态
  isLoading: boolean;
  sidebarOpen: boolean;
}

// 创建上下文
const AppStateContext = createContext<{
  state: AppState;
  actions: {
    // 会话操作
    loadSessions: () => Promise<ChatSession[]>;
    setActiveSessionId: (id: string | undefined) => void;
    createNewSession: (title?: string, firstMessage?: string) => Promise<string | undefined>;
    handleNewChat: () => Promise<void>;
    handleSelectSession: (sessionId: string) => Promise<void>;
    
    // 消息操作
    loadSessionMessages: (sessionId: string) => Promise<void>;
    handleSendMessage: (content: string) => Promise<void>;
    handleStopGeneration: () => void;
    
    // 模板操作
    loadTemplates: () => Promise<void>;
    handleAddTemplate: () => void;
    handleSaveTemplate: () => Promise<void>;
    handleUseTemplate: (template: Template) => void;
    setNewTemplate: React.Dispatch<React.SetStateAction<Template>>;
    setCustomPrompt: React.Dispatch<React.SetStateAction<string>>;
    setIsAddTemplateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
    
    // 模型操作
    handleModelChange: (modelId: string) => void;
    
    // 历史记录控制
    toggleDisableHistory: () => void;
    
    // 输入操作
    handleInputResize: (height: number) => void;
    
    // UI操作
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  };
}>({
  state: {
    chatSessions: [],
    activeSessionId: undefined,
    messages: [],
    isGenerating: false,
    templates: [],
    activeTemplateId: null,
    customPrompt: '',
    isAddTemplateDialogOpen: false,
    newTemplate: { id: '', name: '', content: '' },
    inputHeight: 56,
    selectedModel: '',
    isDisableHistory: false,
    isLoading: true,
    sidebarOpen: false
  },
  actions: {
    // 会话操作
    loadSessions: async () => [],
    setActiveSessionId: () => {},
    createNewSession: async () => undefined,
    handleNewChat: async () => {},
    handleSelectSession: async () => {},
    
    // 消息操作
    loadSessionMessages: async () => {},
    handleSendMessage: async () => {},
    handleStopGeneration: () => {},
    
    // 模板操作
    loadTemplates: async () => {},
    handleAddTemplate: () => {},
    handleSaveTemplate: async () => {},
    handleUseTemplate: () => {},
    setNewTemplate: () => {},
    setCustomPrompt: () => {},
    setIsAddTemplateDialogOpen: () => {},
    
    // 模型操作
    handleModelChange: () => {},
    
    // 历史记录控制
    toggleDisableHistory: () => {},
    
    // 输入操作
    handleInputResize: () => {},
    
    // UI操作
    setSidebarOpen: () => {}
  }
});

/**
 * 提供应用状态的Provider组件
 */
export const AppStateProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // ===== 状态定义 =====
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isAddTemplateDialogOpen, setIsAddTemplateDialogOpen] = useState<boolean>(false);
  const [newTemplate, setNewTemplate] = useState<Template>({ id: '', name: '', content: '' });
  const [inputHeight, setInputHeight] = useState<number>(56);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isDisableHistory, setIsDisableHistory] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // ===== 会话操作 =====
  /**
   * 加载聊天会话列表
   */
  const loadSessions = async (): Promise<ChatSession[]> => {
    try {
      const sessions = await ChatService.loadSessions();
      setChatSessions(sessions);
      return sessions;
    } catch (error) {
      console.error('加载会话失败:', error);
      toast.error('加载会话列表失败');
      return [];
    }
  };

  /**
   * 创建新会话
   */
  const createNewSession = async (title?: string, firstMessage?: string): Promise<string | undefined> => {
    try {
      // 创建一个新的会话ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // 创建会话对象
      const newSession: ChatSession = {
        id: sessionId,
        title: title || "新对话",
        lastMessage: firstMessage || "",
        timestamp: new Date(),
        messageCount: firstMessage ? 1 : 0,
        starred: false
      };
      
      // 保存会话到数据库
      await db.saveSession(newSession);
      
      // 如果有初始消息，保存到数据库
      if (firstMessage) {
        const userMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          sessionId: sessionId,
          role: 'user',
          content: firstMessage,
          timestamp: new Date()
        };
        await db.addMessage(userMessage);
      }
      
      // 更新会话列表
      await loadSessions();
      
      // 设置活动会话ID
      setActiveSessionId(sessionId);
      
      // 保存最后使用的会话ID
      await db.saveLastUsedSessionId(sessionId);
      
      return sessionId;
    } catch (error) {
      console.error('创建会话失败:', error);
      toast.error('创建新对话失败');
      return undefined;
    }
  };

  /**
   * 开始新的对话
   */
  const handleNewChat = async (): Promise<void> => {
    // 如果正在生成，先取消当前的生成
    if (isGenerating && activeSessionId) {
      ChatService.abortRequest();
      setIsGenerating(false);
    }
    
    // 创建新会话并保存到数据库
    try {
      const newSessionId = await createNewSession("新对话");
      
      if (newSessionId) {
        // 重置消息列表
        setMessages([]);
        
        // 重置模板相关状态
        setActiveTemplateId(null);
        setCustomPrompt('');
        
        toast.info('已创建新对话');
      }
    } catch (error) {
      console.error('创建新对话失败:', error);
      toast.error('创建新对话失败');
    }
  };

  /**
   * 处理会话选择
   */
  const handleSelectSession = async (sessionId: string): Promise<void> => {
    // 如果正在生成，先取消当前的生成
    if (isGenerating && activeSessionId) {
      ChatService.abortRequest();
      setIsGenerating(false);
    }

    // 如果会话ID为空，创建新会话
    if (!sessionId) {
      await handleNewChat();
      return;
    }
    
    // 设置新的活动会话ID
    setActiveSessionId(sessionId);
    // 保存最后使用的会话ID到数据库
    db.saveLastUsedSessionId(sessionId);
    // 加载会话消息
    await loadSessionMessages(sessionId);
    // 重置模板状态
    setActiveTemplateId(null);
    setCustomPrompt('');
  };

  // ===== 历史记录控制 =====
  /**
   * 切换禁用历史记录状态
   */
  const toggleDisableHistory = (): void => {
    const newValue = !isDisableHistory;
    setIsDisableHistory(newValue);
    if (newValue) {
      toast.success('启用单轮对话，AI只能看到当前消息');
    } else {
      toast.info('启用多轮对话，AI能看到完整对话内容');
    }
  };

  // ===== 消息操作 =====
  /**
   * 加载会话消息
   */
  const loadSessionMessages = async (sessionId: string): Promise<void> => {
    try {
      const sessionMessages = await ChatService.loadSessionMessages(sessionId);
      setMessages(sessionMessages);
    } catch (error) {
      console.error('加载消息失败:', error);
      toast.error('加载消息失败');
    }
  };
  
  /**
   * 处理发送消息
   */
  const handleSendMessage = async (content: string): Promise<void> => {
    if (!content.trim()) return;
    
    try {
      setIsGenerating(true);
      
      // 对于临时会话，创建并保存新会话
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        // 创建新会话并保存到数据库
        const newSessionId = await createNewSession("新对话", content);
        if (newSessionId) {
          setActiveSessionId(newSessionId);
          currentSessionId = newSessionId;
        } else {
          // 创建失败，中止操作
          setIsGenerating(false);
          return;
        }
      }
      
      // 使用ChatService处理消息发送
      await ChatService.sendMessage(
        content,
        currentSessionId,
        selectedModel || '', // 使用当前选定的模型，若未选择则使用空字符串
        {
          // 用户消息保存成功回调
          onUserMessageSaved: (message) => {
            setMessages(prev => [...prev, message]);
          },
          // AI回复开始生成回调
          onStart: () => {
            setIsGenerating(true);
          },
          // AI回复内容更新回调
          onUpdate: (content, messageId, sessionId, metadata) => {
            // 更新临时会话ID为服务端返回的会话ID
            if (sessionId !== activeSessionId) {
              setActiveSessionId(sessionId);
            }
            
            // 处理消息更新，根据是否已存在该消息ID来新增或更新
            setMessages(prev => {
              const existingMsgIndex = prev.findIndex(m => m.id === messageId);
              if (existingMsgIndex >= 0) {
                // 更新已有消息
                const updatedMessages = [...prev];
                updatedMessages[existingMsgIndex] = {
                  ...updatedMessages[existingMsgIndex],
                  content,
                  reasoningContent: metadata?.reasoning
                };
                return updatedMessages;
              } else {
                // 添加新消息
                return [...prev, {
                  id: messageId,
                  sessionId: sessionId,
                  role: 'assistant',
                  content,
                  reasoningContent: metadata?.reasoning,
                  timestamp: new Date()
                }];
              }
            });
          },
          // AI回复完成回调
          onComplete: (message) => {
            setIsGenerating(false);
            // 更新消息列表（替换最终版本）
            setMessages(prev => {
              const existingMsgIndex = prev.findIndex(m => m.id === message.id);
              if (existingMsgIndex >= 0) {
                const updatedMessages = [...prev];
                updatedMessages[existingMsgIndex] = message;
                return updatedMessages;
              }
              return [...prev, message];
            });
          },
          // 错误回调
          onError: (error) => {
            console.error('聊天错误:', error);
            setIsGenerating(false);
            toast.error(`发送消息失败: ${error.message}`);
          },
          // 会话更新回调
          onSessionUpdated: async () => {
            // 重新加载会话列表以获取最新状态
            await loadSessions();
          }
        },
        // 传递自定义提示词
        customPrompt,
        // 传递历史记录禁用状态
        isDisableHistory
      );
    } catch (error: any) {
      console.error('发送消息失败:', error);
      setIsGenerating(false);
      toast.error(`发送消息失败: ${error.message || '未知错误'}`);
    }
  };

  /**
   * 停止生成回复
   */
  const handleStopGeneration = (): void => {
    if (!activeSessionId) return;
    ChatService.abortRequest();
    setIsGenerating(false);
    toast.success('AI生成请求已取消');
  };

  // ===== 模板操作 =====
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
   * 处理使用模板
   */
  const handleUseTemplate = (template: Template): void => {
    // 如果当前模板已经被选中，就取消选中并重置自定义提示词
    if (activeTemplateId === template.id) {
      setActiveTemplateId(null);
      setCustomPrompt('');
      toast.info(`已取消模板: ${template.name}`);
      // 取消选中时清除存储的模板ID
      db.saveLastUsedTemplateId('')
        .catch(error => {
          console.error('保存模板ID失败:', error);
        });
    } else {
      // 选中新模板，设置自定义提示词
      setActiveTemplateId(template.id);
      setCustomPrompt(template.content);
      toast.success(`已应用模板: ${template.name}`);
      // 保存最后使用的模板ID到数据库
      db.saveLastUsedTemplateId(template.id)
        .then(() => {
          console.log(`已保存最后使用的模板ID: ${template.id}`);
        })
        .catch(error => {
          console.error('保存模板ID失败:', error);
        });
    }
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

  // ===== 模型操作 =====
  /**
   * 处理模型选择
   */
  const handleModelChange = (modelID: string): void => {
    setSelectedModel(modelID);
    // 保存最后使用的模型ID到数据库
    db.saveLastUsedModelId(modelID)
      .then(() => {
        console.log(`已保存最后使用的模型ID: ${modelID}`);
      })
      .catch(error => {
        console.error('保存模型ID失败:', error);
      });
  };

  // ===== 输入操作 =====
  /**
   * 处理输入框大小调整
   */
  const handleInputResize = (height: number): void => {
    setInputHeight(height);
  };

  // ===== 应用初始化 =====
  useEffect(() => {
    const initApplication = async () => {
      setIsLoading(true);
      try {
        // 确保数据库初始化
        await db.init();
        
        // 尝试获取最后使用的模型ID
        const lastUsedModelId = await db.getLastUsedModelId();
        const models = await db.getAllModels();
        if (lastUsedModelId) {
          // 如果有最后使用的模型ID，直接使用它
          setSelectedModel(lastUsedModelId);
          console.log(`使用上次选择的模型: ${models.find(m => m.id === lastUsedModelId)?.name}`);
        } else {
          // 如果没有最后使用的模型ID，使用API模型列表中的第一个
          const apiModels = await db.getAllModels('api');
          if (apiModels.length > 0) {
            // 使用第一个API模型作为默认
            setSelectedModel(apiModels[0].id);
            // 保存为最后使用的模型
            await db.saveLastUsedModelId(apiModels[0].id);
          }
        }
        
        // 加载会话列表
        const sessions = await loadSessions();
        
        // 加载模板列表
        await loadTemplates();
        
        // 获取最后使用的会话ID,如果没有找最新会话
        const lastUsedSessionId = await db.getLastUsedSessionId();
        if (lastUsedSessionId) {
          // 如果有最后使用的会话ID，直接使用它
          setActiveSessionId(lastUsedSessionId);
          console.log(`回到上次选择的会话: ${lastUsedSessionId}`);
          // 加载该会话的消息
          await loadSessionMessages(lastUsedSessionId);
        }
        else if (sessions.length > 0) {
          // 按时间戳排序，获取最新的会话
          const sortedSessions = [...sessions].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          // 获取最新会话ID
          const latestSessionId = sortedSessions[0].id;
          setActiveSessionId(latestSessionId);
          await loadSessionMessages(latestSessionId);
        } else {
          // 如果没有会话，创建一个新会话并保存到数据库
          const newSessionId = await createNewSession("新对话");
          if (newSessionId) {
            setActiveSessionId(newSessionId);
            setMessages([]);
            console.log(`创建初始会话: ${newSessionId}`);
          }
        }

        // 获取最后使用的模板
        const lastUsedTemplateId = await db.getLastUsedTemplateId();
        if(lastUsedTemplateId){
          setActiveTemplateId(lastUsedTemplateId);
          // 查找并设置对应模板内容
          const templateList = await db.getAllTemplates();
          const template = templateList.find(t => t.id === lastUsedTemplateId);
          if (template) {
            setCustomPrompt(template.content);
            console.log(`已加载上次使用的模板: ${template.name}`);
          } else {
            // 如果找不到对应模板（可能已被删除），清除选中状态
            setActiveTemplateId(null);
            db.saveLastUsedTemplateId('').catch(console.error);
          }
        } else {
          setActiveTemplateId(null);
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

  // 提供统一的状态和动作
  const value = {
    state: {
      chatSessions,
      activeSessionId,
      messages,
      isGenerating,
      templates,
      activeTemplateId,
      customPrompt,
      isAddTemplateDialogOpen,
      newTemplate,
      inputHeight,
      selectedModel,
      isDisableHistory,
      isLoading,
      sidebarOpen
    },
    actions: {
      loadSessions,
      setActiveSessionId,
      createNewSession,
      handleNewChat,
      handleSelectSession,
      loadSessionMessages,
      handleSendMessage,
      handleStopGeneration,
      loadTemplates,
      handleAddTemplate,
      handleSaveTemplate,
      handleUseTemplate,
      setNewTemplate,
      setCustomPrompt,
      setIsAddTemplateDialogOpen,
      handleModelChange,
      toggleDisableHistory,
      handleInputResize,
      setSidebarOpen
    }
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

/**
 * 使用应用状态的钩子
 * 提供对全局状态和操作的访问
 */
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}; 