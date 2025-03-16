import { useState, useEffect } from 'react';
import db from '../service/db';
import { toast } from "sonner";

/**
 * 应用初始化钩子
 * 处理应用启动时的数据加载和初始化
 */
export const useApplicationInit = (
  loadSessions: () => Promise<any[]>,
  loadTemplates: () => Promise<void>,
  createNewSession: (title?: string) => Promise<string | undefined>,
  setActiveSessionId: (id: string | undefined) => void,
  loadSessionMessages: (sessionId: string) => Promise<void>,
  setMessages: React.Dispatch<React.SetStateAction<any[]>>,
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>
) => {
  // 加载状态
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 应用初始化
  useEffect(() => {
    const initApplication = async () => {
      setIsLoading(true);
      try {
        // 确保数据库初始化
        await db.initDefaultModels();
        
        // 首先尝试获取最后使用的模型ID
        const lastUsedModelId = await db.getLastUsedModelId();
        
        if (lastUsedModelId) {
          // 如果有最后使用的模型ID，直接使用它
          setSelectedModel(lastUsedModelId);
          console.log(`使用上次选择的模型: ${lastUsedModelId}`);
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
          const newSessionId = await createNewSession("新对话");
          if (newSessionId) {
            setActiveSessionId(newSessionId);
            setMessages([]);
          }
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

  return { isLoading };
}; 