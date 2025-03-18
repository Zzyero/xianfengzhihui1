import { useAppState } from './useAppState';
import { Template } from '../service/db';
import React from 'react';

/**
 * 模板管理钩子
 * 处理模板加载、添加模板、应用模板等操作
 * 兼容旧版接口的包装器，内部使用useAppState
 */
export const useTemplates = () => {
  // 使用全局应用状态
  const { state, actions } = useAppState();
  
  // 创建兼容函数
  const setActiveTemplateId = (id: string | null) => {
    console.log('使用了旧版setActiveTemplateId接口，建议直接使用全局状态');
  };
  
  const setCustomPrompt = (prompt: string) => {
    console.log('使用了旧版setCustomPrompt接口，建议直接使用全局状态');
  };
  
  const setIsAddTemplateDialogOpen = (isOpen: boolean) => {
    console.log('使用了旧版setIsAddTemplateDialogOpen接口，建议直接使用全局状态');
  };
  
  const setNewTemplate = (template: Template | ((prev: Template) => Template)) => {
    console.log('使用了旧版setNewTemplate接口，建议直接使用全局状态');
  };

  return {
    templates: state.templates,
    setTemplates: (templates: Template[]) => {
      console.log('使用了旧版setTemplates接口，建议直接使用全局状态');
    },
    activeTemplateId: state.activeTemplateId,
    setActiveTemplateId,
    customPrompt: state.customPrompt,
    setCustomPrompt,
    isAddTemplateDialogOpen: state.isAddTemplateDialogOpen,
    setIsAddTemplateDialogOpen,
    newTemplate: state.newTemplate,
    setNewTemplate,
    handleAddTemplate: actions.handleAddTemplate,
    handleSaveTemplate: actions.handleSaveTemplate,
    handleUseTemplate: actions.handleUseTemplate,
    loadTemplates: actions.loadTemplates
  };
}; 