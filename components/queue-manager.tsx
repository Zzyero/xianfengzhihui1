"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, StopCircle, Trash2 } from "lucide-react";
import type { IComfyQueue } from "@/app/services/comfyui-api-service";

interface QueueManagerProps {
    onInterrupt?: () => void;
    onClear?: () => void;
}

export function QueueManager({ onInterrupt, onClear }: QueueManagerProps) {
    const [queue, setQueue] = useState<IComfyQueue>({ queue_running: [], queue_pending: [] });
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // 定期获取队列状态
    useEffect(() => {
        const fetchQueue = async () => {
            try {
                const response = await fetch('/api/comfy/queue');
                if (!response.ok) throw new Error('获取队列状态失败');
                const data = await response.json();
                setQueue(data);
            } catch (error) {
                console.error('获取队列状态失败:', error);
            }
        };

        // 每3秒更新一次队列状态
        const interval = setInterval(fetchQueue, 3000);
        return () => clearInterval(interval);
    }, []);

    // 中断当前任务
    const handleInterrupt = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/comfy/interrupt', {
                method: 'POST'
            });
            if (!response.ok) throw new Error('中断任务失败');
            
            toast({
                title: "已中断当前任务",
                duration: 3000,
            });
            
            // 调用父组件的中断回调
            onInterrupt?.();
        } catch (error) {
            console.error('中断任务失败:', error);
            toast({
                title: "中断任务失败",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setLoading(false);
        }
    };

    // 清除所有队列
    const handleClearQueue = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/comfy/queue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clear: true }),
            });
            if (!response.ok) throw new Error('清除队列失败');
            
            toast({
                title: "已清除所有队列",
                duration: 3000,
            });

            // 调用父组件的清除回调
            onClear?.();
        } catch (error) {
            console.error('清除队列失败:', error);
            toast({
                title: "清除队列失败",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setLoading(false);
        }
    };

    const totalTasks = queue.queue_running.length + queue.queue_pending.length;

    return (
        <div className="flex items-center gap-2">
            {totalTasks > 0 && (
                <div className="text-sm text-muted-foreground">
                    队列中: {totalTasks} 个任务
                </div>
            )}
            
            <Button
                variant="outline"
                size="sm"
                onClick={handleInterrupt}
                disabled={loading || totalTasks === 0}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <StopCircle className="h-4 w-4 mr-1" />
                )}
                中断当前
            </Button>
            
            <Button
                variant="outline"
                size="sm"
                onClick={handleClearQueue}
                disabled={loading || totalTasks === 0}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                )}
                清除队列
            </Button>
        </div>
    );
} 