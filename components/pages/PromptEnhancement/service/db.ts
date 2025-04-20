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
  role: 'user' | 'assistant' | 'system'; // 消息角色
  content: string;          // 消息内容
  timestamp: Date;          // 时间戳
  reasoningContent?: string; // 思考内容
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
  id: string;               // 模型ID 数据库标识
  name: string;             // 模型名称 - 用于界面显示给用户
  url?: string;             // API URL
  apiKey?: string;          // API密钥
  parameters?: string;      // 其他参数
  apiId?: string;           // API调用的模型标识符
  timestamp: Date;          // 创建/更新时间
  type?: string;            // 模型类型，如'api'
}

export interface InputHistory {
  id: string;               // 唯一ID
  content: string[];        // 历史记录内容
  timestamp: Date;          // 最后更新时间
}

export interface AppSettings {
  id: string;               // 设置ID
  lastUsedModelId?: string; // 最后使用的模型ID
  lastUsedTemplateId?: string;// 最后使用的提示词模板ID
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
      // 添加消息
      return new Promise((resolve, reject) => {
        const addRequest = store.add(message);
        addRequest.onsuccess = () => resolve(addRequest.result);
        addRequest.onerror = () => reject(addRequest.error);
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
    // 确保parameters是字符串类型
    let modelToSave = {...model};
    
    if (modelToSave.parameters && typeof modelToSave.parameters !== 'string') {
      try {
        modelToSave.parameters = JSON.stringify(modelToSave.parameters);
      } catch (error) {
        // 如果无法转为JSON字符串，设为undefined
        modelToSave.parameters = undefined;
      }
    }
    
    const modelWithTimestamp = {
      ...modelToSave,
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
   * @param type 可选，模型类型筛选（仅支持'api'）
   */
  getAllModels: async (type?: 'api'): Promise<Model[]> => {
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
   * 保存最后使用的会话ID
   * @param sessionId 会话ID
   */
  saveLastUsedSessionId: async (sessionId: string): Promise<IDBValidKey> => {
    return executeOperation<IDBValidKey>(STORES.SETTINGS, 'readwrite', async store => {
      const settings = await new Promise<AppSettings | undefined>((resolve, reject) => {
        const request = store.get('app-settings');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const updatedSettings: AppSettings = {
        ...(settings || { id: 'app-settings' }),
        lastUsedSessionId: sessionId, 
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
   * 获取最后使用的会话ID
   * @returns 最后使用的会话ID，如果不存在则返回undefined
   */
  getLastUsedSessionId: async (): Promise<string | undefined> => {
    return executeOperation<string | undefined>(STORES.SETTINGS, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const request = store.get('app-settings');
        request.onsuccess = () => resolve(request.result?.lastUsedSessionId);
        request.onerror = () => reject(request.error);
      });
    });
  },

    /**
   * 保存最后使用的模板ID
   * @param templateId 模板ID
   */
    saveLastUsedTemplateId: async (templateId: string): Promise<IDBValidKey> => {
      return executeOperation<IDBValidKey>(STORES.SETTINGS, 'readwrite', async store => {
        const settings = await new Promise<AppSettings | undefined>((resolve, reject) => {
          const request = store.get('app-settings');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        const updatedSettings: AppSettings = {
          ...(settings || { id: 'app-settings' }),
          lastUsedTemplateId: templateId,
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
     * 获取最后使用的模板ID
     * @returns 最后使用的模板ID或undefined
     */
    getLastUsedTemplateId: async (): Promise<string | undefined> => {
      return executeOperation<string | undefined>(STORES.SETTINGS, 'readonly', store => {
        return new Promise((resolve, reject) => {
          const request = store.get('app-settings');
          request.onsuccess = () => resolve(request.result?.lastUsedTemplateId);
          request.onerror = () => reject(request.error);
        });
      });
    },

  /**
   * 初始化默认模型
   * 如果数据库中没有模型，则添加默认的API模型配置
   */
  async initDefaultModels(): Promise<void> {
    try {
      const models = await this.getAllModels();
      if (models.length === 0) {
        // 添加默认模型，注意parameters是一个格式良好的JSON字符串
        const defaultModel: Model = {
          id: `${Date.now()}`,
          name: 'Set Your Model Name',
          url: 'Set Your Model Url',
          apiKey: '',
          apiId: 'Set Your Model Id',
          parameters: '{"temperature":0.7,"max_tokens":2000,"stream":true,"top_p":1}', // 正确的JSON格式字符串
          timestamp: new Date(),
          type: 'api'
        };
        await this.saveModel(defaultModel);
      }
    } catch (error) {
      console.error('初始化默认模型失败:', error);
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