"use client"
import { Sidebar, TabValue } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav"
import { useState } from "react"
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
                        {/* 提示词增强页面 */}
                        {currentTab === TabValue.PromptEnhance && <PromptEnhancementPage />}
                    </main>
                </div>
            </div>
            <Toaster />
        </ViewComfyProvider>
    )
}
