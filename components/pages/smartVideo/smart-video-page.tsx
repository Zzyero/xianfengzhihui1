/* eslint-disable @next/next/no-img-element */
import {
    Settings,
    ChevronDown,
    X
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Fragment, useEffect, useState } from "react";
import { Header } from "@/components/header";
import SmartVideoForm from "./smart-video-form";
import { Loader } from "@/components/loader";
import { usePostPlayground } from "@/hooks/playground/use-post-playground";
import { ActionType, type IViewComfy, type IViewComfyWorkflow, type IViewComfyJSON, useViewComfy } from "@/app/providers/view-comfy-provider";
import { ErrorAlertDialog } from "@/components/ui/error-alert-dialog";
import { ApiErrorHandler } from "@/lib/api-error-handler";
import type { ResponseError } from "@/app/models/errors";
import BlurFade from "@/components/ui/blur-fade";
import { blobToBase64, cn } from "@/lib/utils";
import WorkflowSwitcher from "@/components/workflow-switchter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PreviewOutputsImageGallery } from "@/components/images-preview"
import { QueueManager } from "@/components/queue-manager";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const apiErrorHandler = new ApiErrorHandler();

//页面内容组件
function SmartVideoPageContent({ loading, setLoading }: { loading: boolean, setLoading: (loading: boolean) => void }) {
    const { viewComfyState, viewComfyStateDispatcher } = useViewComfy();
    const viewMode = process.env.NEXT_PUBLIC_VIEW_MODE === "true";
    const [errorAlertDialog, setErrorAlertDialog] = useState<{ open: boolean, errorTitle: string | undefined, errorDescription: React.JSX.Element, onClose: () => void }>({ open: false, errorTitle: undefined, errorDescription: <></>, onClose: () => { } });
    
    // 视频预览状态
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // 打开图片预览
    const openImagePreview = (imageUrl: string) => {
        if (imageUrl) {
            setPreviewImageUrl(imageUrl);
        }
    };

    // 关闭图片预览
    const closeImagePreview = () => {
        setPreviewImageUrl(null);
    };

    //获取视图配置
    useEffect(() => {
        if (viewMode) {
            const fetchViewComfy = async () => {
                try {
                    const response = await fetch("/api/playground");
                    if (!response.ok) {
                        const error = await response.json() as ResponseError;
                        throw error;
                    }
                    const data = await response.json() as { viewComfyJSON: IViewComfyJSON };
                    
                    // Filter workflows with type 'video_generation' from the nested structure
                    const videoGenerationWorkflows = data.viewComfyJSON.workflows.filter(
                        (workflow: IViewComfy) => workflow.type === 'video_generation'
                    );

                    // If no video generation workflows are found, handle appropriately (e.g., show an error or default state)
                    if (videoGenerationWorkflows.length === 0) {
                         console.error("No video generation workflows found.");
                         // Optionally set an error state or return early
                         return; 
                    }
                    
                    // Dispatch INIT_VIEW_COMFY to update both the list and the current workflow
                    viewComfyStateDispatcher({
                        type: ActionType.INIT_VIEW_COMFY, 
                        payload: { 
                            ...data.viewComfyJSON, // Pass other potential fields from the JSON
                            workflows: videoGenerationWorkflows // Use the filtered list
                        } 
                    });

                } catch (error) {
                    const errorDialog = apiErrorHandler.apiErrorToDialog(error as ResponseError);
                    setErrorAlertDialog({
                        open: true,
                        errorTitle: errorDialog.title,
                        errorDescription: <>{errorDialog.description}</>,
                        onClose: () => {
                            setErrorAlertDialog(prev => ({ ...prev, open: false }));
                        }
                    });
                }
            };
            fetchViewComfy();
        }
    }, [viewMode, viewComfyStateDispatcher]);

    // 自动切换到 video_generation 类型的工作流
    useEffect(() => {
        // 如果有工作流且当前工作流类型不是 video_generation
        if (viewComfyState.viewComfys.length > 0 && 
            (!viewComfyState.currentViewComfy || viewComfyState.currentViewComfy.type !== 'video_generation')) {
            
            // 查找第一个 video_generation 类型的工作流
            const videoGenerationWorkflow = viewComfyState.viewComfys.find(
                workflow => workflow.type === 'video_generation'
            );
            
            // 如果找到了匹配的工作流，自动选择它
            if (videoGenerationWorkflow) {
                viewComfyStateDispatcher({
                    type: ActionType.UPDATE_CURRENT_VIEW_COMFY,
                    payload: videoGenerationWorkflow
                });
            }
        }
    }, [viewComfyState.viewComfys, viewComfyState.currentViewComfy, viewComfyStateDispatcher]);

    //提交表单
    const { doPost } = usePostPlayground();
    
    // 中断生成
    const handleInterrupt = async () => {
        try {
            await fetch("/api/comfy/interrupt", {
                method: "POST",
            });
        } catch (error) {
            console.error(error);
        }
    };

    // 清空队列
    const handleClearQueue = () => {
        // 只清除当前页面类型的结果
        viewComfyStateDispatcher({
            type: ActionType.CLEAR_GENERATION_RESULTS,
            payload: { pageType: 'video_generation' }
        });
    };

    function onSubmit(data: IViewComfyWorkflow) {
        //获取输入
        const inputs: { key: string, value: string | File }[] = [];

        for (const dataInputs of data.inputs) {
            for (const input of dataInputs.inputs) {
                inputs.push({ key: input.key, value: input.value });
            }
        }

        for (const advancedInput of data.advancedInputs) {
            for (const input of advancedInput.inputs) {
                inputs.push({ key: input.key, value: input.value });
            }
        }

        const generationData = {
            inputs: inputs,
            textOutputEnabled: data.textOutputEnabled ?? false
        };

        //提交表单
        setLoading(true);
        doPost({
            viewComfy: generationData,
            workflow: viewComfyState.currentViewComfy?.workflowApiJSON,
            onSuccess: async (blobs) => {
                // 生成唯一ID
                const id = Date.now().toString();
                
                // 将 Blob 转换为 Base64
                const outputs = await Promise.all(blobs.map(async (blob) => {
                    return {
                        type: blob.type,
                        data: await blobToBase64(blob)
                    };
                }));
                
                // 存储到全局状态
                viewComfyStateDispatcher({
                    type: ActionType.ADD_GENERATION_RESULT,
                    payload: { 
                        id, 
                        outputs,
                        pageType: 'video_generation'
                    }
                });
                
                setLoading(false);
            },
            onError: (error) => {
                setLoading(false);
                const errorDialog = apiErrorHandler.apiErrorToDialog(error);
                setErrorAlertDialog({
                    open: true,
                    errorTitle: errorDialog.title,
                    errorDescription: <>{errorDialog.description}</>,
                    onClose: () => {
                        setErrorAlertDialog(prev => ({ ...prev, open: false }));
                        setLoading(false);
                    }
                });
            }
        });
    }

    //选择变更
    const onSelectChange = (data: IViewComfy) => {
        // 确保只选择 video_generation 类型的工作流
        if (data.type !== 'video_generation') {
            return;
        }
        
        viewComfyStateDispatcher({
            type: ActionType.UPDATE_CURRENT_VIEW_COMFY,
            payload: data
        });
    };

    // 获取当前页面类型的生成结果
    const filteredResults = Object.entries(viewComfyState.generationResults)
        .filter(([id, result]) => result.pageType === 'video_generation')
        .sort(([idA, a], [idB, b]) => b.timestamp - a.timestamp);

    if (!viewComfyState.currentViewComfy) {
        return <>
            <div className="flex flex-col h-screen">
                <ErrorAlertDialog open={errorAlertDialog.open} errorTitle={errorAlertDialog.errorTitle} errorDescription={errorAlertDialog.errorDescription} onClose={errorAlertDialog.onClose} />
            </div>
        </>;
    }
    //渲染页面
    return (
        <>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b">
                    <h1 className="text-2xl font-bold">智能视频</h1>
                    <QueueManager 
                        onInterrupt={handleInterrupt}
                        onClear={handleClearQueue}
                    />
                </div>
                <div className="md:hidden w-full flex pl-4 gap-x-2">
                    <WorkflowSwitcher 
                        viewComfys={viewComfyState.viewComfys.filter(workflow => workflow.type === 'video_generation')} 
                        currentViewComfy={viewComfyState.currentViewComfy} 
                        onSelectChange={onSelectChange} 
                    />
                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden self-bottom w-[85px] gap-1">
                                <Settings className="size-4" />
                                设置
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="max-h-[80vh] gap-4 px-4 h-full">
                            {viewComfyState.currentViewComfy && viewComfyState.currentViewComfy.viewComfyJSON && (
                                <SmartVideoForm 
                                    viewComfyJSON={viewComfyState.currentViewComfy.viewComfyJSON} 
                                    onSubmit={onSubmit} 
                                    loading={loading} 
                                />
                            )}
                        </DrawerContent>
                    </Drawer>
                </div>
                <main className="grid overflow-hidden flex-1 gap-4 p-2 md:grid-cols-2 lg:grid-cols-3">
                    <div className="relative hidden flex-col items-start gap-8 md:flex overflow-hidden">
                        {viewComfyState.viewComfys.length > 0 && viewComfyState.currentViewComfy && (
                            <div className="px-3 w-full">
                                <WorkflowSwitcher 
                                    viewComfys={viewComfyState.viewComfys.filter(workflow => workflow.type === 'video_generation')} 
                                    currentViewComfy={viewComfyState.currentViewComfy} 
                                    onSelectChange={onSelectChange} 
                                />
                            </div>
                        )}
                        {viewComfyState.currentViewComfy && viewComfyState.currentViewComfy.viewComfyJSON ? (
                            <SmartVideoForm 
                                viewComfyJSON={viewComfyState.currentViewComfy.viewComfyJSON} 
                                onSubmit={onSubmit} 
                                loading={loading} 
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-10 text-center">
                                <p className="text-muted-foreground">无可用的视频生成配置</p>
                                <p className="text-muted-foreground text-sm mt-2">请确保已配置视频生成工作流</p>
                            </div>
                        )}
                    </div>
                    <div className="relative h-full min-h-[50vh] rounded-xl bg-muted/50 px-1 lg:col-span-2">
                        <ScrollArea className="relative flex h-full w-full flex-col">
                            {(filteredResults.length === 0) && !loading && (
                                <>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
                                        <p className="text-muted-foreground">填写左侧表单并点击"生成视频"按钮</p>
                                    </div>
                                    <Badge variant="outline" className="absolute right-3 top-3">
                                        输出
                                    </Badge>
                                </>
                            )}
                            {loading ? (
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                    <Loader />
                                </div>
                            ) : (
                                <div className="flex-1 h-full p-4 flex overflow-y-auto">
                                    <div className="flex flex-col w-full h-full">
                                        {filteredResults.map(([id, result]) => (
                                            <div className="flex flex-col gap-4 w-full h-full" key={id}>
                                                <div className="flex flex-wrap w-full h-full gap-4">
                                                    {result.outputs.map((output, index) => (
                                                        <Fragment key={`${id}-${index}`}>
                                                            <div
                                                                key={`${id}-${index}`}
                                                                className="flex items-center justify-center px-4 sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)]"
                                                            >
                                                                {output.type.startsWith('image/') && (
                                                                    <BlurFade 
                                                                        key={`${id}-${index}`} 
                                                                        delay={0.25} 
                                                                        inView 
                                                                        // 只有未播放过动画的才播放
                                                                        animate={!output.animated}
                                                                        onAnimationComplete={() => {
                                                                            // 动画完成后标记为已播放
                                                                            viewComfyStateDispatcher({
                                                                                type: ActionType.SET_RESULT_ANIMATED,
                                                                                payload: { id, index }
                                                                            });
                                                                        }}
                                                                        className="flex items-center justify-center w-full h-full"
                                                                    >
                                                                        <img
                                                                            src={output.data}
                                                                            alt={`Generated image ${index}`}
                                                                            className={cn("max-w-full max-h-full w-auto h-auto object-contain rounded-md transition-all hover:scale-105 cursor-pointer")}
                                                                            onClick={() => openImagePreview(output.data)}
                                                                        />
                                                                    </BlurFade>
                                                                )}
                                                                {output.type.startsWith('video/') && (
                                                                    <video
                                                                        key={`${id}-${index}`}
                                                                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
                                                                        autoPlay
                                                                        loop
                                                                    >
                                                                        <track default kind="captions" srcLang="en" src="SUBTITLE_PATH" />
                                                                        <source src={output.data} />
                                                                    </video>
                                                                )}
                                                            </div>
                                                            {output.type.startsWith('text/') && (
                                                                <pre className="whitespace-pre-wrap break-words text-sm bg-white rounded-md w-full">
                                                                    <object
                                                                        data={output.data}
                                                                        type={output.type}
                                                                        className="w-full"
                                                                    >
                                                                        Unable to display text content
                                                                    </object>
                                                                </pre>
                                                            )}
                                                            {output.type.startsWith('audio/') && (
                                                                <div className="border rounded-md p-4 bg-card w-full">
                                                                    <audio 
                                                                        controls 
                                                                        src={`data:${output.type};base64,${output.data}`} 
                                                                        className="w-full mb-2" 
                                                                    />
                                                                    <div className="flex justify-end mt-2">
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const link = document.createElement('a');
                                                                                link.href = `data:${output.type};base64,${output.data}`;
                                                                                link.download = `audio-${Date.now()}.wav`;
                                                                                link.click();
                                                                            }}
                                                                        >
                                                                            下载
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Fragment>
                                                    ))}
                                                </div>
                                                <hr className={
                                                    `w-full py-4 
                                                ${id !== filteredResults[filteredResults.length - 1][0] ? 'border-gray-300' : 'border-transparent'}
                                                `}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </main>
                <ErrorAlertDialog open={errorAlertDialog.open} errorTitle={errorAlertDialog.errorTitle} errorDescription={errorAlertDialog.errorDescription} onClose={() => setErrorAlertDialog(prev => ({ ...prev, open: false }))} />
            </div>
            
            {/* 图片放大预览对话框 */}
            <Dialog open={!!previewImageUrl} onOpenChange={(isOpen) => { if (!isOpen) closeImagePreview(); }}>
                <DialogContent className="max-w-5xl p-0 bg-transparent border-none">
                    <div className="relative">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                            onClick={closeImagePreview}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        {previewImageUrl && (
                            <img
                                src={previewImageUrl}
                                alt="预览图片"
                                className="w-full h-auto object-contain max-h-[90vh]"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

//页面组件
export default function SmartVideoPage() {
    const [loading, setLoading] = useState(false);
    return (
        <SmartVideoPageContent loading={loading} setLoading={setLoading} />
    );
} 