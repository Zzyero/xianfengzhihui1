// 导入必要的React核心模块
import { useState } from "react";

// 导入UI组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 导入类型
import { Model } from "../service/db";

// 导入样式
import "../styles/ModelManagement.css";

/**
 * API模型编辑组件属性接口
 */
interface EditModelProps {
  onAdd: (model: Omit<Model, 'id' | 'timestamp'> & { id?: string }) => void;
  onCancel: () => void;
  initialData?: Partial<Model>;
}

/**
 * API模型编辑组件
 * 提供API模型的添加和编辑功能
 * 
 * @param {EditModelProps} props - 组件属性
 * @returns {JSX.Element} API模型编辑表单组件
 */
const EditModel: React.FC<EditModelProps> = ({ onAdd, onCancel, initialData }) => {
  // ===== 状态管理 =====
  const [formData, setFormData] = useState({   
    id: initialData?.id || "",                            // 模型ID - 数据库唯一标识符
    name: initialData?.name || "",                        // 模型名称 - 用于界面展示
    apiId: initialData?.apiId || "",                      // API模型ID - 用于API调用的标识符
    url: initialData?.url || "",
    apiKey: initialData?.apiKey || "",
    parameters: initialData?.parameters || "",
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

    // 必填字段验证
    if (!formData.name.trim()) {
      newErrors.name = "模型名称不能为空";
    }
    if (!formData.apiId.trim()) {
      newErrors.apiId = "API模型ID不能为空";
    }
    if (!formData.url.trim()) {
      newErrors.url = "请输入API URL";
    }
    if (!formData.apiKey.trim()) {
      newErrors.apiKey = "API密钥不能为空";
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
        type: 'api', // 固定为API模型类型
        name: formData.name,
        apiId: formData.apiId,
        url: formData.url,
        apiKey: formData.apiKey,
        parameters: formData.parameters || undefined,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="model-form">
      <div className="space-y-4">
        {/* 模型名称 */}
        <div className="form-field">
          <Label htmlFor="name">模型名称</Label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            id="model-name"
            placeholder="输入模型名称，如GPT-4、通义千问等"
            className={errors.name ? "error" : ""}
            style={{color: '#111827', backgroundColor: 'white'}}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
          <p className="text-xs text-gray-500 mt-1">模型名称仅用于界面显示，可自定义易于识别的名称</p>
        </div>

        {/* API模型ID */}
        <div className="form-field">
          <Label htmlFor="api-model-id">API模型ID</Label>
          <Input
            type="text"
            value={formData.apiId}
            onChange={(e) => handleInputChange('apiId', e.target.value)}
            required
            id="api-model-id"
            placeholder="输入API模型ID，如gpt-4、gpt-3.5-turbo等"
            className={errors.apiId ? "error" : ""}
            style={{color: '#111827', backgroundColor: 'white'}}
          />
          {errors.apiId && <span className="error-message">{errors.apiId}</span>}
          <p className="text-xs text-gray-500 mt-1">API模型ID用于API调用，必须与API提供方的模型标识符一致</p>
        </div>

        {/* API URL */}
        <div className="form-field">
          <Label htmlFor="url">API URL</Label>
          <Input
            type="text"
            value={formData.url}
            onChange={(e) => handleInputChange('url', e.target.value)}
            required
            id="model-url"
            placeholder="例如: https://api.openai.com/v1"
            className={errors.url ? "error" : ""}
            style={{color: '#111827', backgroundColor: 'white'}}
          />
          {errors.url && <span className="error-message">{errors.url}</span>}
          <p className="text-xs text-gray-500 mt-1">请输入API完整URL，如OpenAI: https://api.openai.com/v1，或阿里云通义千问API地址</p>
        </div>

        {/* API密钥 */}
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

        {/* 其他参数 */}
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
          <p className="text-xs text-gray-500 mt-1">
            JSON格式，例如: {"\"model\":\"gpt-4\",\"temperature\":0.7,\"max_tokens\":2000"}
          </p>
        </div>
      </div>

      {/* 表单按钮 */}
      <div className="form-actions mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          保存
        </Button>
      </div>
    </form>
  );
};

export default EditModel; 