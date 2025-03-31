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
import { cn } from "@/lib/utils";

// 导入数据库工具类和模板接口
import db, { Template } from '../service/db';

// 导入样式
import "../styles/TemplateManagement.css";

/**
 * 模板栏组件属性接口
 */
interface TemplateBarProps {
  onAddTemplate: () => void;  // 添加模板回调函数
  templates?: Template[];     // 模板列表，可选
  onUseTemplate?: (template: Template) => void; // 使用模板回调函数，可选
  activeTemplateId?: string | null; // 当前激活的模板ID，可选
}

/**
 * 模板栏组件
 * 用于显示和管理提示词模板，支持模板的添加、删除、编辑和使用
 */
const TemplateBar: React.FC<TemplateBarProps> = ({ 
  onAddTemplate,
  templates: externalTemplates, 
  onUseTemplate,
  activeTemplateId
}) => {
  // ===== 状态管理 =====
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);  // 删除模式状态
  const [isEditMode, setIsEditMode] = useState<boolean>(false);      // 编辑模式状态
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);  // 创建模式状态
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set());  // 选中的模板ID集合
  const [templates, setTemplates] = useState<Template[]>([]);  // 模板列表
  const [isLoading, setIsLoading] = useState<boolean>(true);  // 加载状态

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
   * 加载所有模板
   */
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const loadedTemplates = await db.getAllTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('加载模板失败:', error);
      toast.error('加载模板失败');
    } finally {
      setIsLoading(false);
    }
  };

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

  // 组件初始化时加载模板
  useEffect(() => {
    // 如果外部提供了模板，直接使用外部模板
    if (externalTemplates) {
      setTemplates(externalTemplates);
      setIsLoading(false);
    } else {
      // 否则从数据库加载
      loadTemplates();
    }
  }, [externalTemplates]);

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
  const handleDeleteModeToggle = async () => {
    if (isDeleteMode && selectedTemplates.size > 0) {
      try {
        // 执行删除操作
        const templateIdsToDelete = Array.from(selectedTemplates);
        await db.deleteTemplates(templateIdsToDelete);
        
        // 本地状态更新，立即反映删除操作
        setTemplates(prev => prev.filter(template => !templateIdsToDelete.includes(template.id)));
        setSelectedTemplates(new Set());
        toast.success(`已删除 ${templateIdsToDelete.length} 个模板`);
      } catch (error) {
        console.error('删除模板失败:', error);
        toast.error('删除模板失败');
      }
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
   * 处理创建模式切换
   */
  const handleCreateModeToggle = () => {
    setIsCreateMode(!isCreateMode);
    setIsEditMode(false); // 退出编辑模式
    setIsDeleteMode(false); // 退出删除模式
    
    // 如果进入创建模式，打开对话框
    if (!isCreateMode) {
      handleNewTemplate();
    }
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
    } else if (isCreateMode) {
      // 创建模式下不执行操作
      return;
    } else {
      // 普通模式：使用模板或复制到剪贴板
      if (onUseTemplate) {
        // 如果提供了使用模板回调，则调用它
        onUseTemplate(template);
      } else {
        // 否则复制模板内容到剪贴板
        navigator.clipboard.writeText(template.content)
          .then(() => {
            toast.success("模板内容已复制到剪贴板");
          })
          .catch(() => {
            toast.error("复制失败，请手动复制");
          });
      }
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
  };

  /**
   * 处理模板保存
   */
  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.content.trim()) return;

    try {
      if (editingTemplate) {
        // 更新现有模板
        const updatedTemplate: Template = {
          ...editingTemplate,
          name: templateForm.name,
          content: templateForm.content,
          timestamp: new Date()
        };
        
        await db.saveTemplate(updatedTemplate);
        
        // 本地状态更新，立即反映编辑结果
        setTemplates(prev => 
          prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
        );
        
        toast.success("模板已更新");
      } else {
        // 创建新模板
        const newTemplate: Template = {
          id: Date.now().toString(),
          name: templateForm.name,
          content: templateForm.content,
          timestamp: new Date()
        };
        
        await db.saveTemplate(newTemplate);
        
        // 本地状态更新，立即添加新模板
        setTemplates(prev => [...prev, newTemplate]);
        
        toast.success("新模板已创建");
      }

      // 关闭对话框并重置状态
      setIsEditDialogOpen(false);
      setIsCreateMode(false);
    } catch (error) {
      console.error('保存模板失败:', error);
      toast.error('保存模板失败');
    }
  };

  /**
   * 处理对话框关闭
   */
  const handleDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      // 对话框关闭时重置所有状态
      setIsEditMode(false);
      setIsCreateMode(false);
      setIsDeleteMode(false);
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        content: ''
      });
    }
  };

  /**
   * 模板项组件
   * 用于渲染单个模板按钮
   */
  const TemplateBox = ({ template }: { template: Template }) => {
    const isSelected = selectedTemplates.has(template.id);
    const isActive = activeTemplateId === template.id;
    
    return (
      <div className="template-item">
        <Button
          variant={isActive ? "default" : "outline"}
          className={cn(
            "template-button",
            isDeleteMode && "delete-mode",
            isEditMode && "edit-mode",
            isCreateMode && "create-mode",
            isSelected && "selected",
            isActive && "active"
          )}
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
        {isLoading ? (
          <div className="loading-templates">加载模板中...</div>
        ) : (
          <>
            {/* 可见模板列表 */}
            <div className="template-list">
              {visibleTemplates.map(template => (
                <TemplateBox key={template.id} template={template} />
              ))}
              
              {/* 更多模板下拉菜单 */}
              {hiddenTemplates.length > 0 && templates.length > visibleCount && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="more-templates-button">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="ml-1">{hiddenTemplates.length}+</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="more-templates-content">
                    {hiddenTemplates.map(template => (
                      <div
                        key={template.id}
                        className={cn(
                          "template-dropdown-item",
                          activeTemplateId === template.id && "active"
                        )}
                        onClick={() => handleTemplateClick(template)}
                      >
                        {template.name}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* 将控制按钮组放在模板列表外部，避免被挤掉 */}
            <div className="template-controls">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "control-button",
                  isCreateMode && "create-active"
                )}
                onClick={handleCreateModeToggle}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "control-button",
                  isEditMode && "edit-active"
                )}
                onClick={handleEditModeToggle}
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "control-button",
                  isDeleteMode && "delete-active"
                )}
                onClick={handleDeleteModeToggle}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* 模板编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="DialogContent">
          <DialogHeader className="DialogHeader">
            <DialogTitle className="DialogTitle">
              {isCreateMode ? '创建新模板' : '编辑模板'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="template-form">
            <div className="form-group">
              <Label htmlFor="template-name">模板名称</Label>
              <Input
                id="template-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                placeholder="输入模板名称"
                style={{color: '#111827', backgroundColor: 'white'}}
              />
            </div>
            
            <div className="form-group">
              <Label htmlFor="template-content">模板内容</Label>
              <Textarea
                id="template-content"
                value={templateForm.content}
                onChange={(e) => setTemplateForm({...templateForm, content: e.target.value})}
                placeholder="输入模板内容"
                className="h-32"
                style={{color: '#111827', backgroundColor: 'white'}}
              />
            </div>
          </div>
          
          <DialogFooter className="DialogFooter">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={!templateForm.name.trim() || !templateForm.content.trim()}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TemplateBar; 