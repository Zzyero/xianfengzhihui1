"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Trash, MoreHorizontal, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toaster, toast } from "sonner";

// 导入样式
import "../styles/TemplateManagement.css";

/**
 * 模板数据接口
 */
interface Template {
  id: string;        // 模板唯一标识
  name: string;      // 模板名称
  content: string;   // 模板内容
}

/**
 * 模板栏组件属性接口
 */
interface TemplateBarProps {
  onAddTemplate: () => void;  // 添加模板回调函数
}

/**
 * 模板栏组件
 * 用于显示和管理提示词模板，支持模板的添加、删除、编辑和使用
 */
const TemplateBar: React.FC<TemplateBarProps> = ({ onAddTemplate }) => {
  // ===== 状态管理 =====
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);  // 删除模式状态
  const [isEditMode, setIsEditMode] = useState<boolean>(false);      // 编辑模式状态
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);  // 创建模式状态
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());  // 选中的模板ID集合
  const [templates, setTemplates] = useState<Template[]>([
    { id: '1', name: '创意写作', content: '写一个关于...' },
    { id: '2', name: '代码优化', content: '优化以下代码...' },
    { id: '3', name: '故事创作', content: '创作一个故事...' },
    { id: '4', name: '文案修改', content: '修改以下文案...' },
    { id: '5', name: '翻译助手', content: '翻译以下内容...' },
    { id: '6', name: '数据分析', content: '分析以下数据...' },
  ]);

  // ===== 模板编辑状态 =====
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    content: ''
  });

  // ===== Refs =====
  const containerRef = useRef<HTMLDivElement>(null);  // 容器DOM引用
  const [visibleCount, setVisibleCount] = useState<number>(4);  // 可见模板数量
  
  /**
   * 计算可见模板数量
   */
  useEffect(() => {
    const calculateVisibleCount = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const buttonWidth = 100;     // 每个模板按钮的估计宽度（包含间距）
      const controlsWidth = 100;   // 控制按钮的总宽度
      const maxVisible = Math.floor((containerWidth - controlsWidth) / buttonWidth);
      
      setVisibleCount(Math.max(1, maxVisible)); // 至少显示1个
    };

    calculateVisibleCount();
    window.addEventListener('resize', calculateVisibleCount);
    return () => window.removeEventListener('resize', calculateVisibleCount);
  }, []);

  // 对话框关闭时重置状态
  useEffect(() => {
    if (!isEditDialogOpen) {
      // 如果对话框关闭，则退出编辑和创建模式
      setIsEditMode(false);
      setIsCreateMode(false);
    }
  }, [isEditDialogOpen]);

  // 计算可见和隐藏的模板
  const visibleTemplates = templates.slice(0, visibleCount);
  const hiddenTemplates = templates.slice(visibleCount);

  /**
   * 处理删除模式切换
   */
  const handleDeleteModeToggle = () => {
    if (isDeleteMode && selectedTemplates.size > 0) {
      // 执行删除操作
      setTemplates(templates.filter(template => !selectedTemplates.has(template.id)));
      setSelectedTemplates(new Set());
      toast.success(`已删除 ${selectedTemplates.size} 个模板`);
    }
    setIsDeleteMode(!isDeleteMode);
    setIsEditMode(false); // 退出编辑模式
    setIsCreateMode(false); // 退出创建模式
  };

  /**
   * 处理编辑模式切换
   */
  const handleEditModeToggle = () => {
    setIsEditMode(!isEditMode);
    setIsDeleteMode(false); // 退出删除模式
    setIsCreateMode(false); // 退出创建模式
  };

  /**
   * 处理模板点击
   * @param template 被点击的模板
   */
  const handleTemplateClick = (template: Template) => {
    if (isDeleteMode) {
      // 删除模式：选择/取消选择模板
      const newSelected = new Set(selectedTemplates);
      if (newSelected.has(template.id)) {
        newSelected.delete(template.id);
      } else {
        newSelected.add(template.id);
      }
      setSelectedTemplates(newSelected);
    } else if (isEditMode) {
      // 编辑模式：打开编辑对话框
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        content: template.content
      });
      setIsEditDialogOpen(true);
    } else {
      // 普通模式：复制模板内容到剪贴板
      navigator.clipboard.writeText(template.content)
        .then(() => {
          toast.success("模板内容已复制到剪贴板");
        })
        .catch(() => {
          toast.error("复制失败，请手动复制");
        });
    }
  };

  /**
   * 处理新建模板
   */
  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      content: ''
    });
    setIsEditDialogOpen(true);
    setIsCreateMode(true);
    setIsEditMode(false);
    setIsDeleteMode(false);
  };

  /**
   * 处理模板保存
   */
  const handleSaveTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) return;

    if (editingTemplate) {
      // 更新现有模板
      setTemplates(templates.map(template => 
        template.id === editingTemplate.id
          ? { ...template, ...templateForm }
          : template
      ));
      toast.success("模板已更新");
    } else {
      // 创建新模板
      const newTemplate: Template = {
        id: Date.now().toString(),
        ...templateForm
      };
      setTemplates([...templates, newTemplate]);
      toast.success("新模板已创建");
    }

    setIsEditDialogOpen(false);
  };

  /**
   * 处理对话框关闭
   */
  const handleDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      // 对话框关闭时重置状态
      setIsEditMode(false);
      setIsCreateMode(false);
    }
  };

  /**
   * 模板项组件
   * 用于渲染单个模板按钮
   */
  const TemplateBox = ({ template }: { template: Template }) => {
    const isSelected = selectedTemplates.has(template.id);
    
    return (
      <div className="template-item">
        <Button
          variant="outline"
          className={`template-button ${isDeleteMode ? 'delete-mode' : ''} ${isEditMode ? 'edit-mode' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => handleTemplateClick(template)}
        >
          {template.name}
        </Button>
      </div>
    );
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="template-bar" ref={containerRef}>
        {/* 可见模板列表 */}
        <div className="template-list">
          {visibleTemplates.map(template => (
            <TemplateBox key={template.id} template={template} />
          ))}
          
          {/* 更多模板下拉菜单 */}
          {hiddenTemplates.length > 0 && templates.length > visibleCount && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="more-button">
                  <MoreHorizontal className="more-icon" />
                  {hiddenTemplates.length}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="template-dropdown">
                {hiddenTemplates.map(template => (
                  <div key={template.id} className="p-2">
                    <TemplateBox template={template} />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {/* 控制按钮组 */}
        <div className="control-buttons">
          {/* 添加模板按钮 */}
          <Button
            variant="outline"
            onClick={handleNewTemplate}
            className={`control-button ${isCreateMode ? 'create-active' : ''}`}
          >
            <PlusCircle className="control-icon" />
          </Button>
          {/* 编辑模式按钮 */}
          <Button
            variant="outline"
            onClick={handleEditModeToggle}
            className={`control-button ${isEditMode ? 'edit-active' : ''}`}
          >
            <Edit className="control-icon" />
          </Button>
          {/* 删除模式切换按钮 */}
          <Button
            variant="outline"
            onClick={handleDeleteModeToggle}
            className={`control-button ${isDeleteMode ? 'delete-active' : ''}`}
          >
            {isDeleteMode ? (
              <Trash2 className="control-icon" />
            ) : (
              <Trash className="control-icon" />
            )}
          </Button>
        </div>
      </div>

      {/* 模板编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="template-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? '编辑模板' : '新建模板'}
            </DialogTitle>
          </DialogHeader>
          <div className="template-form">
            <div className="form-field">
              <Label htmlFor="templateName">模板名称</Label>
              <Input
                id="templateName"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入模板名称"
                className="input-text"
                style={{ color: 'var(--foreground)' }}
              />
            </div>
            <div className="form-field">
              <Label htmlFor="templateContent">模板内容</Label>
              <Textarea
                id="templateContent"
                value={templateForm.content}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="输入模板内容"
                rows={5}
                className="input-text"
                style={{ color: 'var(--foreground)' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button variant="outline" onClick={handleSaveTemplate}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TemplateBar; 