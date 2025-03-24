import { useState, useEffect, createContext, useContext } from 'react';
import { Message, Template, ChatSession } from '../service/db';
import db from '../service/db';
import MessageService from '../service/messageService';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // ===== 会话操作 =====
  /**
   * 加载聊天会话列表
   */
  const loadSessions = async (): Promise<ChatSession[]> => {
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
   * 创建新会话
   * @param title 会话标题，可选
   * @param firstMessage 首条消息内容，可选
   */
  const createNewSession = async (title?: string, firstMessage?: string): Promise<string | undefined> => {
    try {
      // 创建临时会话ID，不立即保存到数据库
      // 只有当用户发送第一条消息时才真正创建会话
      const tempSessionId = `temp_${Date.now().toString()}`;
      setActiveSessionId(tempSessionId);
      setMessages([]);
      return tempSessionId;
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
      MessageService.cancelGeneration(activeSessionId);
      setIsGenerating(false);
    }
    
    // 创建新的临时会话
    try {
      const tempSessionId = `temp_${Date.now().toString()}`;
      setActiveSessionId(tempSessionId);
      setMessages([]);
      
      // 重置模板相关状态
      setActiveTemplateId(null);
      setCustomPrompt('');
      
      toast.info('请输入内容以开始新对话');
    } catch (error) {
      console.error('创建新对话失败:', error);
      toast.error('创建新对话失败');
    }
  };

  /**
   * 处理会话选择
   * @param sessionId 会话ID
   */
  const handleSelectSession = async (sessionId: string): Promise<void> => {
    // 如果正在生成，先取消当前的生成
    if (isGenerating && activeSessionId) {
      MessageService.cancelGeneration(activeSessionId);
      setIsGenerating(false);
    }
    
    // 设置新的活动会话ID
    setActiveSessionId(sessionId);
    // 保存最后使用的会话ID到数据库
    db.saveLastUsedSessionId(sessionId);
    // 重置模板状态
    setActiveTemplateId(null);
    setCustomPrompt('');
  };

  // ===== 消息操作 =====
  /**
   * 加载会话消息
   * @param sessionId 会话ID
   */
  const loadSessionMessages = async (sessionId: string): Promise<void> => {
    try {
      const sessionMessages = await MessageService.loadSessionMessages(sessionId);
      setMessages(sessionMessages);
    } catch (error) {
      console.error('加载消息失败:', error);
      toast.error('加载消息失败');
    }
  };
  
  /**
   * 处理发送消息
   * @param content 要发送的消息内容
   */
  const handleSendMessage = async (content: string): Promise<void> => {
    // 设置生成状态
    setIsGenerating(true);

    // 检查是否需要创建新会话（对临时会话ID的情况）
    let currentSessionId = activeSessionId;
    if (!currentSessionId || currentSessionId.startsWith('temp_')) {
      try {
        // 使用用户首次输入的内容作为会话名称
        const sessionTitle = content.length > 20
          ? `${content.substring(0, 20)}...`
          : content;
        
        currentSessionId = await MessageService.createNewSession(content, sessionTitle);
        if (!currentSessionId) {
          throw new Error('创建会话失败');
        }
        setActiveSessionId(currentSessionId);
      } catch (error) {
        console.error('创建会话失败:', error);
        toast.error('创建新对话失败');
        setIsGenerating(false);
        return;
      }
    }

    // 调用消息服务发送消息
    MessageService.sendMessage(
      content,
      currentSessionId,
      selectedModel,
      {
        // 当用户消息保存完成
        onUserMessageSaved: (userMessage) => {
          setMessages(prev => {
            // 检查是否存在相同ID的消息，确保不重复添加
            const messageExists = prev.some(m => m.id === userMessage.id);
            if (messageExists) {
              return prev;
            }
            return [...prev, userMessage];
          });
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
              // 检查是否有相同ID、角色和会话ID的消息（额外的去重检查）
              const isDuplicate = prev.some(m => 
                m.id === partialMessage.id || 
                (m.sessionId === (partialMessage.sessionId || currentSessionId) && 
                 m.role === 'assistant' && 
                 m.content === partialMessage.content)
              );
              
              if (isDuplicate) {
                return prev;
              }
              
              // 添加新消息
              return [...prev, {
                id: partialMessage.id || Date.now().toString(), // 确保ID不为undefined
                sessionId: partialMessage.sessionId || currentSessionId || '',
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
      },
      // 只有当存在激活的模板ID时才传递自定义提示词
      activeTemplateId ? customPrompt : undefined
    ).catch(error => {
      console.error('发送消息失败:', error);
      toast.error('发送消息失败');
      setIsGenerating(false);
    });
  };

  /**
   * 停止生成回复
   */
  const handleStopGeneration = (): void => {
    if (!activeSessionId) return;
    
    // 取消当前会话的生成
    MessageService.cancelGeneration(activeSessionId);
    
    setIsGenerating(false);
    toast.info('生成已停止');
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
   * @param template 要使用的模板
   */
  const handleUseTemplate = (template: Template): void => {
    // 如果当前模板已经被选中，就取消选中并重置自定义提示词
    if (activeTemplateId === template.id) {
      setActiveTemplateId(null);
      setCustomPrompt('');
      toast.info(`已取消模板: ${template.name}`);
    } else {
      // 选中新模板，设置自定义提示词
      setActiveTemplateId(template.id);
      setCustomPrompt(template.content);
      toast.success(`已应用模板: ${template.name}`);
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
   * @param modelId 选择的模型ID
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
   * @param height 新的高度值
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
        await db.initDefaultModels();
        
        // 尝试获取最后使用的模型ID
        const lastUsedModelId = await db.getLastUsedModelId();
        const models = await db.getAllModels();
        if (lastUsedModelId) {
          // 如果有最后使用的模型ID，直接使用它
          setSelectedModel(lastUsedModelId);
          console.log(`使用上次选择的模型: ${models.find(m => m.id === lastUsedModelId)?.name}`);
        } else {
          // 如果没有最后使用的模型ID，尝试使用API模型列表中的第一个
          const apiModels = await db.getAllModels('api');
          if (apiModels.length > 0) {
            // 使用第一个API模型作为默认
            setSelectedModel(apiModels[0].id);
            // 保存为最后使用的模型
            await db.saveLastUsedModelId(apiModels[0].id);
          } else {
            // 尝试加载本地模型
            const localModels = await db.getAllModels('local');
            if (localModels.length > 0) {
              setSelectedModel(localModels[0].id);
              // 保存为最后使用的模型
              await db.saveLastUsedModelId(localModels[0].id);
            }
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
        }
        else
        {if (sessions.length > 0) {
            // 按时间戳排序，获取最新的会话
            const sortedSessions = [...sessions].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            // 获取最新会话ID
            const latestSessionId = sortedSessions[0].id;
            setActiveSessionId(latestSessionId);
            await loadSessionMessages(latestSessionId);
          } else {
            // 如果没有会话，创建一个新会话
            const newSessionId = await createNewSession("新对话");
            if (newSessionId) {
              setActiveSessionId(newSessionId);
              setMessages([]);
            }
          }}
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