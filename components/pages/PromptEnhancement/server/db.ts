/**
 * IndexedDB数据库工具类
 * 用于管理聊天记录、会话、模板数据和模型配置的存储与检索
 * 支持OpenAI API调用的模型配置存储
 */

// 数据库名称和版本
const DB_NAME = 'promptEnhancementDB';
const DB_VERSION = 3; // 增加版本号以支持输入历史记录存储

// 对象仓库名称
const STORES = {
  MESSAGES: 'messages',     // 聊天消息
  SESSIONS: 'sessions',     // 聊天会话
  TEMPLATES: 'templates',   // 提示词模板
  MODELS: 'models',         // 模型配置
  INPUT_HISTORY: 'inputHistory' // 输入历史记录
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

// 模型接口定义
export interface Model {
  id: string;               // 模型ID
  name: string;             // 模型名称
  type: 'api' | 'local';    // 模型类型：API或本地
  url?: string;             // API URL（API模型）
  apiKey?: string;          // API密钥（API模型）
  path?: string;            // 模型路径（本地模型）
  parameters?: string;      // 其他参数
  timestamp: Date;          // 创建/更新时间
}

// 输入历史记录接口
export interface InputHistory {
  id: string;               // 唯一ID
  content: string[];        // 历史记录内容
  timestamp: Date;          // 最后更新时间
}

/**
 * 数据库初始化
 * 创建数据库连接并设置对象仓库
 */
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // 数据库升级事件（首次创建或版本更新时触发）
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 如果对象仓库不存在，则创建
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        // 创建消息对象仓库，使用id作为键路径
        const messageStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
        // 创建索引，便于按会话ID和时间戳检索
        messageStore.createIndex('sessionId', 'sessionId', { unique: false });
        messageStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        // 创建会话对象仓库
        const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        // 创建时间戳索引，便于排序
        sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        // 创建模板对象仓库
        const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
        // 创建索引，便于按名称搜索
        templateStore.createIndex('name', 'name', { unique: false });
      }
      
      // 创建模型配置对象仓库
      if (!db.objectStoreNames.contains(STORES.MODELS)) {
        const modelStore = db.createObjectStore(STORES.MODELS, { keyPath: 'id' });
        // 创建索引
        modelStore.createIndex('name', 'name', { unique: false });
        modelStore.createIndex('type', 'type', { unique: false });
      }
      
      // 创建输入历史记录对象仓库
      if (!db.objectStoreNames.contains(STORES.INPUT_HISTORY)) {
        db.createObjectStore(STORES.INPUT_HISTORY, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = (event) => {
      console.error('数据库连接失败:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

/**
 * 执行数据库事务
 * @param storeName 对象仓库名称
 * @param mode 事务模式（readonly/readwrite）
 * @param callback 事务回调函数
 */
const runTransaction = <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = callback(store);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      // 事务完成后关闭数据库连接
      transaction.oncomplete = () => db.close();
    }).catch(reject);
  });
};

// 数据库工具类
const db = {
  /**
   * 添加消息
   * @param message 消息对象
   */
  addMessage: (message: Message): Promise<IDBValidKey> => {
    return runTransaction<IDBValidKey>(
      STORES.MESSAGES,
      'readwrite',
      (store) => store.add(message)
    );
  },
  
  /**
   * 获取会话的所有消息
   * @param sessionId 会话ID
   */
  getMessagesBySession: (sessionId: string): Promise<Message[]> => {
    return new Promise((resolve, reject) => {
      initDB().then(db => {
        const transaction = db.transaction(STORES.MESSAGES, 'readonly');
        const store = transaction.objectStore(STORES.MESSAGES);
        const index = store.index('sessionId');
        const request = index.getAll(sessionId);
        
        request.onsuccess = () => {
          // 按时间戳排序
          const messages = request.result.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          resolve(messages);
        };
        
        request.onerror = () => reject(request.error);
        
        transaction.oncomplete = () => db.close();
      }).catch(reject);
    });
  },
  
  /**
   * 添加或更新会话
   * @param session 会话对象
   */
  saveSession: (session: ChatSession): Promise<IDBValidKey> => {
    return runTransaction<IDBValidKey>(
      STORES.SESSIONS,
      'readwrite',
      (store) => store.put(session)
    );
  },
  
  /**
   * 获取所有会话
   */
  getAllSessions: (): Promise<ChatSession[]> => {
    return new Promise((resolve, reject) => {
      initDB().then(db => {
        const transaction = db.transaction(STORES.SESSIONS, 'readonly');
        const store = transaction.objectStore(STORES.SESSIONS);
        const request = store.getAll();
        
        request.onsuccess = () => {
          // 首先按照starred和order排序，然后按时间戳降序排序
          const sessions = request.result.sort((a, b) => {
            // 优先显示标星会话
            if ((a.starred && b.starred) || (!a.starred && !b.starred)) {
              // 如果都是标星或都不是标星，则按order排序
              if (typeof a.order === 'number' && typeof b.order === 'number') {
                return a.order - b.order;
              }
              // 然后按时间戳
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }
            // 标星会话优先
            return a.starred ? -1 : 1;
          });
          resolve(sessions);
        };
        
        request.onerror = () => reject(request.error);
        
        transaction.oncomplete = () => db.close();
      }).catch(reject);
    });
  },
  
  /**
   * 获取单个会话
   * @param sessionId 会话ID
   */
  getSession: (sessionId: string): Promise<ChatSession | undefined> => {
    return runTransaction<ChatSession | undefined>(
      STORES.SESSIONS,
      'readonly',
      (store) => store.get(sessionId)
    );
  },
  
  /**
   * 删除会话及其所有消息
   * @param sessionId 会话ID
   */
  deleteSession: (sessionId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      initDB().then(async (db) => {
        try {
          // 使用一个事务处理整个删除过程，确保原子性
          const tx = db.transaction([STORES.SESSIONS, STORES.MESSAGES], 'readwrite');
          const sessionStore = tx.objectStore(STORES.SESSIONS);
          const messagesStore = tx.objectStore(STORES.MESSAGES);
          const index = messagesStore.index('sessionId');
          
          // 删除会话
          const deleteSessionRequest = sessionStore.delete(sessionId);
          
          // 获取所有相关消息的键
          const getKeysRequest = index.getAllKeys(sessionId);
          
          getKeysRequest.onsuccess = () => {
            const keys = getKeysRequest.result;
            console.log(`删除会话 ${sessionId} 的 ${keys.length} 条消息`);
            
            // 删除所有相关消息
            keys.forEach(key => {
              messagesStore.delete(key);
            });
          };
          
          // 处理事务完成
          tx.oncomplete = () => {
            console.log(`会话 ${sessionId} 及其消息已被删除`);
            db.close();
            resolve();
          };
          
          // 处理事务错误
          tx.onerror = () => {
            console.error(`删除会话 ${sessionId} 失败:`, tx.error);
            reject(tx.error);
          };
        } catch (error) {
          console.error('删除会话时发生错误:', error);
          reject(error);
        }
      }).catch(error => {
        console.error('初始化数据库失败:', error);
        reject(error);
      });
    });
  },
  
  /**
   * 保存模板
   * @param template 模板对象
   */
  saveTemplate: (template: Template): Promise<IDBValidKey> => {
    // 确保模板有时间戳
    const templateWithTimestamp = {
      ...template,
      timestamp: template.timestamp || new Date()
    };
    
    return runTransaction<IDBValidKey>(
      STORES.TEMPLATES,
      'readwrite',
      (store) => store.put(templateWithTimestamp)
    );
  },
  
  /**
   * 获取所有模板
   */
  getAllTemplates: (): Promise<Template[]> => {
    return runTransaction<Template[]>(
      STORES.TEMPLATES,
      'readonly',
      (store) => store.getAll()
    );
  },
  
  /**
   * 删除模板
   * @param templateId 模板ID
   */
  deleteTemplate: (templateId: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      initDB().then(db => {
        const transaction = db.transaction(STORES.TEMPLATES, 'readwrite');
        const store = transaction.objectStore(STORES.TEMPLATES);
        const request = store.delete(templateId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        
        transaction.oncomplete = () => db.close();
      }).catch(reject);
    });
  },
  
  /**
   * 删除多个模板
   * @param templateIds 模板ID数组
   */
  deleteTemplates: (templateIds: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      initDB().then(db => {
        const transaction = db.transaction(STORES.TEMPLATES, 'readwrite');
        const store = transaction.objectStore(STORES.TEMPLATES);
        
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
        
        transaction.oncomplete = () => {
          db.close();
          if (!hasError) {
            resolve();
          }
        };
      }).catch(reject);
    });
  },
  
  /**
   * 搜索会话
   * @param query 搜索关键词
   */
  searchSessions: (query: string): Promise<ChatSession[]> => {
    return new Promise((resolve, reject) => {
      db.getAllSessions()
        .then(sessions => {
          if (!query.trim()) {
            resolve(sessions);
            return;
          }
          
          const lowerQuery = query.toLowerCase();
          const filtered = sessions.filter(session => 
            session.title.toLowerCase().includes(lowerQuery) || 
            session.lastMessage.toLowerCase().includes(lowerQuery)
          );
          
          resolve(filtered);
        })
        .catch(reject);
    });
  },
  
  /**
   * 搜索模板
   * @param query 搜索关键词
   */
  searchTemplates: (query: string): Promise<Template[]> => {
    return new Promise((resolve, reject) => {
      db.getAllTemplates()
        .then(templates => {
          if (!query.trim()) {
            resolve(templates);
            return;
          }
          
          const lowerQuery = query.toLowerCase();
          const filtered = templates.filter(template => 
            template.name.toLowerCase().includes(lowerQuery) || 
            template.content.toLowerCase().includes(lowerQuery)
          );
          
          resolve(filtered);
        })
        .catch(reject);
    });
  },

  /**
   * 保存模型配置
   * @param model 模型对象
   */
  saveModel: (model: Model): Promise<IDBValidKey> => {
    // 确保模型有时间戳
    const modelWithTimestamp = {
      ...model,
      timestamp: model.timestamp || new Date()
    };
    
    // 保存模型
    return runTransaction<IDBValidKey>(
      STORES.MODELS,
      'readwrite',
      (store) => store.put(modelWithTimestamp)
    );
  },
  
  /**
   * 获取所有模型
   * @param type 可选，模型类型筛选
   */
  getAllModels: (type?: 'api' | 'local'): Promise<Model[]> => {
    return new Promise((resolve, reject) => {
      initDB().then(db => {
        const transaction = db.transaction(STORES.MODELS, 'readonly');
        const store = transaction.objectStore(STORES.MODELS);
        
        let request: IDBRequest;
        
        // 如果指定了类型，使用索引查询
        if (type) {
          const index = store.index('type');
          request = index.getAll(type);
        } else {
          request = store.getAll();
        }
        
        request.onsuccess = () => {
          resolve(request.result);
        };
        
        request.onerror = () => reject(request.error);
        
        transaction.oncomplete = () => db.close();
      }).catch(reject);
    });
  },
  
  /**
   * 获取单个模型配置
   * @param modelId 模型ID
   */
  getModel: (modelId: string): Promise<Model | undefined> => {
    return runTransaction<Model | undefined>(
      STORES.MODELS,
      'readonly',
      (store) => store.get(modelId)
    );
  },
  
  /**
   * 删除模型
   * @param modelId 模型ID
   */
  deleteModel: (modelId: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      initDB().then(db => {
        const transaction = db.transaction(STORES.MODELS, 'readwrite');
        const store = transaction.objectStore(STORES.MODELS);
        const request = store.delete(modelId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        
        transaction.oncomplete = () => db.close();
      }).catch(reject);
    });
  },
  
  /**
   * 初始化默认模型（如果数据库中没有模型）
   */
  initDefaultModels: (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 先检查是否已有模型
      db.getAllModels()
        .then(models => {
          if (models.length === 0) {
            // 没有模型，添加默认模型
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
              {
                id: 'llama2',
                name: 'Llama 2',
                type: 'local',
                path: 'llama2:latest',
                timestamp: new Date()
              },
              {
                id: 'mistral',
                name: 'Mistral',
                type: 'local',
                path: 'mistral:latest',
                timestamp: new Date()
              }
            ];
            
            // 依次保存默认模型
            const savePromises = defaultModels.map(model => db.saveModel(model));
            
            Promise.all(savePromises)
              .then(() => resolve())
              .catch(reject);
          } else {
            // 已有模型，无需初始化
            resolve();
          }
        })
        .catch(reject);
    });
  },

  /**
   * 保存输入历史记录
   * @param history 输入历史记录数组
   */
  saveInputHistory: (history: string[]): Promise<IDBValidKey> => {
    const inputHistory: InputHistory = {
      id: 'input-history',  // 使用固定ID，因为只需要一条记录
      content: history,
      timestamp: new Date()
    };
    
    return runTransaction<IDBValidKey>(
      STORES.INPUT_HISTORY,
      'readwrite',
      (store) => store.put(inputHistory)
    );
  },
  
  /**
   * 获取输入历史记录
   * @returns 输入历史记录数组
   */
  getInputHistory: (): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      runTransaction<InputHistory | undefined>(
        STORES.INPUT_HISTORY,
        'readonly',
        (store) => store.get('input-history')
      )
        .then((result) => {
          if (result) {
            resolve(result.content);
          } else {
            resolve([]);
          }
        })
        .catch(reject);
    });
  }
};

export default db; 