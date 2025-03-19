/* eslint-disable @next/next/no-img-element */
import {
    Settings,
    ChevronDown
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
import { cn } from "@/lib/utils";
import WorkflowSwitcher from "@/components/workflow-switchter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PreviewOutputsImageGallery } from "@/components/images-preview"
import { QueueManager } from "@/components/queue-manager";

const apiErrorHandler = new ApiErrorHandler();

//页面内容组件
function PlaygroundPageContent({ loading, setLoading }: { loading: boolean, setLoading: (loading: boolean) => void }) {
    const [results, SetResults] = useState<{ [key: string]: { outputs: Blob, url: string }[] }>({});
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
                        const error = await response.json() as ResponseError;
                        throw error;
                    }
                    const data = await response.json() as IViewComfy;
                    viewComfyStateDispatcher({
                        type: ActionType.UPDATE_CURRENT_VIEW_COMFY,
                        payload: data
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

    //提交表单
    const { doPost, loading: postLoading } = usePostPlayground();

    //中断生成
    const handleInterrupt = () => {
        // 实现中断逻辑
    };

    //清空队列
    const handleClearQueue = () => {
        // 实现清空队列逻辑
    };

    function onSubmit(data: IViewComfyWorkflow) {
        setLoading(true);
        
        //获取输入
        const inputs: { key: string, value: string }[] = [];

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
        doPost({
            viewComfy: generationData,
            workflow: viewComfyState.currentViewComfy?.workflowApiJSON,
            onSuccess: (data) => {
                onSetResults(data);
                setLoading(false);
            },
            onError: (error) => {
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

    //设置结果
    const onSetResults = (data: Blob[]) => {
        const timestamp = new Date().getTime().toString();
        const urls = data.map((blob) => {
            return {
                outputs: blob,
                url: URL.createObjectURL(blob)
            };
        });
        SetResults(prev => ({
            ...prev,
            [timestamp]: urls
        }));
    };

    //选择变更
    const onSelectChange = (data: IViewComfy) => {
        viewComfyStateDispatcher({
            type: ActionType.UPDATE_CURRENT_VIEW_COMFY,
            payload: data
        });
    };

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
                    <div className="flex items-center gap-2">
                        <QueueManager 
                            onInterrupt={handleInterrupt}
                            onClear={handleClearQueue}
                        />
                    </div>
                </div>
                <main className="grid overflow-hidden flex-1 gap-4 p-2 md:grid-cols-2 lg:grid-cols-3">
                    <div className="relative hidden flex-col items-start gap-8 md:flex overflow-hidden">
                        <ScrollArea className="w-full h-full">
                            <PlaygroundForm 
                                viewComfyJSON={viewComfyState.currentViewComfy?.viewComfyJSON} 
                                onSubmit={onSubmit} 
                                loading={loading} 
                            />
                        </ScrollArea>
                    </div>
                    <div className="relative h-full min-h-[50vh] rounded-xl bg-muted/50 px-1 lg:col-span-2">
                        <ScrollArea className="relative flex h-full w-full flex-col">
                            {(Object.keys(results).length === 0) && !loading && (
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
                                        {Object.entries(results).map(([timestamp, generation], index, array) => (
                                            <div className="flex flex-col gap-4 w-full h-full" key={timestamp}>
                                                <div className="flex flex-wrap w-full h-full gap-4" key={timestamp}>
                                                    {generation.map((output) => (
                                                        <Fragment key={output.url}>
                                                            <div
                                                                key={output.url}
                                                                className="flex items-center justify-center px-4 sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)]"
                                                            >
                                                                {(output.outputs.type.startsWith('image/')) && (
                                                                    <BlurFade key={output.url} delay={0.25} inView className="flex items-center justify-center w-full h-full">
                                                                        <img
                                                                            src={output.url}
                                                                            alt={`${output.url}`}
                                                                            className={cn("max-w-full max-h-full w-auto h-auto object-contain rounded-md transition-all hover:scale-105")}
                                                                        />
                                                                    </BlurFade>
                                                                )}
                                                                {(output.outputs.type.startsWith('video/')) && (
                                                                    <video
                                                                        key={output.url}
                                                                        className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
                                                                        autoPlay
                                                                        loop

                                                                    >
                                                                        <track default kind="captions" srcLang="en" src="SUBTITLE_PATH" />
                                                                        <source src={output.url} />
                                                                    </video>
                                                                )}
                                                            </div>
                                                            {(output.outputs.type.startsWith('text/')) && (
                                                                <pre className="whitespace-pre-wrap break-words text-sm bg-white rounded-md w-full">
                                                                    {URL.createObjectURL(output.outputs) && (
                                                                        <object
                                                                            data={output.url}
                                                                            type={output.outputs.type}
                                                                            className="w-full"
                                                                        >
                                                                            Unable to display text content
                                                                        </object>
                                                                    )}
                                                                </pre>
                                                            )}
                                                        </Fragment>
                                                    ))}
                                                </div>
                                                <hr className={
                                                    `w-full py-4 
                                                ${index !== array.length - 1 ? 'border-gray-300' : 'border-transparent'}
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
