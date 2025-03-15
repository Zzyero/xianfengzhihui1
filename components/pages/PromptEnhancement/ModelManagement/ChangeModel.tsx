import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import AddModel from "./EditModel";
import { Cpu, Trash, Edit } from "lucide-react";
import "../styles/ModelManagement.css";
import db, { Model } from "../server/db";
import { Toaster, toast } from "sonner";

/**
 * 模型选择按钮组件属性接口
 */
interface ChangeModelProps {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
}

/**
 * 模型选择按钮组件
 * 提供模型选择、管理功能，支持API模型和本地模型
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.selectedModel - 当前选中的模型
 * @param {Function} props.setSelectedModel - 设置选中模型的函数
 * @returns {JSX.Element} 模型选择按钮组件
 */
const ChangeModel: React.FC<ChangeModelProps> = ({ selectedModel, setSelectedModel }) => {
  // ===== 状态管理 =====
  const [isModelDialogOpen, setIsModelDialogOpen] = useState<boolean>(false);  // 模型选择对话框状态
  const [showAddModel, setShowAddModel] = useState<boolean>(false);            // 添加模型面板显示状态
  const [editingModel, setEditingModel] = useState<Model | null>(null);        // 正在编辑的模型
  const [modelType, setModelType] = useState<'api' | 'local'>("api");          // 当前选择的模型类型
  const [apiModels, setApiModels] = useState<Model[]>([]);                     // API模型列表
  const [localModels, setLocalModels] = useState<Model[]>([]);                 // 本地模型列表
  const [isLoading, setIsLoading] = useState<boolean>(true);                   // 加载状态
  const [selectedModelName, setSelectedModelName] = useState<string>("");      // 当前选中模型名称

  /**
   * 加载模型数据
   */
  const loadModels = async () => {
    setIsLoading(true);
    try {
      // 初始化默认模型（如果数据库为空）
      await db.initDefaultModels();

      // 加载API模型
      const apiModelsData = await db.getAllModels('api');
      setApiModels(apiModelsData);

      // 加载本地模型
      const localModelsData = await db.getAllModels('local');
      setLocalModels(localModelsData);

      // 如果没有选中的模型，或所选模型不在列表中，则设置为第一个API模型
      if (!selectedModel || ![...apiModelsData, ...localModelsData].some(m => m.id === selectedModel)) {
        if (apiModelsData.length > 0) {
          setSelectedModel(apiModelsData[0].id);
          setSelectedModelName(apiModelsData[0].name);
        } else if (localModelsData.length > 0) {
          // 如果没有API模型，则选择第一个本地模型
          setSelectedModel(localModelsData[0].id);
          setSelectedModelName(localModelsData[0].name);
        }
      } else {
        // 查找当前选中模型的名称
        const currentModel = [...apiModelsData, ...localModelsData].find(m => m.id === selectedModel);
        if (currentModel) {
          setSelectedModelName(currentModel.name);
        }
      }
    } catch (error) {
      console.error('加载模型失败:', error);
      toast.error('加载模型配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 组件挂载时加载模型
  useEffect(() => {
    loadModels();
  }, [selectedModel]); // 当selectedModel变化时重新加载

  /**
   * 处理模型选择
   * @param {string} modelId - 选中的模型ID
   */
  const handleModelSelect = (modelId: string) => {
    // 避免重复选择当前模型
    if (modelId === selectedModel) {
      setIsModelDialogOpen(false);
      return;
    }
    
    setSelectedModel(modelId);
    
    // 更新选中模型名称
    const allModels = [...apiModels, ...localModels];
    const model = allModels.find(m => m.id === modelId);
    if (model) {
      setSelectedModelName(model.name);
    }
    
    setIsModelDialogOpen(false);
  };

  /**
   * 处理添加模型
   * @param model 新模型数据
   */
  const handleAddModel = async (model: Omit<Model, 'id' | 'timestamp'>) => {
    try {
      // 如果是编辑模式，保留原有ID
      const isEditing = !!editingModel;
      const modelId = isEditing ? editingModel.id : `${model.type}-${Date.now()}`;
      
      // 构建完整的模型对象
      const newModel: Model = {
        ...model,
        id: modelId,
        timestamp: new Date()
      };
      
      // 保存到数据库
      await db.saveModel(newModel);
      
      // 重新加载模型列表
      await loadModels();
      
      toast.success(isEditing ? '模型更新成功' : '模型添加成功');
      setShowAddModel(false);
      setEditingModel(null);
    } catch (error) {
      console.error(editingModel ? '更新模型失败:' : '添加模型失败:', error);
      toast.error(editingModel ? '更新模型失败' : '添加模型失败');
    }
  };

  /**
   * 处理编辑模型
   * @param {string} modelId - 要编辑的模型ID
   * @param {React.MouseEvent} e - 事件对象
   */
  const handleEditModel = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发模型选择
    
    try {
      // 查找模型
      const allModels = [...apiModels, ...localModels];
      const model = allModels.find(m => m.id === modelId);
      
      if (!model) {
        toast.error('找不到指定的模型');
        return;
      }
      
      // 设置编辑模式
      setEditingModel(model);
      setModelType(model.type);
      setShowAddModel(true);
    } catch (error) {
      console.error('编辑模型失败:', error);
      toast.error('编辑模型失败');
    }
  };

  /**
   * 处理删除模型
   * @param {string} modelId - 要删除的模型ID
   * @param {React.MouseEvent} e - 事件对象
   */
  const handleDeleteModel = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发模型选择
    
    try {
      // 检查是否为当前选中的模型
      if (modelId === selectedModel) {
        toast.error('无法删除当前正在使用的模型');
        return;
      }
      
      // 删除模型
      await db.deleteModel(modelId);
      
      // 重新加载模型列表
      await loadModels();
      
      toast.success('模型已删除');
    } catch (error) {
      console.error('删除模型失败:', error);
      toast.error('删除模型失败');
    }
  };

  // 当对话框关闭时，重置编辑状态
  const handleDialogOpenChange = (open: boolean) => {
    setIsModelDialogOpen(open);
    if (!open) {
      setEditingModel(null);
      setShowAddModel(false);
    }
  };

  // 取消添加/编辑模型
  const handleCancelEdit = () => {
    setShowAddModel(false);
    setEditingModel(null);
  };

  return (
    <>
      <Toaster position="top-center" />
      {/* 模型选择按钮 */}
      <Button
        variant="outline"
        className="model-select-button"
        onClick={() => setIsModelDialogOpen(true)}
      >
        <Cpu className="mr-2 h-4 w-4" />
        <span>模型: {isLoading ? "加载中..." : selectedModelName}</span>
      </Button>

      {/* 模型选择对话框 */}
      <Dialog open={isModelDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="model-dialog-content">
          <DialogHeader>
            <DialogTitle>{editingModel ? '编辑模型' : showAddModel ? '添加模型' : '选择模型'}</DialogTitle>
          </DialogHeader>

          {showAddModel ? (
            <AddModel
              onAdd={handleAddModel}
              onCancel={handleCancelEdit}
              initialData={editingModel || undefined}
            />
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                选择一个模型来处理您的请求。您可以添加API模型（如OpenAI、阿里云通义千问等）或本地模型（使用Ollama）。
              </p>
              <Tabs value={modelType} onValueChange={(value) => setModelType(value as 'api' | 'local')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="api">API 模型</TabsTrigger>
                  <TabsTrigger value="local">本地模型</TabsTrigger>
                </TabsList>

                {/* API模型列表 */}
                <TabsContent value="api" className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-4">加载中...</div>
                  ) : apiModels.length === 0 ? (
                    <div className="text-center py-4">暂无API模型，请添加</div>
                  ) : (
                    <RadioGroup value={selectedModel} className="space-y-2">
                      {apiModels.map((model) => (
                        <div
                          key={model.id}
                          className={`model-item ${model.id === selectedModel ? 'selected' : ''}`}
                          onClick={() => handleModelSelect(model.id)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <RadioGroupItem value={model.id} id={model.id} />
                              <Label htmlFor={model.id} className="ml-2 cursor-pointer">
                                {model.name}
                              </Label>
                            </div>
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="edit-button"
                                onClick={(e) => handleEditModel(model.id, e)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="delete-button"
                                onClick={(e) => handleDeleteModel(model.id, e)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {model.id === selectedModel && (
                            <div className="model-details">
                              <p><strong>URL:</strong> {model.url || '未设置'}</p>
                              <p><strong>API Key:</strong> {model.apiKey ? '******' : '未设置'}</p>
                              {model.parameters && <p><strong>参数:</strong> {model.parameters}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  <Button variant="secondary" className="w-full" onClick={() => setShowAddModel(true)}>
                    添加API模型
                  </Button>
                </TabsContent>

                {/* 本地模型列表 */}
                <TabsContent value="local" className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-4">加载中...</div>
                  ) : localModels.length === 0 ? (
                    <div className="text-center py-4">暂无本地模型，请添加</div>
                  ) : (
                    <RadioGroup value={selectedModel} className="space-y-2">
                      {localModels.map((model) => (
                        <div
                          key={model.id}
                          className={`model-item ${model.id === selectedModel ? 'selected' : ''}`}
                          onClick={() => handleModelSelect(model.id)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                              <RadioGroupItem value={model.id} id={model.id} />
                              <Label htmlFor={model.id} className="ml-2 cursor-pointer">
                                {model.name}
                              </Label>
                            </div>
                            <div className="flex items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="edit-button"
                                onClick={(e) => handleEditModel(model.id, e)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="delete-button"
                                onClick={(e) => handleDeleteModel(model.id, e)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {model.id === selectedModel && (
                            <div className="model-details">
                              <p><strong>路径:</strong> {model.path || '未设置'}</p>
                              {model.parameters && <p><strong>参数:</strong> {model.parameters}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  <Button variant="secondary" className="w-full" onClick={() => setShowAddModel(true)}>
                    添加本地模型
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChangeModel; 