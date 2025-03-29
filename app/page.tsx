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
import { PanelRightOpen } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// export const description =
//     "An AI playground with a sidebar navigation and a main content area. The playground has a header with a settings drawer and a share button. The sidebar has navigation links and a user menu. The main content area shows a form to configure the model and messages."

// 主页
export default function Home() {
    const searchParams = useSearchParams();
    // 是否启用视图模式
    const viewMode = process.env.NEXT_PUBLIC_VIEW_MODE === "true";
    // 当前标签 
    const [currentTab, setCurrentTab] = useState(viewMode ? TabValue.Playground : TabValue.WorkflowApi);
    // 部署窗口显示状态
    const [deployWindow, setDeployWindow] = useState<boolean>(false);
    // 提示词库数据
    const [prompts, setPrompts] = useState<PromptItem[]>([]);
    // 加载状态
    const [isLoading, setIsLoading] = useState(false);
    // 错误状态
    const [error, setError] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);

    // 检查URL参数并设置当前标签
    useEffect(() => {
        const fromPrompt = searchParams.get('from') === 'prompt';
        if (fromPrompt) {
            setCurrentTab(TabValue.PromptLibrary);
        }
    }, [searchParams]);

    // 加载提示词库数据
    useEffect(() => {
        const loadPrompts = async () => {
            try {
                setIsLoading(true);
                const data = await PromptLibraryService.getPrompts();
                setPrompts(data);
                setError(null);
            } catch (error) {
                console.error('加载提示词失败:', error);
                setError('加载提示词失败，请刷新页面重试');
            } finally {
                setIsLoading(false);
            }
        };
        loadPrompts();
    }, []);

    // 处理提示词的增删改
    const handleAdd = async (prompt: Partial<PromptItem>) => {
        try {
            setIsLoading(true);
            await PromptLibraryService.addPrompt(prompt);
            const updatedPrompts = await PromptLibraryService.getPrompts();
            setPrompts(updatedPrompts);
        } catch (error) {
            console.error('添加提示词失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async (id: string, prompt: Partial<PromptItem>) => {
        try {
            setIsLoading(true);
            await PromptLibraryService.updatePrompt(id, prompt);
            const updatedPrompts = await PromptLibraryService.getPrompts();
            setPrompts(updatedPrompts);
        } catch (error) {
            console.error('更新提示词失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setIsLoading(true);
            await PromptLibraryService.deletePrompt(id);
            const updatedPrompts = await PromptLibraryService.getPrompts();
            setPrompts(updatedPrompts);
        } catch (error) {
            console.error('删除提示词失败:', error);
        } finally {
            setIsLoading(false);
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
                                    {isLoading ? (
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
                                            onAdd={handleAdd}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
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
            {/* 提示词库侧边栏 */}
            <div className={`
                ${showSidebar ? 'translate-x-0' : 'translate-x-full'}
                fixed top-0 right-0 h-full w-80 bg-background border-l
                transform transition-transform duration-200 ease-in-out
                lg:relative lg:translate-x-0 z-20
            `}>
                <PromptLibrary
                    prompts={prompts}
                    onAdd={handleAdd}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isSidebar={true}
                />
            </div>
            {/* 移动端遮罩层 */}
            {showSidebar && (
                <div 
                    className="fixed inset-0 bg-black/20 z-10 lg:hidden"
                    onClick={() => setShowSidebar(false)}
                />
            )}
        </ViewComfyProvider>
    )
}
