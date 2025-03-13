import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import AddModel from "./EditModel";
import { Cpu, Trash } from "lucide-react";
import "../styles/ModelManagement.css";

/**
 * 模型选择按钮组件
 * 提供模型选择、管理功能，支持API模型和本地模型
 * 
 * @param {Object} props - 组件属性
 * @param {string} props.selectedModel - 当前选中的模型
 * @param {Function} props.setSelectedModel - 设置选中模型的函数
 * @returns {JSX.Element} 模型选择按钮组件
 */
const ChangeModel = ({ selectedModel, setSelectedModel }) => {
  // ===== 状态管理 =====
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);  // 模型选择对话框状态
  const [showAddModel, setShowAddModel] = useState(false);            // 添加模型面板显示状态
  const [modelType, setModelType] = useState("api");                  // 当前选择的模型类型

  // ===== 示例数据 =====
  // API模型列表
  const apiModels = [
    { id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
    { id: "claude-3", name: "Claude 3", provider: "Anthropic" },
  ];

  // 本地模型列表
  const localModels = [
    { id: "llama-7b", name: "Llama 2 7B", path: "/models/llama-7b" },
    { id: "mistral-7b", name: "Mistral 7B", path: "/models/mistral-7b" },
  ];

  /**
   * 处理模型选择
   * @param {string} modelId - 选中的模型ID
   */
  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    setIsModelDialogOpen(false);
  };

  /**
   * 处理删除模型
   * @param {string} modelId - 要删除的模型ID
   * @param {Event} e - 事件对象
   */
  const handleDeleteModel = (modelId, e) => {
    e.stopPropagation(); // 防止触发模型选择
    // TODO: 实现删除模型的逻辑
    console.log("删除模型:", modelId);
  };

  return (
    <>
      {/* 模型选择按钮 */}
      <Button
        variant="outline"
        className="model-select-button"
        onClick={() => setIsModelDialogOpen(true)}
      >
        <Cpu className="model-icon" />
        <span>当前模型: {selectedModel}</span>
      </Button>

      {/* 模型选择对话框 */}
      <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
        <DialogContent className="model-dialog">
          <DialogHeader>
            <DialogTitle className="dialog-title">选择模型</DialogTitle>
          </DialogHeader>

          {/* 添加模型表单 */}
          {showAddModel ? (
            <AddModel
              onCancel={() => setShowAddModel(false)}
              onAdd={(newModel) => {
                // TODO: 实现添加模型逻辑
                console.log("添加新模型:", newModel);
                setShowAddModel(false);
              }}
            />
          ) : (
            // 模型选择面板
            <Tabs defaultValue="api" onValueChange={setModelType}>
              {/* 模型类型切换标签 */}
              <TabsList className="w-full mb-4">
                <TabsTrigger value="api" className="flex-1">API 模型</TabsTrigger>
                <TabsTrigger value="local" className="flex-1">本地模型</TabsTrigger>
              </TabsList>

              {/* API模型列表 */}
              <TabsContent value="api" className="mt-0">
                <RadioGroup value={selectedModel} className="space-y-2">
                  {apiModels.map((model) => (
                    <div
                      key={model.id}
                      className={`model-item ${selectedModel === model.id ? 'selected' : ''}`}
                      onClick={() => handleModelSelect(model.id)}
                    >
                      <div className="model-info">
                        <RadioGroupItem value={model.id} id={model.id} />
                        <Label htmlFor={model.id} className="cursor-pointer">
                          <span className="model-name">{model.name}</span>
                          <span className="model-provider">({model.provider})</span>
                        </Label>
                      </div>
                      <div className="model-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 h-8"
                          onClick={(e) => handleDeleteModel(model.id, e)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </TabsContent>

              {/* 本地模型列表 */}
              <TabsContent value="local" className="mt-0">
                <RadioGroup value={selectedModel} className="space-y-2">
                  {localModels.map((model) => (
                    <div
                      key={model.id}
                      className={`model-item ${selectedModel === model.id ? 'selected' : ''}`}
                      onClick={() => handleModelSelect(model.id)}
                    >
                      <div className="model-info">
                        <RadioGroupItem value={model.id} id={model.id} />
                        <Label htmlFor={model.id} className="cursor-pointer">
                          <span className="model-name">{model.name}</span>
                          <span className="model-provider">({model.path})</span>
                        </Label>
                      </div>
                      <div className="model-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 h-8"
                          onClick={(e) => handleDeleteModel(model.id, e)}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </TabsContent>

              {/* 添加模型按钮 */}
              <div className="form-actions">
                <Button onClick={() => setShowAddModel(true)}>
                  添加模型
                </Button>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChangeModel;
