/**
 * IndexedDB数据库工具类
 * 用于管理聊天记录、会话、模板数据和模型配置的存储与检索
 * 支持OpenAI API调用的模型配置存储
 */

// 数据库名称和版本
const DB_NAME = 'promptEnhancementDB';
const DB_VERSION = 4; // 增加版本号以支持应用设置存储

// 对象仓库名称
const STORES = {
  MESSAGES: 'messages',     // 聊天消息
  SESSIONS: 'sessions',     // 聊天会话
  TEMPLATES: 'templates',   // 提示词模板
  MODELS: 'models',         // 模型配置
  INPUT_HISTORY: 'inputHistory', // 输入历史记录
  SETTINGS: 'settings'      // 应用设置
};

// 接口定义
export interface Message {
  id: string;               // 消息ID
  sessionId: string;        // 所属会话ID
  role: 'user' | 'assistant'; // 消息角色
  content: string;          // 消息内容
  timestamp: Date;          // 时间戳
}

export interface ChatSession {
  id: string;               // 会话ID
  title: string;            // 会话标题
  lastMessage: string;      // 最后一条消息预览
  timestamp: Date;          // 最后更新时间
  messageCount: number;     // 消息数量
  starred?: boolean;        // 是否标星
  order?: number;           // 手动排序顺序
}

export interface Template {
  id: string;               // 模板ID
  name: string;             // 模板名称
  content: string;          // 模板内容
  timestamp?: Date;         // 创建/更新时间
}

export interface Model {
  id: string;               // 模型ID - 用于API调用的唯一标识符
  name: string;             // 模型名称 - 用于界面显示给用户
  type: 'api' | 'local';    // 模型类型：API或本地
  url?: string;             // API URL（API模型）
  apiKey?: string;          // API密钥（API模型）
  path?: string;            // 模型路径（本地模型）
  parameters?: string;      // 其他参数
  timestamp: Date;          // 创建/更新时间
}

export interface InputHistory {
  id: string;               // 唯一ID
  content: string[];        // 历史记录内容
  timestamp: Date;          // 最后更新时间
}

export interface AppSettings {
  id: string;               // 设置ID
  lastUsedModelId?: string; // 最后使用的模型ID
  timestamp: Date;          // 最后更新时间
  [key: string]: any;       // 其他设置项
}

/**
 * 获取数据库连接
 * @returns Promise<IDBDatabase>
 */
const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建所需的存储对象
      const createStoreIfNotExists = (storeName: string, keyPath: string, indexes?: {name: string, keyPath: string, unique: boolean}[]) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath });
          if (indexes) {
            indexes.forEach(index => {
              store.createIndex(index.name, index.keyPath, { unique: index.unique });
            });
          }
        }
      };
      
      // 创建各个存储对象
      createStoreIfNotExists(STORES.MESSAGES, 'id', [
        { name: 'sessionId', keyPath: 'sessionId', unique: false },
        { name: 'timestamp', keyPath: 'timestamp', unique: false }
      ]);
      
      createStoreIfNotExists(STORES.SESSIONS, 'id', [
        { name: 'timestamp', keyPath: 'timestamp', unique: false }
      ]);
      
      createStoreIfNotExists(STORES.TEMPLATES, 'id', [
        { name: 'name', keyPath: 'name', unique: false }
      ]);
      
      createStoreIfNotExists(STORES.MODELS, 'id', [
        { name: 'name', keyPath: 'name', unique: false },
        { name: 'type', keyPath: 'type', unique: false }
      ]);
      
      createStoreIfNotExists(STORES.INPUT_HISTORY, 'id', []);
      createStoreIfNotExists(STORES.SETTINGS, 'id', []);
    };
    
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

/**
 * 执行数据库操作的通用方法
 * @param storeName 存储对象名称
 * @param mode 操作模式（只读/读写）
 * @param operation 操作函数
 * @returns Promise<T>
 */
const executeOperation = async <T>(
  storeName: string, 
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> => {
  const db = await getDB();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  
  try {
    const result = await operation(store);
    return result;
  } finally {
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  }
};

// 数据库工具类
const db = {
  /**
   * 添加消息，带去重功能
   * @param message 消息对象
   */
  addMessage: async (message: Message): Promise<IDBValidKey> => {
    return executeOperation<IDBValidKey>(STORES.MESSAGES, 'readwrite', async store => {
      // 先检查是否已存在相同ID的消息
      const existingMessageRequest = store.get(message.id);
      
      return new Promise((resolve, reject) => {
        existingMessageRequest.onsuccess = () => {
          if (existingMessageRequest.result) {
            // 消息已存在，直接返回ID
            console.log('消息已存在，跳过添加:', message.id);
            resolve(message.id);
            return;
          }
          
          // 尝试检查是否有内容相同的消息（针对同一会话、相同角色）
          const index = store.index('sessionId');
          const sessionMessagesRequest = index.getAll(message.sessionId);
          
          sessionMessagesRequest.onsuccess = () => {
            const sessionMessages = sessionMessagesRequest.result as Message[];
            
            // 检查是否有相同内容的消息
            const duplicateMessage = sessionMessages.find(m => 
              m.role === message.role && 
              m.content === message.content &&
              // 只检查最近3分钟内的消息，避免误判历史消息
              (new Date().getTime() - new Date(m.timestamp).getTime() < 3 * 60 * 1000)
            );
            
            if (duplicateMessage) {
              // 发现内容相同的最近消息，跳过添加
              console.log('发现相似消息，跳过添加:', duplicateMessage.id);
              resolve(duplicateMessage.id);
              return;
            }
            
            // 没有找到重复消息，添加新消息
            const addRequest = store.add(message);
            addRequest.onsuccess = () => resolve(addRequest.result);
            addRequest.onerror = () => reject(addRequest.error);
          };
          
          sessionMessagesRequest.onerror = () => {
            // 查询失败，直接尝试添加消息
            const addRequest = store.add(message);
            addRequest.onsuccess = () => resolve(addRequest.result);
            addRequest.onerror = () => reject(addRequest.error);
          };
        };
        
        existingMessageRequest.onerror = () => {
          // 查询失败，直接尝试添加消息
          const addRequest = store.add(message);
          addRequest.onsuccess = () => resolve(addRequest.result);
          addRequest.onerror = () => reject(addRequest.error);
        };
      });
    });
  },
  
  /**
   * 获取会话的所有消息
   * @param sessionId 会话ID
   */
  getMessagesBySession: async (sessionId: string): Promise<Message[]> => {
    return executeOperation<Message[]>(STORES.MESSAGES, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const index = store.index('sessionId');
        const request = index.getAll(sessionId);
        
        request.onsuccess = () => {
          const messages = request.result.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          resolve(messages);
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 添加或更新会话
   * @param session 会话对象
   */
  saveSession: async (session: ChatSession): Promise<IDBValidKey> => {
    return executeOperation<IDBValidKey>(STORES.SESSIONS, 'readwrite', store => {
      return new Promise((resolve, reject) => {
        const request = store.put(session);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 获取所有会话
   */
  getAllSessions: async (): Promise<ChatSession[]> => {
    return executeOperation<ChatSession[]>(STORES.SESSIONS, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          const sessions = request.result.sort((a, b) => {
            if ((a.starred && b.starred) || (!a.starred && !b.starred)) {
              if (typeof a.order === 'number' && typeof b.order === 'number') {
                return a.order - b.order;
              }
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }
            return a.starred ? -1 : 1;
          });
          resolve(sessions);
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 获取单个会话
   * @param sessionId 会话ID
   */
  getSession: async (sessionId: string): Promise<ChatSession | undefined> => {
    return executeOperation<ChatSession | undefined>(STORES.SESSIONS, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const request = store.get(sessionId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 删除会话及其所有消息
   * @param sessionId 会话ID
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction([STORES.SESSIONS, STORES.MESSAGES], 'readwrite');
    
    return new Promise((resolve, reject) => {
      try {
        const sessionStore = tx.objectStore(STORES.SESSIONS);
        const messagesStore = tx.objectStore(STORES.MESSAGES);
        const index = messagesStore.index('sessionId');
        
        sessionStore.delete(sessionId);
        
        const getKeysRequest = index.getAllKeys(sessionId);
        getKeysRequest.onsuccess = () => {
          const keys = getKeysRequest.result;
          keys.forEach(key => messagesStore.delete(key));
        };
        
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      } catch (error) {
        db.close();
        reject(error);
      }
    });
  },
  
  /**
   * 保存模板
   * @param template 模板对象
   */
  saveTemplate: async (template: Template): Promise<IDBValidKey> => {
    const templateWithTimestamp = {
      ...template,
      timestamp: template.timestamp || new Date()
    };
    
    return executeOperation<IDBValidKey>(STORES.TEMPLATES, 'readwrite', store => {
      return new Promise((resolve, reject) => {
        const request = store.put(templateWithTimestamp);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 获取所有模板
   */
  getAllTemplates: async (): Promise<Template[]> => {
    return executeOperation<Template[]>(STORES.TEMPLATES, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 删除模板
   * @param templateId 模板ID
   */
  deleteTemplate: async (templateId: string): Promise<void> => {
    return executeOperation<void>(STORES.TEMPLATES, 'readwrite', store => {
      return new Promise((resolve, reject) => {
        const request = store.delete(templateId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 删除多个模板
   * @param templateIds 模板ID数组
   */
  deleteTemplates: async (templateIds: string[]): Promise<void> => {
    return executeOperation<void>(STORES.TEMPLATES, 'readwrite', store => {
      return new Promise((resolve, reject) => {
        let completed = 0;
        let hasError = false;
        
        templateIds.forEach(id => {
          const request = store.delete(id);
          
          request.onsuccess = () => {
            completed++;
            if (completed === templateIds.length && !hasError) {
              resolve();
            }
          };
          
          request.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(request.error);
            }
          };
        });
      });
    });
  },
  
  /**
   * 搜索会话
   * @param query 搜索关键词
   */
  searchSessions: async (query: string): Promise<ChatSession[]> => {
    const sessions = await db.getAllSessions();
    
    if (!query.trim()) {
      return sessions;
    }
    
    const lowerQuery = query.toLowerCase();
    return sessions.filter(session => 
      session.title.toLowerCase().includes(lowerQuery) || 
      session.lastMessage.toLowerCase().includes(lowerQuery)
    );
  },
  
  /**
   * 搜索模板
   * @param query 搜索关键词
   */
  searchTemplates: async (query: string): Promise<Template[]> => {
    const templates = await db.getAllTemplates();
    
    if (!query.trim()) {
      return templates;
    }
    
    const lowerQuery = query.toLowerCase();
    return templates.filter(template => 
      template.name.toLowerCase().includes(lowerQuery) || 
      template.content.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * 保存模型配置
   * @param model 模型对象
   */
  saveModel: async (model: Model): Promise<IDBValidKey> => {
    const modelWithTimestamp = {
      ...model,
      timestamp: model.timestamp || new Date()
    };
    
    return executeOperation<IDBValidKey>(STORES.MODELS, 'readwrite', store => {
      return new Promise((resolve, reject) => {
        const request = store.put(modelWithTimestamp);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 获取所有模型
   * @param type 可选，模型类型筛选
   */
  getAllModels: async (type?: 'api' | 'local'): Promise<Model[]> => {
    return executeOperation<Model[]>(STORES.MODELS, 'readonly', store => {
      return new Promise((resolve, reject) => {
        let request: IDBRequest;
        
        if (type) {
          const index = store.index('type');
          request = index.getAll(type);
        } else {
          request = store.getAll();
        }
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 获取单个模型配置
   * @param modelId 模型ID
   */
  getModel: async (modelId: string): Promise<Model | undefined> => {
    return executeOperation<Model | undefined>(STORES.MODELS, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const request = store.get(modelId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 删除模型
   * @param modelId 模型ID
   */
  deleteModel: async (modelId: string): Promise<void> => {
    return executeOperation<void>(STORES.MODELS, 'readwrite', store => {
      return new Promise((resolve, reject) => {
        const request = store.delete(modelId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 保存最后使用的模型ID
   * @param modelId 模型ID
   */
  saveLastUsedModelId: async (modelId: string): Promise<IDBValidKey> => {
    return executeOperation<IDBValidKey>(STORES.SETTINGS, 'readwrite', async store => {
      const settings = await new Promise<AppSettings | undefined>((resolve, reject) => {
        const request = store.get('app-settings');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const updatedSettings: AppSettings = {
        ...(settings || { id: 'app-settings' }),
        lastUsedModelId: modelId,
        timestamp: new Date()
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(updatedSettings);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 获取最后使用的模型ID
   * @returns 最后使用的模型ID，如果不存在则返回undefined
   */
  getLastUsedModelId: async (): Promise<string | undefined> => {
    return executeOperation<string | undefined>(STORES.SETTINGS, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const request = store.get('app-settings');
        request.onsuccess = () => resolve(request.result?.lastUsedModelId);
        request.onerror = () => reject(request.error);
      });
    });
  },

  /**
   * 初始化默认模型（如果数据库中没有模型）
   */
  initDefaultModels: async (): Promise<void> => {
    const models = await db.getAllModels();
    
    if (models.length === 0) {
      const defaultModels: Model[] = [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          type: 'api',
          url: 'https://api.openai.com/v1',
          timestamp: new Date()
        },
        {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          type: 'api',
          url: 'https://api.openai.com/v1',
          timestamp: new Date()
        },
        {
          id: 'qwen-plus',
          name: '通义千问 Plus',
          type: 'api',
          url: 'https://dashscope.aliyuncs.com/api/v1',
          parameters: '{"model":"qwen-plus"}',
          timestamp: new Date()
        },
      ];
      
      for (const model of defaultModels) {
        await db.saveModel(model);
      }
      
      await db.saveLastUsedModelId('gpt-4');
    }
  },

  /**
   * 保存输入历史记录
   * @param history 输入历史记录数组
   */
  saveInputHistory: async (history: string[]): Promise<IDBValidKey> => {
    const inputHistory: InputHistory = {
      id: 'input-history',
      content: history,
      timestamp: new Date()
    };
    
    return executeOperation<IDBValidKey>(STORES.INPUT_HISTORY, 'readwrite', store => {
      return new Promise((resolve, reject) => {
        const request = store.put(inputHistory);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  },
  
  /**
   * 获取输入历史记录
   * @returns 输入历史记录数组
   */
  getInputHistory: async (): Promise<string[]> => {
    return executeOperation<string[]>(STORES.INPUT_HISTORY, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const request = store.get('input-history');
        request.onsuccess = () => resolve(request.result?.content || []);
        request.onerror = () => reject(request.error);
      });
    });
  }
};

export default db;