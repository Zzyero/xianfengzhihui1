# 智能绘画先锋 - 提示词增强模块

## 项目概述

提示词增强模块是智能绘画先锋应用的核心功能之一，专门用于提供AI对话和提示词管理体验。该模块实现了与AI模型的对话、会话管理、模板管理等功能，帮助用户优化和管理用于AI绘画的提示词。

## 技术栈

- **前端框架**：React + Next.js
- **UI组件库**：自定义UI组件（基于组件库二次封装）
- **状态管理**：React Context API
- **样式管理**：CSS Modules
- **提示词响应**：流式输出
- **数据持久化**：IndexedDB (通过自定义服务层封装)
- **通知系统**：Sonner Toast

## 项目结构

```
components/pages/PromptEnhancement/
├── hooks/                       # 自定义钩子目录
│   ├── index.ts                 # 钩子统一导出
│   ├── useAppState.tsx          # 全局状态管理钩子
│   ├── useMessages.tsx          # 消息管理钩子
│   ├── useSessions.tsx          # 会话管理钩子
│   ├── useTemplates.tsx         # 模板管理钩子
│   ├── useApplicationInit.tsx   # 应用初始化钩子
│   └── useInput.tsx             # 输入管理钩子
├── service/                     # 服务层目录
│   ├── db.ts                    # 数据库服务
│   ├── messageService.ts        # 消息服务
│   └── DataTransfer.tsx         # 数据导入导出服务
├── ChatInterface/               # 聊天界面组件
│   ├── ChatWindow.tsx           # 聊天窗口组件
│   ├── MessageInput.tsx         # 消息输入组件
│   └── HistorySidebarControl.tsx # 历史侧边栏控制组件
├── TemplateManagement/          # 模板管理组件
│   └── TemplateBar.tsx          # 模板栏组件
├── ModelManagement/             # 模型管理组件
│   └── ChangeModel.tsx          # 模型选择组件
├── styles/                      # 样式文件目录
│   └── PromptEnhancement.css    # 主样式文件
└── PromptEnhancementPage.tsx    # 主页面组件
```

## 核心功能实现

### 1. 全局状态管理

项目采用React Context API实现全局状态管理，通过`useAppState.tsx`定义和管理应用状态：

```typescript
// 创建上下文和Provider
const AppStateContext = createContext<{
  state: AppState;
  actions: ActionTypes;
}>(defaultValue);

// 提供状态和操作的Provider组件
export const AppStateProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // 状态定义和方法实现
  // ...
  
  return (
    <AppStateContext.Provider value={{ state, actions }}>
      {children}
    </AppStateContext.Provider>
  );
};

// 供组件使用的钩子
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
```

### 2. 消息流式输出

通过回调函数机制实现AI回复的流式输出：

```typescript
MessageService.sendMessage(
  content,
  currentSessionId,
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
            id: partialMessage.id || Date.now().toString(),
            sessionId: partialMessage.sessionId || currentSessionId || '',
            role: 'assistant',
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
    // 其他回调...
  },
  // 自定义提示词（如果使用了模板）
  activeTemplateId ? customPrompt : undefined
);
```

### 3. 数据持久化

通过`db.ts`服务实现数据持久化，使用IndexedDB存储会话、消息和模板：

```typescript
// 数据库模型
export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
}

export interface Template {
  id: string;
  name: string;
  content: string;
}

// 数据访问方法
const db = {
  // 会话相关操作
  saveSession: async (session: ChatSession): Promise<string> => { ... },
  getAllSessions: async (): Promise<ChatSession[]> => { ... },
  
  // 消息相关操作
  saveMessage: async (message: Message): Promise<string> => { ... },
  getSessionMessages: async (sessionId: string): Promise<Message[]> => { ... },
  
  // 模板相关操作
  saveTemplate: async (template: Template): Promise<void> => { ... },
  getAllTemplates: async (): Promise<Template[]> => { ... },
  
  // 模型相关操作
  saveLastUsedModelId: async (modelId: string): Promise<void> => { ... },
  getLastUsedModelId: async (): Promise<string | null> => { ... },
  initDefaultModels: async (): Promise<void> => { ... },
  getAllModels: async (type: 'api' | 'local'): Promise<any[]> => { ... }
};
```

### 4. 模板管理

提供了模板管理功能，允许用户创建、保存和应用提示词模板：

```typescript
const handleUseTemplate = (template: Template): void => {
  // 如果当前模板已经被选中，就取消选中
  if (activeTemplateId === template.id) {
    setActiveTemplateId(null);
    setCustomPrompt('');
    toast.info(`已取消模板: ${template.name}`);
  } else {
    // 选中新模板
    setActiveTemplateId(template.id);
    setCustomPrompt(template.content);
    toast.success(`已应用模板: ${template.name}`);
  }
};
```

### 5. 会话管理

支持多会话管理，包括创建新会话、切换会话等功能：

```typescript
// 处理新建会话
const handleNewChat = async (): Promise<void> => {
  // 如果正在生成，先取消当前的生成
  if (isGenerating && activeSessionId) {
    MessageService.cancelGeneration(activeSessionId);
    setIsGenerating(false);
  }
  
  // 创建新的临时会话ID
  const tempSessionId = `temp_${Date.now().toString()}`;
  setActiveSessionId(tempSessionId);
  setMessages([]);
  
  // 重置模板状态
  setActiveTemplateId(null);
  setCustomPrompt('');
  
  toast.info('请输入内容以开始新对话');
};

// 处理会话选择
const handleSelectSession = async (sessionId: string): Promise<void> => {
  // 如果正在生成，先取消当前的生成
  if (isGenerating && activeSessionId) {
    MessageService.cancelGeneration(activeSessionId);
    setIsGenerating(false);
  }
  
  setActiveSessionId(sessionId);
  setActiveTemplateId(null);
  setCustomPrompt('');
};
```

## 状态管理详解

### 状态设计

应用状态被分为以下几类：

```typescript
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
```

### 状态管理架构

项目通过以下架构实现状态管理：

1. **全局状态层**：`useAppState.tsx`中定义所有状态和操作
2. **兼容层**：如`useMessages.tsx`等钩子，为了兼容旧接口
3. **组件层**：`PromptEnhancementInner`通过`useAppState`获取状态和操作

### 状态操作封装

所有状态操作被封装在`actions`对象中：

```typescript
const actions = {
  // 会话操作
  loadSessions,
  setActiveSessionId,
  createNewSession,
  handleNewChat,
  handleSelectSession,
  
  // 消息操作
  loadSessionMessages,
  handleSendMessage,
  handleStopGeneration,
  
  // 模板操作
  loadTemplates,
  handleAddTemplate,
  handleSaveTemplate,
  handleUseTemplate,
  setNewTemplate,
  setCustomPrompt,
  setIsAddTemplateDialogOpen,
  
  // 等等...
};
```

## 组件详解

### PromptEnhancementPage

整个功能的入口组件，负责包装全局状态提供者：

```tsx
const PromptEnhancementPage: React.FC = () => {
  return (
    <AppStateProvider>
      <PromptEnhancementInner />
    </AppStateProvider>
  );
};
```

### PromptEnhancementInner

内部主组件，使用全局状态并组织页面结构：

```tsx
const PromptEnhancementInner: React.FC = () => {
  const { state, actions } = useAppState();
  
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
            {/* 各个UI组件 */}
            {/* ... */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

### ChatWindow

展示对话消息的组件：

```tsx
const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isTyping,
  onNewChat,
  className,
  sidebarOpen,
  setSidebarOpen,
  sessions,
  onSelectSession,
  activeSessionId
}) => {
  // 渲染消息列表
  // ...
};
```

### MessageInput

用户输入组件，支持输入调整和消息发送：

```tsx
const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onStop,
  isGenerating,
  onResize
}) => {
  // 处理用户输入和发送消息
  // ...
};
```

### TemplateBar

模板管理组件，允许创建和应用模板：

```tsx
const TemplateBar: React.FC<TemplateBarProps> = ({
  onAddTemplate,
  templates,
  onUseTemplate,
  activeTemplateId
}) => {
  // 渲染和管理模板
  // ...
};
```

## 服务层详解

### MessageService

处理消息发送、接收和存储的服务：

```typescript
const MessageService = {
  // 发送消息到AI服务
  sendMessage: (
    content: string,
    sessionId: string,
    modelId: string,
    callbacks: {
      onUserMessageSaved?: (message: Message) => void;
      onAiMessageUpdate?: (partialMessage: Partial<Message>) => void;
      onAiMessageComplete?: () => void;
      onSessionUpdated?: () => void;
      onError?: (error: Error) => void;
    },
    customPrompt?: string
  ) => {
    // 实现消息发送和响应处理
    // ...
  },
  
  // 取消响应生成
  cancelGeneration: (sessionId: string) => {
    // 取消指定会话的生成
    // ...
  },
  
  // 创建新会话
  createNewSession: async (firstMessage: string, title: string): Promise<string> => {
    // 创建并保存新会话
    // ...
  },
  
  // 加载会话消息
  loadSessionMessages: async (sessionId: string): Promise<Message[]> => {
    // 从数据库加载指定会话的消息
    // ...
  },
  
  // 加载会话列表
  loadSessions: async (): Promise<ChatSession[]> => {
    // 从数据库加载会话列表
    // ...
  }
};
```

### 数据库服务

使用IndexedDB实现本地数据持久化：

```typescript
// 数据库初始化
const initDB = async () => {
  // 创建/连接IndexedDB数据库
  // 创建对象存储（sessions, messages, templates, models, settings）
  // ...
};

// 数据库操作服务
const db = {
  // 会话操作
  // 消息操作
  // 模板操作 
  // 模型操作
  // ...
};
```

### 数据导入导出

支持导入导出数据功能：

```typescript
const ExportData: React.FC = () => {
  // 导出会话、消息和模板数据为JSON
  const handleExport = async () => {
    // ...
  };
  
  // 导入数据
  const handleImport = async (file: File) => {
    // ...
  };
  
  return (
    <div className="export-data-container">
      {/* 导入导出按钮 */}
    </div>
  );
};
```

## 应用初始化流程

当用户打开应用时，执行以下初始化流程：

1. **数据库初始化**：确保IndexedDB数据库和对象存储准备就绪
2. **模型初始化**：加载默认模型和上次使用的模型
3. **会话加载**：加载用户的会话列表
4. **模板加载**：加载保存的提示词模板
5. **加载最近会话**：如有会话记录，则加载最近的会话；否则创建新会话

```typescript
useEffect(() => {
  const initApplication = async () => {
    setIsLoading(true);
    try {
      // 1. 数据库初始化
      await db.initDefaultModels();
      
      // 2. 模型初始化
      const lastUsedModelId = await db.getLastUsedModelId();
      // 设置模型...
      
      // 3. 会话加载
      const sessions = await loadSessions();
      
      // 4. 模板加载
      await loadTemplates();
      
      // 5. 加载最近会话或创建新会话
      if (sessions.length > 0) {
        // ...
      } else {
        // ...
      }
    } catch (error) {
      // 错误处理
    } finally {
      setIsLoading(false);
    }
  };
  
  initApplication();
}, []);
```

## 使用流程

用户使用该模块的典型流程：

1. **初始页面加载**：自动加载最近的会话或创建新会话
2. **选择模型**：用户可以从顶部选择不同的AI模型
3. **发送消息**：在输入框中输入内容并发送
4. **接收回复**：AI模型生成回复，实时显示在对话窗口中
5. **应用模板**：用户可以从底部的模板栏选择预设模板
6. **管理会话**：通过侧边栏切换不同的会话或创建新会话
7. **导入导出**：可以导出当前数据或导入之前的备份

## 开发指南

### 扩展新功能

1. **添加新状态**：在`useAppState.tsx`的`AppState`接口中添加新状态
2. **添加新操作**：在`AppStateProvider`中实现新的操作方法并添加到`actions`对象
3. **创建新组件**：在适当的目录创建新组件，并通过`useAppState`获取状态和操作
4. **更新服务层**：如需持久化存储，在`db.ts`中添加相应操作

### 增加新模型支持

1. 在`db.ts`的`initDefaultModels`方法中添加新模型定义
2. 如需特殊处理，在`messageService.ts`的`sendMessage`方法中添加新模型的处理逻辑

## 性能优化

项目采用了以下性能优化策略：

1. **状态切片**：将状态分为多个独立部分，减少不必要的重渲染
2. **流式响应**：使用流式输出显示AI回复，提高用户体验
3. **延迟加载**：会话消息按需加载，而不是一次性加载所有数据
4. **缓存处理**：在IndexedDB中缓存模型和会话数据，减少加载时间

## 总结

提示词增强模块是一个功能完善的AI对话与提示词管理系统，通过统一的状态管理机制，实现了会话、消息、模板等功能的有效管理，使数据流更加清晰、状态变更更加可控。系统具有良好的可扩展性和可维护性，可以方便地扩展新功能和添加新模型支持。 