"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import { useAppState } from '../service/useAppState';
import "../styles/ModelManagement.css";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * 禁用历史记录组件
 * 用于切换是否启用聊天历史记录功能
 */
const DisableHistory: React.FC = () => {
  const { state, actions } = useAppState();
  const { isDisableHistory } = state;
  const { toggleDisableHistory } = actions;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleDisableHistory}
            className={`model-button ${isDisableHistory ? 'model-button-active' : ''}`}
            variant="outline"
            size="sm"
          >
            {isDisableHistory ? '历史记录：关闭' : '历史记录：开启'}
          </Button>
        </TooltipTrigger>
        <TooltipContent style={{ backgroundColor: '#f9fafb', color: 'black' }}>
          <p>
            {isDisableHistory 
              ? '当前禁用历史记录，AI只能看到当前消息' 
              : '当前启用历史记录，AI能看到完整对话内容'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DisableHistory;