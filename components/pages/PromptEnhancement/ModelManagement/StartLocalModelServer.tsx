// 导入必要的React核心模块
import { useState, useEffect } from "react";

// 导入UI组件
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle, Download, X, Server } from "lucide-react";

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
  models?: string[]; // 加载的模型路径列表
}

/**
 * 启动本地模型服务组件属性接口
 */
interface StartLocalModelServerProps {
  selectedModel?: string; // 当前选中的模型ID
}

/**
 * 启动本地模型服务组件
 * 提供本地模型服务控制、模型加载和卸载功能
 */
const StartLocalModelServer: React.FC<StartLocalModelServerProps> = ({ selectedModel }) => {
  // ===== 状态管理 =====
  const [localModels, setLocalModels] = useState<Model[]>([]);                      // 本地模型列表
  const [serverStatus, setServerStatus] = useState<ServerStatus>({                  // 服务器状态
    status: 'idle',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);                        // 加载状态
  const [selectedLocalModel, setSelectedLocalModel] = useState<Model | null>(null); // 选中的本地模型
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);             // 模型加载状态
  const [isModelUnloading, setIsModelUnloading] = useState<boolean>(false);         // 模型卸载状态

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
    setServerStatus({ status: 'checking' });
    try {
      const response = await fetch('http://localhost:5000/api/system', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 设置超时
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const data = await response.json();
        setServerStatus({
          status: 'running',
          info: data.cuda || '服务正在运行',
          models: data.loaded_models || [],
        });
        return true;
      } else {
        setServerStatus({ status: 'stopped' });
        return false;
      }
    } catch (error) {
      console.error('检查服务状态失败:', error);
      setServerStatus({ status: 'stopped' });
      return false;
    }
  };

  /**
   * 启动本地模型服务
   */
  const startServer = async () => {
    // 检查是否有本地模型
    if (localModels.length === 0) {
      toast.error('没有可用的本地模型，请先添加模型');
      return;
    }

    // 设置状态为启动中
    setServerStatus({ status: 'starting' });
    toast.info('正在启动本地模型服务...');

    try {
      // 检查服务是否已启动
      const isRunning = await checkServerStatus();
      
      if (isRunning) {
        toast.success('本地模型服务已启动');
      } else {
        toast.error('启动本地模型服务失败');
      }
    } catch (error) {
      console.error('启动服务失败:', error);
      toast.error('启动本地模型服务失败');
      setServerStatus({ status: 'stopped' });
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
    
    // 设置加载中状态
    setIsModelLoading(true);
    
    try {
      // 调用模型服务加载模型
      const result = await ModelService.operateLocalModel(
        LocalModelOperation.START, 
        selectedLocalModel.path,
        selectedLocalModel.name
      );
      
      // 更新服务状态
      await checkServerStatus();
      
      // 只显示服务器返回的消息，避免重复提示
      if (result.status === 'success') {
        toast.success(result.message);
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
    // 设置卸载中状态
    setIsModelUnloading(true);
    
    try {
      // 确定要卸载的模型
      if (selectedLocalModel && selectedLocalModel.path && serverStatus.models?.includes(selectedLocalModel.path)) {
        // 如果已选择模型且该模型已加载，则卸载这个模型
        const result = await ModelService.operateLocalModel(
          LocalModelOperation.DELETE, 
          selectedLocalModel.path,
          selectedLocalModel.name
        );
        
        // 更新服务状态
        await checkServerStatus();
        
        // 显示服务器返回的消息
        if (result.status === 'success') {
          toast.success(result.message);
          // 清除选择
          setSelectedLocalModel(null);
        } else if (result.status === 'warning') {
          toast.warning(result.message);
        } else {
          toast.error(result.message);
        }
      } else if (serverStatus.models && serverStatus.models.length > 0) {
        // 如果未选择模型或选择的模型未加载，但有其他已加载模型，则卸载第一个已加载模型
        const modelPath = serverStatus.models[0];
        const modelInfo = localModels.find(m => m.path === modelPath);
        const modelName = modelInfo?.name || '未知模型';
        
        const result = await ModelService.operateLocalModel(
          LocalModelOperation.DELETE, 
          modelPath,
          modelName
        );
        
        // 更新服务状态
        await checkServerStatus();
        
        // 显示服务器返回的消息
        if (result.status === 'success') {
          toast.success(result.message);
        } else if (result.status === 'warning') {
          toast.warning(result.message);
        } else {
          toast.error(result.message);
        }
      } else {
        toast.warning('没有已加载的模型可卸载');
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
    loadLocalModels();
    checkServerStatus();
    
    // 定时检查服务状态
    const intervalId = setInterval(checkServerStatus, 30000); // 每30秒检查一次
    
    return () => {
      clearInterval(intervalId);
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

  // 获取按钮文本
  const getButtonText = () => {
    switch (serverStatus.status) {
      case 'checking':
        return '检查中...';
      case 'starting':
        return '启动中...';
      case 'running':
        return '服务运行中';
      case 'stopped':
      case 'idle':
      default:
        return '启动服务';
    }
  };

  // 获取按钮禁用状态
  const isButtonDisabled = () => {
    return serverStatus.status === 'checking' || 
           serverStatus.status === 'starting' || 
           serverStatus.status === 'running' ||
           localModels.length === 0;
  };
  
  // 检查模型是否已加载
  const isModelLoaded = () => {
    if (!selectedLocalModel || !selectedLocalModel.path) return false;
    return serverStatus.models?.includes(selectedLocalModel.path) || false;
  };

  // 获取已加载模型的显示信息
  const getLoadedModelsInfo = () => {
    if (!serverStatus.models || serverStatus.models.length === 0) {
      return '无已加载模型';
    }
    
    // 尝试将路径映射到模型名称
    const modelPathToName = new Map<string, string>();
    localModels.forEach(model => {
      if (model.path) {
        modelPathToName.set(model.path, model.name);
      }
    });
    
    // 显示格式: 模型名称 (路径)
    return serverStatus.models.map(path => {
      const name = modelPathToName.get(path) || '未知模型';
      return `${name} (${path})`;
    }).join(', ');
  };

  return (
    <div className="local-model-server">
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
        
        {serverStatus.status === 'running'  && (
          <div className="text-xs text-gray-500">
            {!(!serverStatus.models || serverStatus.models.length === 0) &&(<div className="font-medium mb-1">已加载模型:</div>)}
            <div>{getLoadedModelsInfo()}</div>
          </div>
        )}
      </div>
      
      <Button 
        variant={serverStatus.status === 'running' ? "secondary" : "default"}
        className="w-full mb-4"
        disabled={isButtonDisabled()}
        onClick={startServer}
      >
        {serverStatus.status === 'checking' || serverStatus.status === 'starting' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : serverStatus.status !== 'running' ? (
          <Server className="mr-2 h-4 w-4" />
        ) : null}
        {getButtonText()}
      </Button>
      
      {/* 模型加载和卸载按钮 */}
      {serverStatus.status === 'running' && (
        <div className="model-operations grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={isModelLoading || isModelLoaded() || !selectedLocalModel}
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
            disabled={isModelUnloading || !serverStatus.models || serverStatus.models.length === 0}
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
      
      {localModels.length === 0 && !isLoading && (
        <div className="text-xs text-amber-500 mt-2">
          未找到本地模型，请先添加模型才能启动服务
        </div>
      )}
      
      {serverStatus.status === 'running' && !selectedLocalModel && (!serverStatus.models || serverStatus.models.length === 0) && (
        <div className="text-xs text-amber-500 mt-2">
          请选择一个本地模型以进行加载操作
        </div>
      )}
    </div>
  );
};

export default StartLocalModelServer; 