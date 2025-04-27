"use client"
import { Sidebar, TabValue } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav"
import { useState, useEffect, useRef } from "react"
import PlaygroundPage from "@/components/pages/playground/playground-page";
import ViewComfyPage from "@/components/pages/view-comfy/view-comfy-page";
import SmartPSPage from "@/components/pages/smartPS/smartPS-page";
import PromptEnhancementPage from "@/components/pages/PromptEnhancement/PromptEnhancementPage";
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

    // 智能生图和智能修图页面状态引用
    const playgroundRef = useRef<{ isRendered: boolean }>({ isRendered: false });
    const smartPSRef = useRef<{ isRendered: boolean }>({ isRendered: false });

    // 处理标签切换
    const handleTabChange = (newTab: TabValue) => {
        // 如果切换到提示词增强页面，记录渲染和激活状态
        if (newTab === TabValue.PromptEnhance) {
            promptEnhancementRef.current.isRendered = true;
            console.log('切换到提示词增强页面', {
                isFirstActivation: promptEnhancementRef.current.firstActivation,
                isRendered: promptEnhancementRef.current.isRendered
            });
        }
        
        // 如果切换到智能生图页面，记录渲染状态
        if (newTab === TabValue.Playground) {
            playgroundRef.current.isRendered = true;
            console.log('切换到智能生图页面', playgroundRef.current);
        }
        
        // 如果切换到智能修图页面，记录渲染状态
        if (newTab === TabValue.SmartPS) {
            smartPSRef.current.isRendered = true;
            console.log('切换到智能修图页面', smartPSRef.current);
        }
        
        // 设置新的标签
        setCurrentTab(newTab);
    }

    // 确定是否应该渲染提示词增强页面
    // 当前是提示词增强页面或已经渲染过该页面
    const shouldRenderPromptEnhancement = currentTab === TabValue.PromptEnhance || promptEnhancementRef.current.isRendered;
    
    // 确定是否应该渲染智能生图页面
    const shouldRenderPlayground = currentTab === TabValue.Playground || playgroundRef.current.isRendered;
    
    // 确定是否应该渲染智能修图页面
    const shouldRenderSmartPS = currentTab === TabValue.SmartPS || smartPSRef.current.isRendered;
    
    // 计算各页面是否处于活动状态
    const isPromptEnhanceActive = currentTab === TabValue.PromptEnhance;
    const isPlaygroundActive = currentTab === TabValue.Playground;
    const isSmartPSActive = currentTab === TabValue.SmartPS;
    
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
                        {/* 智能生图页面 - 在首次渲染后保持存在，通过visibility控制显示/隐藏 */}
                        {shouldRenderPlayground && (
                            <div 
                                className="absolute inset-0 w-full h-full" 
                                style={{
                                    visibility: isPlaygroundActive ? 'visible' : 'hidden',
                                    zIndex: isPlaygroundActive ? 10 : -1
                                }}
                            >
                                <PlaygroundPage />
                            </div>
                        )}
                        
                        {/* 工作流页面 - 传统条件渲染 */}
                        {currentTab === TabValue.WorkflowApi && <ViewComfyPage />}
                        
                        {/* 智能修图页面 - 在首次渲染后保持存在，通过visibility控制显示/隐藏 */}
                        {shouldRenderSmartPS && (
                            <div 
                                className="absolute inset-0 w-full h-full" 
                                style={{
                                    visibility: isSmartPSActive ? 'visible' : 'hidden',
                                    zIndex: isSmartPSActive ? 10 : -1
                                }}
                            >
                                <SmartPSPage />
                            </div>
                        )}
                        
                        {/* 帮助页面 - 传统条件渲染 */}
                        {currentTab === TabValue.Help && <HelpPage />}
                        
                        {/* 提示词库页面 - 传统条件渲染 */}
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