import { SquareTerminal, LifeBuoy, Book, Bot, BookOpen, Star, History, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TooltipButton } from "@/components/ui/tooltip-button"
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query"

/**
 * 定义侧边栏标签
 */
export enum TabValue {
    Playground = 'playground',
    Models = 'models',
    API = 'api',
    Documentation = 'documentation',
    Settings = 'settings',
    Help = 'help',
    Account = 'account',
    WorkflowApi = 'workflow_api',
    PromptLibrary = 'prompt_library',
    PromptEnhance = 'prompt_enhance',
    SmartPS = 'smart_ps',
    SmartAudio = 'smart_audio',
    GenerateHistory = 'generate_history'
}

//侧边栏属性接口
interface SidebarProps {
    currentTab: TabValue;
    onTabChange: (tab: TabValue) => void;
    deployWindow: boolean;
    onDeployWindow: (deployWindow: boolean) => void;
}

//侧边栏按钮组件，根据屏幕大小显示不同样式的按钮
const SidebarButton = ({ icon, label, isActive, onClick, isSmallScreen }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, isSmallScreen: boolean }) => {
    if (isSmallScreen) {
        return (
            <TooltipButton
                icon={icon}
                label={label}
                tooltipContent={label}
                className={isActive ? 'bg-muted' : ''}
                onClick={onClick}
            />
        )
    }
    return (
        <Button
            variant={isActive ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={onClick}
        >
            {icon}
            <span className="ml-2">{label}</span>
        </Button>
    )
}

//侧边栏主组件
export function Sidebar({ currentTab, onTabChange, deployWindow, onDeployWindow }: SidebarProps) {
    const viewMode = process.env.NEXT_PUBLIC_VIEW_MODE === "true";
    const isSmallScreen = useMediaQuery("(max-width: 1024px)");

    return (
        <aside className={`flex flex-col h-full overflow-y-auto border-r bg-background transition-all duration-300 ${isSmallScreen ? 'w-12' : 'w-48'}`}>
            <nav className="flex-grow space-y-2 p-2">
                {/* 查看模式显示生图和提示词相关功能 */}
                {viewMode ? (
                    <>
                        <SidebarButton
                            icon={<SquareTerminal className="size-5" />}
                            label="智能生图"
                            isActive={currentTab === TabValue.Playground}
                            onClick={() => onTabChange(TabValue.Playground)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<Bot className="size-5" />}
                            label="智能修图"
                            isActive={currentTab === TabValue.SmartPS}
                            onClick={() => onTabChange(TabValue.SmartPS)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<Music className="size-5" />}
                            label="智能音频"
                            isActive={currentTab === TabValue.SmartAudio}
                            onClick={() => onTabChange(TabValue.SmartAudio)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton 
                            icon={<BookOpen className="size-5" />}
                            label="画廊"
                            isActive={currentTab === TabValue.PromptLibrary}
                            onClick={() => onTabChange(TabValue.PromptLibrary)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<Star className="size-5" />}
                            label="提示词增强"
                            isActive={currentTab === TabValue.PromptEnhance}
                            onClick={() => onTabChange(TabValue.PromptEnhance)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<History className="size-5" />}
                            label="生成历史"
                            isActive={currentTab === TabValue.GenerateHistory}
                            onClick={() => onTabChange(TabValue.GenerateHistory)}
                            isSmallScreen={isSmallScreen}
                        />
                    </>
                ) : (
                    //编辑模式显示完整导航
                    <>
                        <SidebarButton
                            icon={<Book className="size-5" />}
                            label="功能编辑"
                            isActive={currentTab === TabValue.WorkflowApi}
                            onClick={() => onTabChange(TabValue.WorkflowApi)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<SquareTerminal className="size-5" />}
                            label="智能生图"
                            isActive={currentTab === TabValue.Playground}
                            onClick={() => onTabChange(TabValue.Playground)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<Bot className="size-5" />}
                            label="智能修图"
                            isActive={currentTab === TabValue.SmartPS}
                            onClick={() => onTabChange(TabValue.SmartPS)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<Music className="size-5" />}
                            label="智能音频"
                            isActive={currentTab === TabValue.SmartAudio}
                            onClick={() => onTabChange(TabValue.SmartAudio)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton 
                            icon={<BookOpen className="size-5" />}
                            label="画廊"
                            isActive={currentTab === TabValue.PromptLibrary}
                            onClick={() => onTabChange(TabValue.PromptLibrary)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<Star className="size-5" />}
                            label="提示词增强"
                            isActive={currentTab === TabValue.PromptEnhance}
                            onClick={() => onTabChange(TabValue.PromptEnhance)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<History className="size-5" />}
                            label="生成历史"
                            isActive={currentTab === TabValue.GenerateHistory}
                            onClick={() => onTabChange(TabValue.GenerateHistory)}
                            isSmallScreen={isSmallScreen}
                        />
                    </>
                )}
            </nav>
            {/* 底部帮助链接 */}
            <nav className="sticky bottom-0 p-2 bg-background border-t">
                <SidebarButton
                    icon={<LifeBuoy className="size-5" />}
                    label="帮助"
                    isActive={currentTab === TabValue.Help}
                    onClick={() => onTabChange(TabValue.Help)}
                    isSmallScreen={isSmallScreen}
                />
            </nav>
        </aside>
    )
}
