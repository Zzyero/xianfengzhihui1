"use client"
import { Sidebar, TabValue } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav"
import { useState, useEffect } from "react"
import PlaygroundPage from "@/components/pages/playground/playground-page";
import ViewComfyPage from "@/components/pages/view-comfy/view-comfy-page";
import SmartPSPage from "@/components/pages/smartPS/smartPS-page";
import { ViewComfyProvider } from "@/app/providers/view-comfy-provider";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { PromptLibrary } from "@/components/prompt-library/prompt-library";
import { PromptLibraryService } from '@/lib/services/prompt-library-service';
import type { PromptItem } from '@/components/prompt-library/types';
import { Loader } from "@/components/loader";

// export const description =
//     "An AI playground with a sidebar navigation and a main content area. The playground has a header with a settings drawer and a share button. The sidebar has navigation links and a user menu. The main content area shows a form to configure the model and messages."

// 主页
export default function Page() {
    // 是否启用视图模式
    const viewMode = process.env.NEXT_PUBLIC_VIEW_MODE === "true";
    // 当前标签 
    const [currentTab, setCurrentTab] = useState(viewMode ? TabValue.Playground : TabValue.WorkflowApi);
    // 部署窗口显示状态
    const [deployWindow, setDeployWindow] = useState<boolean>(false);
    // 提示词库数据
    const [prompts, setPrompts] = useState<PromptItem[]>([]);
    // 加载状态
    const [loading, setLoading] = useState(true);
    // 错误状态
    const [error, setError] = useState<string | null>(null);

    // 加载提示词库数据
    useEffect(() => {
        const loadPrompts = async () => {
            try {
                setLoading(true);
                const loadedPrompts = await PromptLibraryService.getPrompts();
                setPrompts(loadedPrompts);
                setError(null);
            } catch (err) {
                console.error('加载提示词库失败:', err);
                setError('加载提示词库失败，请刷新页面重试');
            } finally {
                setLoading(false);
            }
        };
        loadPrompts();
    }, []);

    // 处理提示词的增删改
    const handleAddPrompt = async (prompt: Partial<PromptItem>) => {
        try {
            // 生成新的提示词对象
            const newPrompt: PromptItem = {
                ...prompt as PromptItem,
                id: Date.now().toString(), // 使用时间戳作为临时ID
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const newPrompts = [...prompts, newPrompt];
            setPrompts(newPrompts);
            
            // 保存到服务器
            const success = await PromptLibraryService.savePrompts(newPrompts);
            if (!success) {
                console.error('保存提示词到服务器失败');
            }
        } catch (err) {
            console.error('添加提示词失败:', err);
        }
    };

    const handleEditPrompt = async (id: string, prompt: Partial<PromptItem>) => {
        try {
            const newPrompts = prompts.map(p => 
                p.id === id ? { 
                    ...p, 
                    ...prompt, 
                    updatedAt: new Date().toISOString() 
                } : p
            );
            setPrompts(newPrompts);
            
            // 保存到服务器
            const success = await PromptLibraryService.savePrompts(newPrompts);
            if (!success) {
                console.error('保存提示词到服务器失败');
            }
        } catch (err) {
            console.error('编辑提示词失败:', err);
        }
    };

    const handleDeletePrompt = async (id: string) => {
        try {
            const newPrompts = prompts.filter(p => p.id !== id);
            setPrompts(newPrompts);
            
            // 保存到服务器
            const success = await PromptLibraryService.savePrompts(newPrompts);
            if (!success) {
                console.error('保存提示词到服务器失败');
            }
        } catch (err) {
            console.error('删除提示词失败:', err);
        }
    };

    return (
        // 主布局
        <ViewComfyProvider>
            <div className="flex flex-col h-screen w-full overflow-x-auto overflow-y-hidden">
                {/* 顶部导航 */}
                <TopNav />
                {/* 主内容区域 */}
                <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
                    {/* 侧边栏 */}
                    <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} deployWindow={deployWindow} onDeployWindow={setDeployWindow}/>
                    {/* 主内容区域 */}
                    <main className="flex-1 overflow-x-auto overflow-y-hidden">
                        {/* 视图页面 */}
                        {currentTab === TabValue.Playground && <PlaygroundPage />}
                        {/* 工作流页面 */}
                        {currentTab === TabValue.WorkflowApi && <ViewComfyPage />}
                        {/* 智能PS页面 */}
                        {currentTab === TabValue.SmartPS && <SmartPSPage />}
                        {/* 提示词库页面 */}
                        {currentTab === TabValue.PromptLibrary && (
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-center p-4 border-b">
                                    <h1 className="text-2xl font-bold">提示词库</h1>
                                </div>
                                <div className="flex-1 p-4 overflow-auto">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader />
                                        </div>
                                    ) : error ? (
                                        <div className="flex items-center justify-center h-full text-red-500">
                                            {error}
                                        </div>
                                    ) : (
                                        <PromptLibrary
                                            prompts={prompts}
                                            onAdd={handleAddPrompt}
                                            onEdit={handleEditPrompt}
                                            onDelete={handleDeletePrompt}
                                            isSidebar={false}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
            <Toaster />
        </ViewComfyProvider>
    )
}
