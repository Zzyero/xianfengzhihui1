"use client"
import { Sidebar, TabValue } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav"
import { useState, useRef, useEffect } from "react"
import PlaygroundPage from "@/components/pages/playground/playground-page";
import ViewComfyPage from "@/components/pages/view-comfy/view-comfy-page";
import PromptEnhancementPage from "@/components/pages/PromptEnhancement/PromptEnhancementPage";
import { ViewComfyProvider } from "@/app/providers/view-comfy-provider";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";

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
        // 主布局
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
        </ViewComfyProvider>
    )
}