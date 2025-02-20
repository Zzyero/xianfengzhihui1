"use client"

import * as React from "react"
import {
    CaretSortIcon,
    CheckIcon,
} from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import type { IViewComfy } from "@/app/providers/view-comfy-provider";
import { useEffect } from "react"

type PopoverTriggerProps = React.ComponentPropsWithoutRef<typeof PopoverTrigger>

interface WorkflowSwitcherProps extends PopoverTriggerProps {
    viewComfys: IViewComfy[];                      // 所有工作流列表
    currentViewComfy: IViewComfy;                 // 当前选中的工作流
    onSelectChange: (data: IViewComfy) => void;    // 选择变更回调

}

/**
 * 工作流切换器组件
 * 提供工作流列表的下拉选择功能
 */
export default function WorkflowSwitcher({ className, currentViewComfy, viewComfys, onSelectChange }: WorkflowSwitcherProps) {
    const [open, setOpen] = React.useState(false);
    const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
    const [currentWorkflow, setCurrentWorkflow] = React.useState<IViewComfy>(currentViewComfy);

    useEffect(() => {
        setCurrentWorkflow(currentViewComfy);
    }, [currentViewComfy]);

    const groups = [
        {
            label: "Workflows",
            viewComfys
        },
    ];

    return (
        <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
            <Popover open={open} onOpenChange={setOpen}>
                {/* 触发按钮 */}
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-label="请选择一个功能"
                        className={cn("w-full max-w-[300px] justify-between", className)}
                    >
                        {currentWorkflow.viewComfyJSON.title}
                        <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                    <Command>
                        <CommandInput placeholder="请输入功能名称..." />
                        {/* 搜索输入框 */}
                        <CommandList>
                            <CommandEmpty>未找到功能</CommandEmpty>
                            {groups.map((group) => (
                                <CommandGroup key={group.label} heading={group.label}>
                                    {group.viewComfys.map((viewComfy) => (
                                        <CommandItem
                                            key={viewComfy.viewComfyJSON.id}
                                            onSelect={() => {
                                                onSelectChange(viewComfy)
                                                setOpen(false)
                                            }}
                                            className="text-sm"
                                        >
                                            {viewComfy.viewComfyJSON.title}
                                            <CheckIcon
                                                className={cn(
                                                    "ml-auto h-4 w-4",
                                                    currentWorkflow.viewComfyJSON.id === viewComfy.viewComfyJSON.id
                                                        ? "opacity-100"
                                                        : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            ))}
                        </CommandList>
                        <CommandSeparator />
                        {/* <CommandList>
                            <CommandGroup>
                                <DialogTrigger asChild>
                                    <CommandItem
                                        onSelect={() => {
                                            setOpen(false)
                                            setShowNewTeamDialog(true)
                                        }}
                                    >
                                        <PlusCircledIcon className="mr-2 h-5 w-5" />
                                        Add Workflow
                                    </CommandItem>
                                </DialogTrigger>
                            </CommandGroup>
                        </CommandList> */}
                    </Command>
                </PopoverContent>
            </Popover>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>创建功能</DialogTitle>
                    <DialogDescription>
                        添加一个新功能
                    </DialogDescription>
                </DialogHeader>
                <div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewTeamDialog(false)}>
                        取消
                    </Button>
                    <Button type="submit">继续</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
