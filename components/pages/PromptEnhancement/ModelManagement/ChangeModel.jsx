import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import AddModel from "./EditMondel";
import { Cpu, Trash } from "lucide-react";

/**
 * 模型选择按钮组件
 * 显示当前使用的模型，点击后弹出模型选择面板
 * @param {Object} props - 组件属性
 * @param {string} props.selectedModel - 当前选中的模型
 * @param {Function} props.setSelectedModel - 设置选中模型的函数
 * @returns {JSX.Element} 模型选择按钮组件
 */
const ChangeModel = ({ selectedModel, setSelectedModel }) => {
  // 模型选择对话框状态
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  // 是否显示添加模型面板
  const [showAddModel, setShowAddModel] = useState(false);
  // 当前选择的模型类型（API或本地）
  const [modelType, setModelType] = useState("api");

  // 模型列表示例
  const apiModels = [
    { id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
    { id: "claude-3", name: "Claude 3", provider: "Anthropic" },
  ];

  const localModels = [
    { id: "llama-7b", name: "Llama 2 7B", path: "/models/llama-7b" },
    { id: "mistral-7b", name: "Mistral 7B", path: "/models/mistral-7b" },
  ];

  // 处理模型选择
  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    setIsModelDialogOpen(false);
  };

  // 处理删除模型
  const handleDeleteModel = (modelId, e) => {
    e.stopPropagation(); // 防止触发模型选择
    // 这里添加删除模型的逻辑
    console.log("删除模型:", modelId);
  };

  return (
    <>
      {/* 模型选择按钮 */}
      <Button
        variant="outline"
        className="flex items-center gap-2"
        onClick={() => setIsModelDialogOpen(true)}
      >
        <Cpu className="w-4 h-4" />
        <span>当前模型: {selectedModel}</span>
      </Button>

      {/* 模型选择对话框 */}
      <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>选择模型</DialogTitle>
          </DialogHeader>

          {showAddModel ? (
            <AddModel
              onCancel={() => setShowAddModel(false)}
              onAdd={(newModel) => {
                // 添加模型逻辑
                console.log("添加新模型:", newModel);
                setShowAddModel(false);
              }}
            />
          ) : (
            <Tabs defaultValue="api" onValueChange={setModelType}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="api" className="flex-1">API 模型</TabsTrigger>
                <TabsTrigger value="local" className="flex-1">本地模型</TabsTrigger>
              </TabsList>

              <TabsContent value="api" className="mt-0">
                <RadioGroup value={selectedModel} className="space-y-2">
                  {apiModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-3 rounded-md border hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleModelSelect(model.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={model.id} id={model.id} />
                        <Label htmlFor={model.id} className="cursor-pointer">
                          {model.name}
                          <span className="text-sm text-gray-500 ml-2">({model.provider})</span>
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 h-8"
                        onClick={(e) => handleDeleteModel(model.id, e)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
              </TabsContent>

              <TabsContent value="local" className="mt-0">
                <RadioGroup value={selectedModel} className="space-y-2">
                  {localModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-3 rounded-md border hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleModelSelect(model.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value={model.id} id={model.id} />
                        <Label htmlFor={model.id} className="cursor-pointer">
                          {model.name}
                          <span className="text-sm text-gray-500 ml-2">({model.path})</span>
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 h-8"
                        onClick={(e) => handleDeleteModel(model.id, e)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
              </TabsContent>

              <div className="mt-4 flex justify-end">
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
