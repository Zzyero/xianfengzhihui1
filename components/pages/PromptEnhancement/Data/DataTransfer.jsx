// components/pages/PromptEnhancement/Data/DataTransfer.jsx
"use client";

/**
 * 数据导入导出组件
 * 提供导入和导出应用数据的功能
 * 支持会话、模板、模型配置等数据的备份和恢复
 */
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DownloadIcon, UploadIcon, Settings2Icon } from "lucide-react";
import db from '../service/db';

/**
 * 数据导入导出组件
 * @returns {JSX.Element} 导入导出组件
 */
const ExportData = () => {
  // 对话框开关状态
  const [open, setOpen] = useState(false);
  // 导出选项状态
  const [exportOptions, setExportOptions] = useState({
    sessions: true,
    messages: true,
    templates: true,
    models: true,
    settings: true
  });

  /**
   * 处理导出数据
   * 将选中的数据导出为JSON文件
   */
  const handleExport = async () => {
    try {
      const exportData = {};
      
      // 根据用户选择，导出不同类型的数据
      if (exportOptions.sessions) {
        exportData.sessions = await db.getAllSessions();
      }
      
      if (exportOptions.messages && exportOptions.sessions) {
        // 如果导出会话，同时导出会话中的消息
        const allMessages = [];
        const sessions = await db.getAllSessions();
        
        for (const session of sessions) {
          const messages = await db.getMessagesBySession(session.id);
          allMessages.push(...messages);
        }
        
        exportData.messages = allMessages;
      }
      
      if (exportOptions.templates) {
        exportData.templates = await db.getAllTemplates();
      }
      
      if (exportOptions.models) {
        exportData.models = await db.getAllModels();
      }
      
      if (exportOptions.settings) {
        const lastUsedModelId = await db.getLastUsedModelId();
        exportData.settings = { 
          id: 'app-settings',
          lastUsedModelId,
          timestamp: new Date()
        };
      }
      
      // 创建并下载JSON文件
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-enhancement-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setOpen(false);
      toast.success('数据导出成功');
    } catch (error) {
      console.error('导出数据失败:', error);
      toast.error('导出数据失败');
    }
  };

  /**
   * 处理导入数据
   * 从JSON文件导入数据到应用
   * @param {Event} e - 文件输入事件
   */
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importData = JSON.parse(event.target.result);
        
        // 导入模型
        if (importData.models && Array.isArray(importData.models)) {
          for (const model of importData.models) {
            await db.saveModel(model);
          }
        }
        
        // 导入模板
        if (importData.templates && Array.isArray(importData.templates)) {
          for (const template of importData.templates) {
            await db.saveTemplate(template);
          }
        }
        
        // 导入会话
        if (importData.sessions && Array.isArray(importData.sessions)) {
          for (const session of importData.sessions) {
            await db.saveSession(session);
          }
        }
        
        // 导入消息
        if (importData.messages && Array.isArray(importData.messages)) {
          for (const message of importData.messages) {
            await db.addMessage(message);
          }
        }
        
        // 导入设置
        if (importData.settings && importData.settings.lastUsedModelId) {
          await db.saveLastUsedModelId(importData.settings.lastUsedModelId);
        }
        
        setOpen(false);
        toast.success('数据导入成功');
        
        // 提示用户刷新页面以加载导入的数据
        if (confirm('数据导入成功，需要刷新页面以加载数据。是否立即刷新？')) {
          window.location.reload();
        }
      } catch (error) {
        setOpen(false);
        console.error('导入数据失败:', error);
        toast.error(`导入数据失败，请检查文件格式。\n${error}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setOpen(true)}
        title="导入/导出数据"
      >
        <Settings2Icon className="h-5 w-5" />
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>数据导入导出</DialogTitle>
            <DialogDescription>
              导入或导出应用数据，方便备份和恢复
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="export">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export">导出数据</TabsTrigger>
              <TabsTrigger value="import">导入数据</TabsTrigger>
            </TabsList>
            
            <TabsContent value="export" className="pt-4">
              <div className="space-y-4">
                <div className="text-sm">选择要导出的数据：</div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sessions" 
                    checked={exportOptions.sessions}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, sessions: checked})
                    }
                  />
                  <Label htmlFor="sessions">会话记录</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="messages" 
                    checked={exportOptions.messages}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, messages: checked})
                    }
                    disabled={!exportOptions.sessions}
                  />
                  <Label htmlFor="messages">会话消息</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="templates" 
                    checked={exportOptions.templates}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, templates: checked})
                    }
                  />
                  <Label htmlFor="templates">提示词模板</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="models" 
                    checked={exportOptions.models}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, models: checked})
                    }
                  />
                  <Label htmlFor="models">模型配置</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="settings" 
                    checked={exportOptions.settings}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, settings: checked})
                    }
                  />
                  <Label htmlFor="settings">应用设置</Label>
                </div>
                
                <Button className="w-full" onClick={handleExport}>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  导出数据
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="import" className="pt-4">
              <div className="space-y-4">
                <div className="text-sm">
                  导入之前导出的数据文件（.json格式）。导入将会合并现有数据，不会删除原有数据。
                </div>
                
                <div className="flex flex-col space-y-4">
                  <input
                    type="file"
                    id="importFile"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button 
                    className="w-full" 
                    onClick={() => document.getElementById('importFile').click()}
                  >
                    <UploadIcon className="mr-2 h-4 w-4" />
                    选择并导入文件
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExportData;