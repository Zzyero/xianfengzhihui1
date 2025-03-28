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
 * 本地模型编辑组件属性接口
 */
interface EditLocalModelProps {
  onAdd: (model: Omit<Model, 'id' | 'timestamp'> & { id?: string }) => void;
  onCancel: () => void;
  initialData?: Partial<Model>;
}

/**
 * 本地模型编辑组件
 * 提供本地模型的添加和编辑功能
 * 
 * @param {EditLocalModelProps} props - 组件属性
 * @returns {JSX.Element} 本地模型编辑表单组件
 */
const EditLocalModel: React.FC<EditLocalModelProps> = ({ onAdd, onCancel, initialData }) => {
  // ===== 状态管理 =====
  const [formData, setFormData] = useState({   
    id: initialData?.id || "",                  // 数据库ID
    name: initialData?.name || "",              // 模型名称
    path: initialData?.path || "",              // 模型路径
    parameters: initialData?.parameters || "",  // 其他参数
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});  // 表单错误信息

  /**
   * 处理表单输入变化
   * @param {string} field - 变更的字段名
   * @param {string} value - 新的字段值
   */
  const handleInputChange = (field: string, value: string) => {
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
    if (!formData.path.trim()) {
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
        type: 'local', // 固定为本地模型类型
        name: formData.name,
        path: formData.path,
        parameters: formData.parameters || undefined,
        // 对于本地模型，不需要apiId，因为使用path进行调用
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="model-form">
      <div className="space-y-4">

        
        <div className="form-field">
          <Label htmlFor="local-name">模型名称</Label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            id="local-model-name"
            placeholder="输入模型名称，如ChatGLM3、Llama 2等"
            className={errors.name ? "error" : ""}
            style={{color: '#111827', backgroundColor: 'white'}}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
          <p className="text-xs text-gray-500 mt-1">模型名称仅用于界面显示，可自定义易于识别的名称</p>
        </div>

        
        <div className="form-field">
          <Label htmlFor="local-path">模型路径</Label>
          <Input
            type="text"
            value={formData.path}
            onChange={(e) => handleInputChange('path', e.target.value)}
            required
            id="local-model-path"
            placeholder="输入模型路径，如THUDM/chatglm3-6b"
            className={errors.path ? "error" : ""}
            style={{color: '#111827', backgroundColor: 'white'}}
          />
          {errors.path && <span className="error-message">{errors.path}</span>}
          <p className="text-xs text-gray-500 mt-1">输入模型路径或模型标识符，例如: ChatGLM3-6B、THUDM/chatglm3-6b等</p>
        </div>

        {/* <div className="form-field">
          <Label htmlFor="local-parameters">其他参数 (可选)</Label>
          <Input
            type="text"
            value={formData.parameters}
            onChange={(e) => handleInputChange('parameters', e.target.value)}
            id="local-model-parameters"
            placeholder="可选: 附加参数 (JSON格式)"
            style={{color: '#111827', backgroundColor: 'white'}}
          />
          <p className="text-xs text-gray-500 mt-1">
            JSON格式，例如: {"\"temperature\":0.7,\"top_p\":0.9,\"top_k\":50,\"max_tokens\":1000"}
          </p>
        </div> */}
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

export default EditLocalModel; 