/* eslint-disable @next/next/no-img-element */
import {
    Settings
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
import PlaygroundForm from "./playground-form";
import { Loader } from "@/components/loader";
import { usePostPlayground } from "@/hooks/playground/use-post-playground";
import { ActionType, type IViewComfy, type IViewComfyWorkflow, useViewComfy } from "@/app/providers/view-comfy-provider";
import { ErrorAlertDialog } from "@/components/ui/error-alert-dialog";
import { ApiErrorHandler } from "@/lib/api-error-handler";
import type { ResponseError } from "@/app/models/errors";
import BlurFade from "@/components/ui/blur-fade";
import { blobToBase64, cn } from "@/lib/utils";
import WorkflowSwitcher from "@/components/workflow-switchter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PreviewOutputsImageGallery } from "@/components/images-preview"
import { QueueManager } from "@/components/queue-manager";

const apiErrorHandler = new ApiErrorHandler();

//页面内容组件
function PlaygroundPageContent({ loading, setLoading }: { loading: boolean, setLoading: (loading: boolean) => void }) {
    const { viewComfyState, viewComfyStateDispatcher } = useViewComfy();
    const viewMode = process.env.NEXT_PUBLIC_VIEW_MODE === "true";
    const [errorAlertDialog, setErrorAlertDialog] = useState<{ open: boolean, errorTitle: string | undefined, errorDescription: React.JSX.Element, onClose: () => void }>({ open: false, errorTitle: undefined, errorDescription: <></>, onClose: () => { } });

    //获取视图配置
    useEffect(() => {
        if (viewMode) {
            const fetchViewComfy = async () => {
                try {
                    const response = await fetch("/api/playground");

                    if (!response.ok) {
                        const responseError: ResponseError =
                            await response.json();
                        throw responseError;
                    }
                    const data = await response.json();
                    
                    // 过滤只获取 image_generation 类型的工作流
                    const imageGenerationWorkflows = {
                        ...data.viewComfyJSON,
                        workflows: data.viewComfyJSON.workflows.filter(
                            (workflow: any) => workflow.type === 'image_generation'
                        )
                    };
                    
                    viewComfyStateDispatcher({ type: ActionType.INIT_VIEW_COMFY, payload: imageGenerationWorkflows });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                    if (error.errorType) {
                        const responseError =
                            apiErrorHandler.apiErrorToDialog(error);
                        setErrorAlertDialog({
                            open: true,
                            errorTitle: responseError.title,
                            errorDescription: <>{responseError.description}</>,
                            onClose: () => { },
                        });
                    } else {
                        setErrorAlertDialog({
                            open: true,
                            errorTitle: "Error",
                            errorDescription: <>{error.message}</>,
                            onClose: () => { },
                        });
                    }
                }
            };
            fetchViewComfy();
        }
    }, [viewMode, viewComfyStateDispatcher]);

    // 自动切换到 image_generation 类型的工作流
    useEffect(() => {
        // 如果有工作流且当前工作流类型不是 image_generation
        if (viewComfyState.viewComfys.length > 0 && 
            (!viewComfyState.currentViewComfy || viewComfyState.currentViewComfy.type !== 'image_generation')) {
            
            // 查找第一个 image_generation 类型的工作流
            const imageGenerationWorkflow = viewComfyState.viewComfys.find(
                workflow => workflow.type === 'image_generation'
            );
            
            // 如果找到了匹配的工作流，自动选择它
            if (imageGenerationWorkflow) {
                viewComfyStateDispatcher({
                    type: ActionType.UPDATE_CURRENT_VIEW_COMFY,
                    payload: imageGenerationWorkflow
                });
            }
        }
    }, [viewComfyState.viewComfys, viewComfyState.currentViewComfy, viewComfyStateDispatcher]);

    const { doPost } = usePostPlayground();

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
                        pageType: 'image_generation'
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
                    errorDescription: <> {errorDialog.description} </>,
                    onClose: () => {
                        setErrorAlertDialog({ open: false, errorTitle: undefined, errorDescription: <></>, onClose: () => { } });
                    }
                });
            }
        });
    }

    // 清除队列
    const handleClearQueue = () => {
        // 只清除当前页面类型的结果
        viewComfyStateDispatcher({
            type: ActionType.CLEAR_GENERATION_RESULTS,
            payload: { pageType: 'image_generation' }
        });
    };

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

    const onSelectChange = (data: IViewComfy) => {
        // 确保只选择 image_generation 类型的工作流
        if (data.type !== 'image_generation') {
            return;
        }
        return viewComfyStateDispatcher({
            type: ActionType.UPDATE_CURRENT_VIEW_COMFY,
            payload: { ...data }
        });
    }

    // 获取当前页面类型的生成结果
    const filteredResults = Object.entries(viewComfyState.generationResults)
        .filter(([id, result]) => result.pageType === 'image_generation')
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
                    <h1 className="text-2xl font-bold">生图区</h1>
                    <QueueManager 
                        onInterrupt={handleInterrupt}
                        onClear={handleClearQueue}
                    />
                </div>
                <div className="md:hidden w-full flex pl-4 gap-x-2">
                    <WorkflowSwitcher viewComfys={viewComfyState.viewComfys} currentViewComfy={viewComfyState.currentViewComfy} onSelectChange={onSelectChange} />
                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden self-bottom w-[85px] gap-1">
                                <Settings className="size-4" />
                                设置
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent className="max-h-[80vh] gap-4 px-4 h-full">
                            <PlaygroundForm viewComfyJSON={viewComfyState.currentViewComfy?.viewComfyJSON} onSubmit={onSubmit} loading={loading} />
                        </DrawerContent>
                    </Drawer>
                </div>
                <main className="grid overflow-hidden flex-1 gap-4 p-2 md:grid-cols-2 lg:grid-cols-3">
                    <div className="relative hidden flex-col items-start gap-8 md:flex overflow-hidden">
                        {viewComfyState.viewComfys.length > 0 && viewComfyState.currentViewComfy && (
                            <div className="px-3 w-full">
                                <WorkflowSwitcher 
                                    viewComfys={viewComfyState.viewComfys.filter(workflow => workflow.type === 'image_generation')} 
                                    currentViewComfy={viewComfyState.currentViewComfy} 
                                    onSelectChange={onSelectChange} 
                                />
                            </div>
                        )}
                        {viewComfyState.currentViewComfy && <PlaygroundForm viewComfyJSON={viewComfyState.currentViewComfy?.viewComfyJSON} onSubmit={onSubmit} loading={loading} />}

                    </div>
                    <div className="relative h-full min-h-[50vh] rounded-xl bg-muted/50 px-1 lg:col-span-2">
                        <ScrollArea className="relative flex h-full w-full flex-col">
                            {(filteredResults.length === 0) && !loading && (
                                <>  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full">
                                    <PreviewOutputsImageGallery viewComfyJSON={viewComfyState.currentViewComfy?.viewComfyJSON} />
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
                                                                            className={cn("max-w-full max-h-full w-auto h-auto object-contain rounded-md transition-all hover:scale-105")}
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
                <ErrorAlertDialog open={errorAlertDialog.open} errorTitle={errorAlertDialog.errorTitle} errorDescription={errorAlertDialog.errorDescription} onClose={errorAlertDialog.onClose} />
            </div>
        </>
    )
}

export default function PlaygroundPage() {
    const [loading, setLoading] = useState(false);
    return <PlaygroundPageContent loading={loading} setLoading={setLoading} />;
}
