import { SquareTerminal, LifeBuoy, Book, Bot, BookOpen } from "lucide-react"
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
    PromptEnhance = 'prompt_enhance'
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
                            label="生图"
                            isActive={currentTab === TabValue.Playground}
                            onClick={() => onTabChange(TabValue.Playground)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton 
                            icon={<BookOpen className="size-5" />}
                            label="提示词库"
                            isActive={currentTab === TabValue.PromptLibrary}
                            onClick={() => onTabChange(TabValue.PromptLibrary)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<Bot className="size-5" />}
                            label="提示词增强"
                            isActive={currentTab === TabValue.PromptEnhance}
                            onClick={() => onTabChange(TabValue.PromptEnhance)}
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
                        {/* <PlaygroundButton currentTab={currentTab} onTabChange={onTabChange} /> */}
                        <SidebarButton
                            icon={<SquareTerminal className="size-5" />}
                            label="生图"
                            isActive={currentTab === TabValue.Playground}
                            onClick={() => onTabChange(TabValue.Playground)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton 
                            icon={<BookOpen className="size-5" />}
                            label="提示词库"
                            isActive={currentTab === TabValue.PromptLibrary}
                            onClick={() => onTabChange(TabValue.PromptLibrary)}
                            isSmallScreen={isSmallScreen}
                        />
                        <SidebarButton
                            icon={<Bot className="size-5" />}
                            label="提示词增强"
                            isActive={currentTab === TabValue.PromptEnhance}
                            onClick={() => onTabChange(TabValue.PromptEnhance)}
                            isSmallScreen={isSmallScreen}
                        />
                    </>
                )}
            </nav>
            {/* 底部帮助链接 */}
            <nav className="sticky bottom-0 p-2 bg-background border-t">
                <Link href="https://baike.baidu.com/item/%E4%B8%AD%E5%9B%BD%E4%BA%BA%E6%B0%91%E8%A7%A3%E6%94%BE%E5%86%9B%E7%BD%91%E7%BB%9C%E7%A9%BA%E9%97%B4%E9%83%A8%E9%98%9F%E4%BF%A1%E6%81%AF%E5%B7%A5%E7%A8%8B%E5%A4%A7%E5%AD%A6/65164733" target="_blank" rel="noopener noreferrer">
                    {isSmallScreen ? (
                        <TooltipButton
                            icon={<LifeBuoy className="size-5" />}
                            label="Help"
                            tooltipContent="Help"
                            variant="outline"
                        />
                    ) : (
                        <Button variant="outline" className="w-full justify-start">
                            <LifeBuoy className="size-5 mr-2" />
                            帮助
                        </Button>
                    )}
                </Link>
            </nav>
        </aside>
    )
}
