import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import AddModel from "./EditModel";
import { Cpu, Trash } from "lucide-react";
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

      // 如果没有选中的模型，或所选模型不在列表中，则设置为默认模型
      if (!selectedModel || ![...apiModelsData, ...localModelsData].some(m => m.id === selectedModel)) {
        const defaultModel = await db.getDefaultModel('api');
        if (defaultModel) {
          setSelectedModel(defaultModel.id);
          setSelectedModelName(defaultModel.name);
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
      // 构建完整的模型对象
      const newModel: Model = {
        ...model,
        id: `${model.type}-${Date.now()}`,
        timestamp: new Date()
      };
      
      // 保存到数据库
      await db.saveModel(newModel);
      
      // 重新加载模型列表
      await loadModels();
      
      toast.success('模型添加成功');
      setShowAddModel(false);
    } catch (error) {
      console.error('添加模型失败:', error);
      toast.error('添加模型失败');
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

  /**
   * 设置默认模型
   * @param modelId 模型ID
   * @param e 事件对象
   */
  const handleSetAsDefault = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发模型选择
    
    try {
      // 查找模型
      const allModels = [...apiModels, ...localModels];
      const model = allModels.find(m => m.id === modelId);
      
      if (!model) {
        toast.error('找不到指定的模型');
        return;
      }
      
      // 更新模型，设置为默认
      const updatedModel: Model = {
        ...model,
        isDefault: true
      };
      
      // 保存到数据库
      await db.saveModel(updatedModel);
      
      // 重新加载模型列表
      await loadModels();
      
      toast.success(`已将 ${model.name} 设为默认模型`);
    } catch (error) {
      console.error('设置默认模型失败:', error);
      toast.error('设置默认模型失败');
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      {/* 模型选择按钮 */}
      <Button
        variant="outline"
        className="model-select-button"
        onClick={() => setIsModelDialogOpen(true)}
        disabled={isLoading}
      >
        <Cpu className="model-icon" />
        {isLoading ? (
          <span>加载模型中...</span>
        ) : (
          <span>当前模型: {selectedModelName || selectedModel}</span>
        )}
      </Button>

      {/* 模型选择对话框 */}
      <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
        <DialogContent className="DialogContent model-dialog">
          <DialogHeader className="DialogHeader">
            <DialogTitle className="DialogTitle">选择模型</DialogTitle>
          </DialogHeader>

          {/* 添加模型表单 */}
          {showAddModel ? (
            <AddModel
              onAdd={handleAddModel}
              onCancel={() => setShowAddModel(false)}
            />
          ) : (
            <div className="model-selection-container">
              <Tabs defaultValue="api" className="model-tabs" onValueChange={(value) => setModelType(value as 'api' | 'local')}>
                <TabsList className="model-tabs-list">
                  <TabsTrigger value="api" className="model-tab">API 模型</TabsTrigger>
                  <TabsTrigger value="local" className="model-tab">本地模型</TabsTrigger>
                </TabsList>

                {/* API 模型列表 */}
                <TabsContent value="api" className="model-content">
                  {apiModels.length === 0 ? (
                    <div className="no-models">没有可用的API模型</div>
                  ) : (
                    <RadioGroup value={selectedModel} onValueChange={handleModelSelect} className="model-radio-group">
                      {apiModels.map((model) => (
                        <div key={model.id} className="model-item">
                          <div className="model-radio">
                            <RadioGroupItem value={model.id} id={`api-${model.id}`} />
                            <Label htmlFor={`api-${model.id}`} className="model-label">
                              {model.name}
                              {model.isDefault && <span className="default-tag">默认</span>}
                            </Label>
                          </div>
                          <div className="model-actions">
                            {!model.isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="model-action-button set-default-button"
                                onClick={(e) => handleSetAsDefault(model.id, e)}
                                title="设为默认"
                              >
                                <span className="action-icon">★</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="model-action-button delete-button"
                              onClick={(e) => handleDeleteModel(model.id, e)}
                              title="删除模型"
                            >
                              <Trash className="action-icon" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  <Button className="add-model-button" onClick={() => setShowAddModel(true)}>
                    添加API模型
                  </Button>
                </TabsContent>

                {/* 本地模型列表 */}
                <TabsContent value="local" className="model-content">
                  {localModels.length === 0 ? (
                    <div className="no-models">没有可用的本地模型</div>
                  ) : (
                    <RadioGroup value={selectedModel} onValueChange={handleModelSelect} className="model-radio-group">
                      {localModels.map((model) => (
                        <div key={model.id} className="model-item">
                          <div className="model-radio">
                            <RadioGroupItem value={model.id} id={`local-${model.id}`} />
                            <Label htmlFor={`local-${model.id}`} className="model-label">
                              {model.name}
                              {model.isDefault && <span className="default-tag">默认</span>}
                            </Label>
                          </div>
                          <div className="model-actions">
                            {!model.isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="model-action-button set-default-button"
                                onClick={(e) => handleSetAsDefault(model.id, e)}
                                title="设为默认"
                              >
                                <span className="action-icon">★</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="model-action-button delete-button"
                              onClick={(e) => handleDeleteModel(model.id, e)}
                              title="删除模型"
                            >
                              <Trash className="action-icon" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  <Button className="add-model-button" onClick={() => setShowAddModel(true)}>
                    添加本地模型
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChangeModel; 