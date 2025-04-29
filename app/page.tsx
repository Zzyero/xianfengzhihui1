"use client"
import { Sidebar, TabValue } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav"
import { useState, useEffect, useRef } from "react"
import PlaygroundPage from "@/components/pages/playground/playground-page";
import ViewComfyPage from "@/components/pages/view-comfy/view-comfy-page";
import SmartPSPage from "@/components/pages/smartPS/smartPS-page";
import PromptEnhancementPage from "@/components/pages/PromptEnhancement/PromptEnhancementPage";
import GenerateHistoryPage from "@/components/pages/GenerateHistory/GenerateHistoryPage";
import { HelpPage } from "@/components/pages/help/helpPage";
import { ViewComfyProvider } from "@/app/providers/view-comfy-provider";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { PromptLibrary } from "@/components/prompt-library/prompt-library";
import { PromptLibraryService } from '@/lib/services/prompt-library-service';
import type { PromptItem, PartialPromptItem, PromptParameters } from '@/components/prompt-library/types';
import { Loader } from "@/components/loader";
import { PanelRightOpen } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// export const description =
//     "An AI playground with a sidebar navigation and a main content area. The playground has a header with a settings drawer and a share button. The sidebar has navigation links and a user menu. The main content area shows a form to configure the model and messages."

// 主页
export default function Home() {
    const searchParams = useSearchParams();
    const router = useRouter();
    // 是否启用视图模式
    const viewMode = process.env.NEXT_PUBLIC_VIEW_MODE === "true";
    // 当前标签 
    const [currentTab, setCurrentTab] = useState(() => {
        // 从 URL 参数获取来源
        const fromPrompt = searchParams?.get('from') === 'prompt';
        if (fromPrompt) {
            return TabValue.PromptLibrary;
        }
        // 否则使用默认值
        return viewMode ? TabValue.Playground : TabValue.WorkflowApi;
    });
    // 部署窗口显示状态
    const [deployWindow, setDeployWindow] = useState<boolean>(false);
    // 提示词库数据
    const [prompts, setPrompts] = useState<PromptItem[]>([]);
    // 加载状态
    const [isLoading, setIsLoading] = useState(false);
    // 错误状态
    const [error, setError] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<PartialPromptItem | null>(null);

    // 检查URL参数并设置编辑状态
    useEffect(() => {
        const fromPrompt = searchParams?.get('from') === 'prompt';
        const editId = searchParams?.get('edit');
        
        if (fromPrompt && editId) {
            // 如果是从提示词详情页返回，并且有编辑ID
            const prompt = prompts.find(p => p.id === editId);
            if (prompt) {
                setEditingPrompt(prompt);
                setShowForm(true);
            }
            // 清除URL参数
            router.replace('/');
        } else if (fromPrompt) {
            // 如果只是从提示词详情页返回，切换到提示词库标签
            setCurrentTab(TabValue.PromptLibrary);
            // 清除URL参数
            router.replace('/');
        }
    }, [searchParams, prompts, router]);

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

    // 处理添加提示词
    const handleAdd = async (prompt: PartialPromptItem) => {
        try {
            setIsLoading(true);
            const fullPrompt: Partial<PromptItem> = {
                ...prompt,
                parameters: prompt.parameters ? {
                    steps: prompt.parameters.steps || '',
                    sampler: prompt.parameters.sampler || '',
                    seed: prompt.parameters.seed || '',
                    scheduler: prompt.parameters.scheduler || '',
                    denoise: prompt.parameters.denoise || '',
                    cfg: prompt.parameters.cfg,
                    negative: prompt.parameters.negative,
                } : undefined
            };
            await PromptLibraryService.addPrompt(fullPrompt);
            const updatedPrompts = await PromptLibraryService.getPrompts();
            setPrompts(updatedPrompts);
            setShowForm(false);
            setEditingPrompt(null);
            // 清除URL参数
            router.replace('/');
        } catch (error) {
            console.error('添加提示词失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 处理编辑提示词
    const handleEdit = async (id: string, prompt: PartialPromptItem) => {
        try {
            setIsLoading(true);
            const fullPrompt: Partial<PromptItem> = {
                ...prompt,
                parameters: prompt.parameters ? {
                    steps: prompt.parameters.steps || '',
                    sampler: prompt.parameters.sampler || '',
                    seed: prompt.parameters.seed || '',
                    scheduler: prompt.parameters.scheduler || '',
                    denoise: prompt.parameters.denoise || '',
                    cfg: prompt.parameters.cfg,
                    negative: prompt.parameters.negative,
                } : undefined
            };
            await PromptLibraryService.updatePrompt(id, fullPrompt);
            const updatedPrompts = await PromptLibraryService.getPrompts();
            setPrompts(updatedPrompts);
            setShowForm(false);
            setEditingPrompt(null);
            // 清除URL参数
            router.replace('/');
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

    // 提示词增强页面引用
    const promptEnhancementRef = useRef<{ isRendered: boolean, firstActivation: boolean }>({ 
        isRendered: false,
        firstActivation: true
    });

    // 处理标签切换
    const handleTabChange = (newTab: TabValue) => {
        // 如果当前处于提示词增强页面，记录已渲染状态
        if (currentTab === TabValue.PromptEnhance) {
            promptEnhancementRef.current.isRendered = true;
        }
        
        // 如果切换到提示词增强页面，记录第一次激活状态
        if (newTab === TabValue.PromptEnhance) {
            console.log('切换到提示词增强页面', {
                isFirstActivation: promptEnhancementRef.current.firstActivation,
                isRendered: promptEnhancementRef.current.isRendered
            });
        }
        
        // 设置新的标签
        setCurrentTab(newTab);
    }

    // 确定是否应该渲染提示词增强页面
    // 当前是提示词增强页面或已经渲染过该页面
    const shouldRenderPromptEnhancement = currentTab === TabValue.PromptEnhance || promptEnhancementRef.current.isRendered;
    
    // 计算isactive属性，当前标签是提示词增强页面时为true
    const isPromptEnhanceActive = currentTab === TabValue.PromptEnhance;
    
    // 监听提示词增强页面的激活状态变化
    useEffect(() => {
        if (isPromptEnhanceActive && promptEnhancementRef.current.firstActivation) {
            console.log('首次激活提示词增强页面');
            promptEnhancementRef.current.firstActivation = false;
        }
    }, [isPromptEnhanceActive]);

    return (
        <ViewComfyProvider>
            <div className="flex flex-col h-screen w-full overflow-x-auto overflow-y-hidden">
                {/* 顶部导航 */}
                <TopNav />
                {/* 主内容区域 */}
                <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
                    {/* 侧边栏 */}
                    <Sidebar 
                        currentTab={currentTab} 
                        onTabChange={handleTabChange} 
                        deployWindow={deployWindow} 
                        onDeployWindow={setDeployWindow}
                    />
                    {/* 主内容区域 */}
                    <main className="flex-1 overflow-x-auto overflow-y-hidden relative">
                        {/* 视图页面 */}
                        {currentTab === TabValue.Playground && <PlaygroundPage />}
                        
                        {/* 工作流页面 */}
                        {currentTab === TabValue.WorkflowApi && <ViewComfyPage />}
                        {/* 智能PS页面 */}
                        {currentTab === TabValue.SmartPS && <SmartPSPage />}
                        {/* 帮助页面 */}
                        {currentTab === TabValue.Help && <HelpPage />}
                        {/* 生成历史页面 */}
                        {currentTab === TabValue.GenerateHistory && <GenerateHistoryPage />}
                        {/* 提示词库页面 */}
                        {currentTab === TabValue.PromptLibrary && (
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-center p-4 border-b">
                                    <h1 className="text-2xl font-bold">画廊</h1>
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
                                            showForm={showForm}
                                            setShowForm={setShowForm}
                                            editingPrompt={editingPrompt}
                                            setEditingPrompt={setEditingPrompt}
                                            setPrompts={setPrompts}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* 提示词增强页面 - 只在首次渲染后保持存在，但隐藏在其他页面后面 */}
                        {shouldRenderPromptEnhancement && (
                            <div 
                                className="absolute inset-0 w-full h-full" 
                                style={{
                                    visibility: isPromptEnhanceActive ? 'visible' : 'hidden',
                                    zIndex: isPromptEnhanceActive ? 10 : -1
                                }}
                            >
                                <PromptEnhancementPage isactive={isPromptEnhanceActive} />
                            </div>
                        )}
                    </main>
                </div>
            </div>
            <Toaster />
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