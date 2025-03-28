import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { History, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import '../styles/HistorySidebar.css';

interface HistorySidebarControlProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  sessions: any[];
  onSelectSession: (id: string) => void;
  activeSessionId?: string;
  onNewChat: () => void;
}

/**
 * 历史侧边栏控制组件，包含新建聊天和历史侧边栏按钮
 * 注意：此组件已不再使用，现在历史侧边栏直接集成在ChatWindow组件中
 * 保留此文件仅供参考
 */
const HistorySidebarControl: React.FC<HistorySidebarControlProps> = ({
  isOpen,
  setIsOpen,
  sessions,
  onSelectSession,
  activeSessionId,
  onNewChat
}) => {
  const [isPinned, setIsPinned] = useState<boolean>(isOpen);
  
  /**
   * 切换侧边栏显示状态
   */
  const toggleSidebar = (): void => {
    setIsOpen(!isOpen);
    setIsPinned(!isOpen); // 当打开时设置为固定，关闭时取消固定
  };
  
  return (
    <div className="history-controls flex items-center gap-2">
      {/* 新建聊天按钮 */}
      <Button
        variant="outline"
        size="sm"
        className="new-chat-button flex items-center gap-1"
        onClick={onNewChat}
      >
        <PlusCircle className="h-4 w-4" />
        <span>新聊天</span>
      </Button>
      
      {/* 历史侧边栏按钮 */}
      <Button
        variant="outline"
        size="sm"
        className={cn("history-button flex items-center gap-1", isPinned && 'pinned')}
        onClick={toggleSidebar}
      >
        <History className="h-4 w-4" />
        <span>历史</span>
      </Button>
      
      {/* 移除历史侧边栏组件，因为它现在已经集成到ChatWindow中 */}
    </div>
  );
};

export default HistorySidebarControl; 