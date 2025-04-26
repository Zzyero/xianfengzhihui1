/**
 * 帮助页面状态数据库
 * 使用IndexedDB存储用户浏览帮助文档的状态
 */

// 数据库配置
const DB_NAME = 'helpDocDB';
const DB_VERSION = 1;
const DOCS_STORE = 'docsStore';

// 文档状态类型
export interface DocState {
  id: string;           // 文档ID (路径作为ID)
  scrollPosition: number; // 滚动位置
  activeHeadingId?: string; // 活跃的标题ID
  lastVisited: number;  // 最后访问时间戳
}

/**
 * 打开数据库连接
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // 数据库升级/创建
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建文档状态存储
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        const store = db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
        store.createIndex('lastVisited', 'lastVisited', { unique: false });
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
 * 保存文档状态
 * @param docPath 文档路径
 * @param scrollPosition 滚动位置
 * @param activeHeadingId 活跃的标题ID
 */
export const saveDocState = async (
  docPath: string, 
  scrollPosition: number, 
  activeHeadingId?: string
): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(DOCS_STORE, 'readwrite');
    const store = tx.objectStore(DOCS_STORE);
    
    // 保存文档状态
    await store.put({
      id: docPath,
      scrollPosition,
      activeHeadingId,
      lastVisited: Date.now()
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      
      tx.onerror = () => {
        console.error('保存文档状态失败:', tx.error);
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error('保存文档状态出错:', error);
    throw error;
  }
};

/**
 * 获取文档状态
 * @param docPath 文档路径
 */
export const getDocState = async (docPath: string): Promise<DocState | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(DOCS_STORE, 'readonly');
    const store = tx.objectStore(DOCS_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get(docPath);
      
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        console.error('获取文档状态失败:', request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('获取文档状态出错:', error);
    return null;
  }
};

/**
 * 获取最后访问的文档
 * 返回最后访问的文档路径
 */
export const getLastVisitedDoc = async (): Promise<string | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(DOCS_STORE, 'readonly');
    const store = tx.objectStore(DOCS_STORE);
    const index = store.index('lastVisited');
    
    return new Promise((resolve, reject) => {
      // 使用游标按最后访问时间降序获取一条记录
      const request = index.openCursor(null, 'prev');
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        db.close();
        
        if (cursor) {
          // 返回第一条记录（最近访问）的ID
          resolve(cursor.value.id);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('获取最后访问文档失败:', request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('获取最后访问文档出错:', error);
    return null;
  }
};

/**
 * 清除指定文档的状态
 * @param docPath 文档路径（如不提供则清除所有）
 */
export const clearDocState = async (docPath?: string): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(DOCS_STORE, 'readwrite');
    const store = tx.objectStore(DOCS_STORE);
    
    if (docPath) {
      await store.delete(docPath);
    } else {
      await store.clear();
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      
      tx.onerror = () => {
        console.error('清除文档状态失败:', tx.error);
        db.close();
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error('清除文档状态出错:', error);
    throw error;
  }
};
