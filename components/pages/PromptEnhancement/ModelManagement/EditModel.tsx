// 导入必要的React核心模块
import { useState } from "react";

// 导入UI组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 导入类型
import { Model } from "../server/db";

// 导入样式
import "../styles/ModelManagement.css";

/**
 * 添加/编辑模型组件属性接口
 */
interface EditModelProps {
  onAdd: (model: Omit<Model, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
  initialData?: Partial<Model>;
}

/**
 * 添加/编辑模型组件
 * 支持添加API模型和本地模型，包含表单验证和提交功能
 * 
 * @param {EditModelProps} props - 组件属性
 * @returns {JSX.Element} 模型编辑表单组件
 */
const EditModel: React.FC<EditModelProps> = ({ onAdd, onCancel, initialData }) => {
  // ===== 状态管理 =====
  const [modelType, setModelType] = useState<'api' | 'local'>(initialData?.type || "api");  // 模型类型
  const [formData, setFormData] = useState({                               // 表单数据
    name: initialData?.name || "",
    provider: initialData?.provider || "",
    apiKey: initialData?.apiKey || "",
    path: initialData?.path || "",
    parameters: initialData?.parameters || "",
    isDefault: initialData?.isDefault || false
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});                               // 表单错误信息

  /**
   * 处理表单输入变化
   * @param {string} field - 变更的字段名
   * @param {string | boolean} value - 新的字段值
   */
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // 清除对应字段的错误信息
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  /**
   * 验证表单数据
   * @returns {boolean} 表单是否有效
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 通用验证
    if (!formData.name.trim()) {
      newErrors.name = "模型名称不能为空";
    }

    // API模型特定验证
    if (modelType === "api") {
      if (!formData.provider.trim()) {
        newErrors.provider = "请输入服务提供商";
      }
      if (!formData.apiKey.trim()) {
        newErrors.apiKey = "API密钥不能为空";
      }
    }

    // 本地模型特定验证
    if (modelType === "local" && !formData.path.trim()) {
      newErrors.path = "请输入模型路径";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 处理表单提交
   * @param {React.FormEvent} e - 提交事件对象
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onAdd({
        type: modelType,
        name: formData.name,
        provider: modelType === 'api' ? formData.provider : undefined,
        apiKey: modelType === 'api' ? formData.apiKey : undefined,
        path: modelType === 'local' ? formData.path : undefined,
        parameters: formData.parameters || undefined,
        isDefault: formData.isDefault
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="model-form">
      {/* 模型类型选择 */}
      <Tabs value={modelType} onValueChange={(value) => setModelType(value as 'api' | 'local')} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="api" className="flex-1">API 模型</TabsTrigger>
          <TabsTrigger value="local" className="flex-1">本地模型</TabsTrigger>
        </TabsList>

        {/* API模型表单 */}
        <TabsContent value="api" className="mt-0">
          <div className="space-y-4">
            <div className="form-field">
              <Label htmlFor="name">模型名称</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                id="model-name"
                placeholder="输入模型名称"
                className={errors.name ? "error" : ""}
                style={{color: '#111827', backgroundColor: 'white'}}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-field">
              <Label htmlFor="provider">服务提供商</Label>
              <Input
                type="text"
                value={formData.provider}
                onChange={(e) => handleInputChange('provider', e.target.value)}
                required
                id="model-provider"
                placeholder="例如: OpenAI, Anthropic"
                className={errors.provider ? "error" : ""}
                style={{color: '#111827', backgroundColor: 'white'}}
              />
              {errors.provider && <span className="error-message">{errors.provider}</span>}
            </div>

            <div className="form-field">
              <Label htmlFor="apiKey">API密钥</Label>
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                required
                id="model-api-key"
                placeholder="输入API密钥"
                className={errors.apiKey ? "error" : ""}
                autoComplete="new-password"
                style={{color: '#111827', backgroundColor: 'white'}}
              />
              {errors.apiKey && <span className="error-message">{errors.apiKey}</span>}
            </div>

            <div className="form-field">
              <Label htmlFor="parameters">其他参数 (可选)</Label>
              <Input
                type="text"
                value={formData.parameters}
                onChange={(e) => handleInputChange('parameters', e.target.value)}
                id="model-parameters"
                placeholder="可选: 附加参数 (JSON格式)"
                style={{color: '#111827', backgroundColor: 'white'}}
              />
            </div>

            <div className="form-field">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange("isDefault", e.target.checked)}
                  className="checkbox"
                />
                <Label htmlFor="isDefault">设为默认API模型</Label>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 本地模型表单 */}
        <TabsContent value="local" className="mt-0">
          <div className="space-y-4">
            <div className="form-field">
              <Label htmlFor="localName">模型名称</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                id="local-model-name"
                placeholder="输入模型名称"
                className={errors.name ? "error" : ""}
                style={{color: '#111827', backgroundColor: 'white'}}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-field">
              <Label htmlFor="path">模型路径</Label>
              <Input
                type="text"
                value={formData.path}
                onChange={(e) => handleInputChange('path', e.target.value)}
                required
                id="model-path"
                placeholder="例如: /models/llama-7b"
                className={errors.path ? "error" : ""}
                style={{color: '#111827', backgroundColor: 'white'}}
              />
              {errors.path && <span className="error-message">{errors.path}</span>}
            </div>

            <div className="form-field">
              <Label htmlFor="localParameters">其他参数 (可选)</Label>
              <Input
                type="text"
                value={formData.parameters}
                onChange={(e) => handleInputChange('parameters', e.target.value)}
                id="local-model-parameters"
                placeholder="可选: 附加参数 (JSON格式)"
                style={{color: '#111827', backgroundColor: 'white'}}
              />
            </div>

            <div className="form-field">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isLocalDefault"
                  checked={formData.isDefault}
                  onChange={(e) => handleInputChange("isDefault", e.target.checked)}
                  className="checkbox"
                />
                <Label htmlFor="isLocalDefault">设为默认本地模型</Label>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          {initialData ? "保存修改" : "添加模型"}
        </Button>
      </div>
    </form>
  );
};

export default EditModel; 