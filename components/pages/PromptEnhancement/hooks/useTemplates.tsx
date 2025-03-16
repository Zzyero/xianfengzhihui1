import { useState } from 'react';
import { Template } from '../service/db';
import db from '../service/db';
import { toast } from "sonner";

/**
 * 模板管理钩子
 * 处理模板加载、添加模板、应用模板等操作
 */
export const useTemplates = () => {
  // 模板状态
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isAddTemplateDialogOpen, setIsAddTemplateDialogOpen] = useState<boolean>(false);
  const [newTemplate, setNewTemplate] = useState<Template>({ id: '', name: '', content: '' });

  /**
   * 处理添加模板
   */
  const handleAddTemplate = (): void => {
    setIsAddTemplateDialogOpen(true);
  };

  /**
   * 保存新模板
   */
  const handleSaveTemplate = async (): Promise<void> => {
    try {
      // 生成ID
      const templateToSave: Template = {
        ...newTemplate,
        id: newTemplate.id || Date.now().toString()
      };
      
      // 保存模板到数据库
      await db.saveTemplate(templateToSave);
      
      // 重新加载模板列表
      loadTemplates();
      
      // 关闭对话框并重置状态
      setIsAddTemplateDialogOpen(false);
      setNewTemplate({ id: '', name: '', content: '' });
      
      toast.success('模板保存成功');
    } catch (error) {
      console.error('保存模板失败:', error);
      toast.error('保存模板失败');
    }
  };
  
  /**
   * 处理使用模板
   * @param template 要使用的模板
   */
  const handleUseTemplate = (template: Template): void => {
    // 如果当前模板已经被选中，就取消选中并重置自定义提示词
    if (activeTemplateId === template.id) {
      setActiveTemplateId(null);
      setCustomPrompt('');
      toast.info(`已取消模板: ${template.name}`);
    } else {
      // 选中新模板，设置自定义提示词
      setActiveTemplateId(template.id);
      setCustomPrompt(template.content);
      toast.success(`已应用模板: ${template.name}`);
    }
  };
  
  /**
   * 加载模板列表
   */
  const loadTemplates = async (): Promise<void> => {
    try {
      const loadedTemplates = await db.getAllTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      console.error('加载模板失败:', error);
      toast.error('加载模板失败');
    }
  };

  return {
    templates,
    setTemplates,
    activeTemplateId,
    setActiveTemplateId,
    customPrompt,
    setCustomPrompt,
    isAddTemplateDialogOpen,
    setIsAddTemplateDialogOpen,
    newTemplate,
    setNewTemplate,
    handleAddTemplate,
    handleSaveTemplate,
    handleUseTemplate,
    loadTemplates
  };
}; 