import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

/**
 * 添加模型组件
 * 用于添加新的模型配置（API或本地模型）
 * @param {Object} props - 组件属性
 * @param {Function} props.onAdd - 添加模型后的回调函数
 * @param {Function} props.onCancel - 取消添加的回调函数
 * @returns {JSX.Element} 添加模型组件
 */
const EditModel = ({ onAdd, onCancel }) => {
  // 模型类型（API或本地）
  const [modelType, setModelType] = useState("api");
  
  // 通用模型信息
  const [modelName, setModelName] = useState("");
  const [modelId, setModelId] = useState("");
  
  // API模型特有信息
  const [provider, setProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  
  // 本地模型特有信息
  const [modelPath, setModelPath] = useState("");
  const [parameters, setParameters] = useState("");

  // 表单提交处理
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const commonData = {
      id: modelId,
      name: modelName,
      type: modelType,
    };
    
    // 根据模型类型构建不同的数据结构
    const modelData = modelType === "api" 
      ? {
          ...commonData,
          provider,
          apiKey,
          endpoint: apiEndpoint,
        }
      : {
          ...commonData,
          path: modelPath,
          parameters: parameters ? JSON.parse(parameters) : {},
        };
    
    onAdd(modelData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>模型类型</Label>
        <RadioGroup 
          value={modelType} 
          onValueChange={setModelType}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="api" id="model-type-api" />
            <Label htmlFor="model-type-api">API模型</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="local" id="model-type-local" />
            <Label htmlFor="model-type-local">本地模型</Label>
          </div>
        </RadioGroup>
      </div>

      {/* 通用字段 */}
      <div className="space-y-2">
        <Label htmlFor="model-id">模型ID</Label>
        <Input 
          id="model-id" 
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          placeholder="例如: gpt-4, llama-7b"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model-name">模型名称</Label>
        <Input 
          id="model-name" 
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="例如: GPT-4, Llama 2 7B"
          required
        />
      </div>

      {/* API模型特有字段 */}
      {modelType === "api" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="provider">提供商</Label>
            <Input 
              id="provider" 
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="例如: OpenAI, Anthropic"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API密钥</Label>
            <Input 
              id="api-key" 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入API密钥"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-endpoint">API端点</Label>
            <Input 
              id="api-endpoint" 
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="例如: https://api.openai.com/v1"
              required
            />
          </div>
        </>
      )}

      {/* 本地模型特有字段 */}
      {modelType === "local" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="model-path">模型路径</Label>
            <Input 
              id="model-path" 
              value={modelPath}
              onChange={(e) => setModelPath(e.target.value)}
              placeholder="例如: /models/llama-7b"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parameters">模型参数 (JSON格式)</Label>
            <Textarea 
              id="parameters" 
              value={parameters}
              onChange={(e) => setParameters(e.target.value)}
              placeholder='{"temperature": 0.7, "top_p": 0.9}'
              rows={4}
            />
          </div>
        </>
      )}

      {/* 按钮组 */}
      <div className="flex justify-end space-x-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          添加模型
        </Button>
      </div>
    </form>
  );
};

export default EditModel;
