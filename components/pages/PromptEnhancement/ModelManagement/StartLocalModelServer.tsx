// 导入必要的React核心模块
import { useState, useEffect } from "react";

// 导入UI组件
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Play, Loader2, AlertCircle, CheckCircle } from "lucide-react";

// 导入数据库服务
import db, { Model } from "../service/db";

// 导入样式
import "../styles/ModelManagement.css";

/**
 * 本地模型服务状态
 */
interface ServerStatus {
  status: 'idle' | 'checking' | 'running' | 'stopped' | 'starting';
  info?: string;
  models?: string[];
}

/**
 * 启动本地模型服务组件属性接口
 */
interface StartLocalModelServerProps {
  selectedModel?: string; // 当前选中的模型ID
}

/**
 * 启动本地模型服务组件
 * 提供检测和启动本地模型服务的功能
 * 
 * @param {StartLocalModelServerProps} props - 组件属性
 * @returns {JSX.Element} 本地模型服务控制组件
 */
const StartLocalModelServer: React.FC<StartLocalModelServerProps> = ({ selectedModel }) => {
  // ===== 状态管理 =====
  const [localModels, setLocalModels] = useState<Model[]>([]);                      // 本地模型列表
  const [serverStatus, setServerStatus] = useState<ServerStatus>({                  // 服务器状态
    status: 'idle',
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);                        // 加载状态

  /**
   * 加载本地模型列表
   */
  const loadLocalModels = async () => {
    try {
      const models = await db.getAllModels('local');
      setLocalModels(models);
      setIsLoading(false);
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
      // 这里应该有一些后端通信逻辑来实际启动服务
      // 模拟启动过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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

  // 组件挂载时加载模型和检查服务状态
  useEffect(() => {
    loadLocalModels();
    checkServerStatus();
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
        
        {serverStatus.status === 'running' && serverStatus.models && serverStatus.models.length > 0 && (
          <div className="text-xs text-gray-500">
            已加载模型: {serverStatus.models.join(', ')}
          </div>
        )}
      </div>
      
      <Button 
        variant={serverStatus.status === 'running' ? "secondary" : "default"}
        className="w-full"
        disabled={isButtonDisabled()}
        onClick={startServer}
      >
        {serverStatus.status === 'checking' || serverStatus.status === 'starting' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : serverStatus.status !== 'running' ? (
          <Play className="mr-2 h-4 w-4" />
        ) : null}
        {getButtonText()}
      </Button>
      
      {localModels.length === 0 && !isLoading && (
        <div className="text-xs text-amber-500 mt-2">
          未找到本地模型，请先添加模型才能启动服务
        </div>
      )}
    </div>
  );
};

export default StartLocalModelServer; 