// 导入必要的React核心模块
import { useState, useEffect, useRef } from "react";

// 导入UI组件
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, Download, X } from "lucide-react";

// 导入数据库服务和模型服务
import db, { Model } from "../service/db";
import ModelService, { LocalModelOperation } from "../service/modelService";

// 导入样式
import "../styles/ModelManagement.css";

/**
 * 本地模型服务状态
 */
interface ServerStatus {
  status: 'idle' | 'checking' | 'running' | 'stopped' | 'starting';
  info?: string;
  models?: string[] | string; // 加载的模型路径列表或单个路径
  loading?: boolean; // 表示模型是否已加载，true表示已加载，false表示未加载
}

/**
 * 启动本地模型服务组件属性接口
 */
interface StartLocalModelServerProps {
  selectedModel?: string; // 当前选中的模型ID
  onClose?: () => void; // 关闭表单的回调函数
}

/**
 * 创建一个防抖函数
 * @param fn 要执行的函数
 * @param delay 延迟时间
 */
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * 启动本地模型服务组件
 * 提供本地模型服务控制、模型加载和卸载功能
 */
const StartLocalModelServer: React.FC<StartLocalModelServerProps> = ({ 
  selectedModel, 
  onClose 
}) => {
  // ===== 状态管理 =====
  const [localModels, setLocalModels] = useState<Model[]>([]);              // 本地模型列表
  const [serverStatus, setServerStatus] = useState<ServerStatus>({          // 服务器状态
    status: 'idle',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);                // 加载状态
  const [selectedLocalModel, setSelectedLocalModel] = useState<Model | null>(null); // 选中的本地模型
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);     // 模型加载状态
  const [isModelUnloading, setIsModelUnloading] = useState<boolean>(false); // 模型卸载状态
  
  // 使用ref跟踪请求状态，防止重复请求
  const isCheckingServerStatus = useRef<boolean>(false);
  const lastCheckTime = useRef<number>(0);
  const checkInterval = useRef<NodeJS.Timeout | null>(null);

  /**
   * 加载本地模型列表
   */
  const loadLocalModels = async () => {
    try {
      const models = await db.getAllModels('local');
      setLocalModels(models);
      setIsLoading(false);
      
      // 如果有选中的模型ID，找到对应的模型
      if (selectedModel) {
        const model = models.find(m => m.id === selectedModel);
        if (model) {
          setSelectedLocalModel(model);
        }
      }
    } catch (error) {
      console.error('加载本地模型失败:', error);
      toast.error('加载本地模型配置失败');
      setIsLoading(false);
    }
  };

  /**
   * 检查本地模型服务是否运行
   */
  const checkServerStatus = async () => {
    // 防止重复请求：如果当前有检查正在进行，直接返回
    if (isCheckingServerStatus.current) {
      console.log('跳过重复的服务器状态检查，因为已有一个检查正在进行');
      return false;
    }
    
    // 防止频繁请求：如果距离上次检查不足5秒，则跳过
    const now = Date.now();
    if (now - lastCheckTime.current < 5000) {
      console.log(`跳过频繁的服务器状态检查，距上次检查仅${now - lastCheckTime.current}ms`);
      return false;
    }
    
    // 设置检查状态标志和时间戳
    isCheckingServerStatus.current = true;
    lastCheckTime.current = now;
    
    // 生成唯一请求ID
    const requestId = `status_${now}`;
    console.log(`开始检查服务器状态 [ID:${requestId}]`);
    
    setServerStatus({ status: 'checking' });
    
    try {
      const response = await fetch('http://localhost:5000/api/system', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId, // 添加请求ID头
          'Cache-Control': 'no-cache' // 禁用缓存
        },
        // 设置超时
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        // 确保models始终是数组
        const models = data.loaded_models 
          ? (Array.isArray(data.loaded_models) ? data.loaded_models : [data.loaded_models]) 
          : [];
        
        // 根据是否有加载的模型来设置loading状态
        const hasLoadedModel = models && models.length > 0;
        
        setServerStatus({
          status: 'running',
          info: data.cuda || '服务正在运行',
          models: models,
          loading: hasLoadedModel // 有加载的模型时为true，否则为false
        });
        
        console.log(`服务器状态检查完成 [ID:${requestId}]: 运行中，已加载模型: ${hasLoadedModel}`);
        isCheckingServerStatus.current = false;
        return true;
      } else {
        console.log(`服务器状态检查完成 [ID:${requestId}]: 已停止`);
        setServerStatus({ status: 'stopped' });
        isCheckingServerStatus.current = false;
        return false;
      }
    } catch (error) {
      console.error(`检查服务状态失败 [ID:${requestId}]:`, error);
      setServerStatus({ status: 'stopped' });
      isCheckingServerStatus.current = false;
      return false;
    }
  };
  
  /**
   * 加载选中的模型
   */
  const loadModel = async () => {
    if (!selectedLocalModel) {
      toast.error('请先选择要加载的模型');
      return;
    }
    
    if (!selectedLocalModel.path) {
      toast.error('所选模型缺少路径信息');
      return;
    }
    
    // 防止重复操作：如果当前有加载操作正在进行，直接返回
    if (isModelLoading) {
      console.log('跳过重复的模型加载请求，因为已有一个加载操作正在进行');
      return;
    }
    
    // 设置加载中状态
    setIsModelLoading(true);
    
    try {
      console.log(`开始加载模型: ${selectedLocalModel.name}, 路径: ${selectedLocalModel.path}`);
      
      // 调用模型服务加载模型
      const result = await ModelService.operateLocalModel(
        LocalModelOperation.START, 
        selectedLocalModel.path,
        selectedLocalModel.name
      );
      
      console.log(`模型加载请求结果:`, result);
      
      // 更新服务状态 (在短暂延迟后检查，给服务器一些时间完全设置模型)
      setTimeout(async () => {
        await checkServerStatus();
      }, 1000);
      
      // 显示服务器返回的消息
      if (result.status === 'success') {
        toast.success(result.message);
        // 操作成功后退出表单
        if (onClose) onClose();
      } else if (result.status === 'warning') {
        toast.warning(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('加载模型失败:', error);
      toast.error(`加载模型失败: ${error.message || '未知错误'}`);
    } finally {
      setIsModelLoading(false);
    }
  };
  
  /**
   * 卸载当前加载的模型
   */
  const unloadModel = async () => {
    // 防止重复操作：如果当前有卸载操作正在进行，直接返回
    if (isModelUnloading) {
      console.log('跳过重复的模型卸载请求，因为已有一个卸载操作正在进行');
      return;
    }
    
    // 设置卸载中状态
    setIsModelUnloading(true);
    
    try {
      // 获取需要卸载的模型路径
      let modelPath: string | undefined;
      let modelName: string = '未知模型';
      
      if (serverStatus.models) {
        // 如果选中的模型已加载，优先卸载选中的模型
        if (selectedLocalModel?.path && 
            (Array.isArray(serverStatus.models) 
              ? serverStatus.models.includes(selectedLocalModel.path)
              : serverStatus.models === selectedLocalModel.path)) {
          modelPath = selectedLocalModel.path;
          modelName = selectedLocalModel.name;
        } else {
          // 否则卸载第一个已加载的模型
          modelPath = Array.isArray(serverStatus.models) 
            ? serverStatus.models[0] 
            : serverStatus.models;
            
          // 尝试从本地模型列表中找到模型名称
          const modelInfo = localModels.find(m => m.path === modelPath);
          if (modelInfo) {
            modelName = modelInfo.name;
          }
        }
      }
      
      if (!modelPath) {
        toast.warning('没有已加载的模型可卸载');
        setIsModelUnloading(false);
        return;
      }
      
      console.log(`开始卸载模型: ${modelName}, 路径: ${modelPath}`);
      
      // 调用卸载API
      const result = await ModelService.operateLocalModel(
        LocalModelOperation.DELETE, 
        modelPath,
        modelName
      );
      
      console.log(`模型卸载请求结果:`, result);
      
      // 更新服务状态 (在短暂延迟后检查，给服务器一些时间完全释放资源)
      setTimeout(async () => {
        await checkServerStatus();
      }, 2000);
      
      // 显示结果
      if (result.status === 'success') {
        toast.success(result.message);
        // 操作成功后退出表单
        if (onClose) onClose();
      } else if (result.status === 'warning') {
        toast.warning(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('卸载模型失败:', error);
      toast.error(`卸载模型失败: ${error.message || '未知错误'}`);
    } finally {
      setIsModelUnloading(false);
    }
  };
  
  // 当选中的模型ID变化时，更新选中的本地模型
  useEffect(() => {
    if (selectedModel && localModels.length > 0) {
      const model = localModels.find(m => m.id === selectedModel);
      if (model) {
        setSelectedLocalModel(model);
      }
    }
  }, [selectedModel, localModels]);

  // 组件挂载时加载模型和检查服务状态
  useEffect(() => {
    // 加载本地模型列表
    loadLocalModels();
    
    // 初始检查服务状态
    checkServerStatus();
    
    // 创建防抖的检查函数
    const debouncedCheck = debounce(checkServerStatus, 500);
    
    // 设置定时检查服务状态
    checkInterval.current = setInterval(() => {
      debouncedCheck();
    }, 30000); // 每30秒检查一次
    
    return () => {
      // 清理定时器
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    };
  }, []);

  // 渲染状态图标
  const renderStatusIcon = () => {
    switch (serverStatus.status) {
      case 'checking':
      case 'starting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'stopped':
      case 'idle':
      default:
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  // 获取已加载模型的显示信息
  const getLoadedModelsInfo = () => {
    if (!serverStatus.models || (Array.isArray(serverStatus.models) && serverStatus.models.length === 0)) {
      return '无已加载模型';
    }
    
    // 确保models是数组
    const modelsList = Array.isArray(serverStatus.models) 
      ? serverStatus.models 
      : [serverStatus.models];
    
    // 尝试将路径映射到模型名称
    const modelPathToName = new Map<string, string>();
    localModels.forEach(model => {
      if (model.path) {
        modelPathToName.set(model.path, model.name);
      }
    });
    
    // 显示格式: 模型名称 (路径)
    return modelsList.map((path: string) => {
      const name = modelPathToName.get(path) || '未知模型';
      return `${name} (${path})`;
    }).join(', ');
  };

  return (
    <div className="local-model-server">
      {/* 服务状态信息 */}
      <div className="server-status-container mb-4">
        <div className="flex items-center gap-2 mb-2">
          {renderStatusIcon()}
          <span className="text-sm font-medium">
            {serverStatus.status === 'running' ? '服务状态: 运行中' : '服务状态: 未运行'}
          </span>
        </div>
        
        {serverStatus.status === 'running' && serverStatus.info && (
          <div className="text-xs text-gray-500 mb-2">
            {serverStatus.info}
          </div>
        )}
        
        {serverStatus.status === 'running' && (
          <div className="text-xs text-gray-500">
            {serverStatus.models && (
              <>
                <div className="font-medium mb-1">已加载模型:</div>
                <div>{getLoadedModelsInfo()}</div>
              </>
            )}
            {!serverStatus.models && <div>无已加载模型</div>}
          </div>
        )}
      </div>
      
      {/* 模型加载和卸载按钮 */}
      {serverStatus.status === 'running' && (
        <div className="model-operations grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={isModelLoading || serverStatus.loading || !selectedLocalModel}
            onClick={loadModel}
            className="flex-1"
          >
            {isModelLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            加载模型
          </Button>
          
          <Button
            variant="outline"
            disabled={isModelUnloading || !serverStatus.loading}
            onClick={unloadModel}
            className="flex-1"
          >
            {isModelUnloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            卸载模型
          </Button>
        </div>
      )}
      
      {/* 选中模型信息 */}
      {serverStatus.status === 'running' && selectedLocalModel && (
        <div className="selected-model-info mt-3 text-xs">
          <div className="font-medium">当前选中模型:</div>
          <div className="text-gray-700">模型名称: {selectedLocalModel.name}</div>
          <div className="text-gray-700">模型路径: {selectedLocalModel.path}</div>
        </div>
      )}
      
      {/* 提示信息 */}
      {localModels.length === 0 && !isLoading && (
        <div className="text-xs text-amber-500 mt-2">
          未找到本地模型，请先添加模型才能启动服务
        </div>
      )}
      
      {serverStatus.status === 'running' && !selectedLocalModel && !serverStatus.models && (
        <div className="text-xs text-amber-500 mt-2">
          请选择一个本地模型以进行加载操作
        </div>
      )}
    </div>
  );
};

export default StartLocalModelServer; 