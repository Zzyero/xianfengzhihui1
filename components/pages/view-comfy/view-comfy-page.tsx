import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Dropzone } from '@/components/ui/dropzone';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import ViewComfyFormEditor from '@/components/pages/view-comfy/view-comfy-form-editor';
import { workflowAPItoViewComfy } from '@/lib/workflow-api-parser';
import { Trash2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import JsonView from 'react18-json-view'
import 'react18-json-view/src/style.css'
import { ActionType, type IViewComfy, type IViewComfyBase, type IViewComfyJSON, useViewComfy } from '@/app/providers/view-comfy-provider';
import { Label } from '@/components/ui/label';
import { ErrorAlertDialog } from '@/components/ui/error-alert-dialog';
import WorkflowSwitcher from '@/components/workflow-switchter';
// import { BentoGridThirdDemo } from '@/components/images-preview';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

//工作流JSON错误
class WorkflowJSONError extends Error {
    constructor() {
        super("Workflow.json file is not supported, please use workflow_api.json");
    }
}

//视图配置页面
export default function ViewComfyPage() {

    //文件
    const [file, setFile] = useState<File | null>(null);
    //视图配置
    const { viewComfyState, viewComfyStateDispatcher } = useViewComfy();
    //错误对话框
    const [errorDialog, setErrorDialog] = useState<{ open: boolean, error: Error | undefined }>({ open: false, error: undefined });
    //视图JSON
    const [viewJSON, setViewJSON] = useState<boolean>(false);

    // add back this functionality with a button at one point
    if (false) {
        setViewJSON(false);
    }

    //当文件变化时
    useEffect(() => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const parsed = JSON.parse(content);
                    //处理不同的类型文件
                    if (parsed.file_type === "view_comfy") {
                        viewComfyStateDispatcher({
                            type: ActionType.INIT_VIEW_COMFY,
                            payload: parsed as IViewComfyJSON
                        });
                    } else if (parsed.last_node_id) {
                        throw new WorkflowJSONError();
                    }
                    else {
                        viewComfyStateDispatcher({
                            type: ActionType.SET_VIEW_COMFY_DRAFT,
                            payload: { viewComfyJSON: workflowAPItoViewComfy(parsed), workflowApiJSON: parsed, file }
                        });
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    setErrorDialog({ open: true, error: error as Error });
                    viewComfyStateDispatcher({
                        type: ActionType.SET_VIEW_COMFY_DRAFT,
                        payload: undefined
                    });
                } finally {
                    setFile(null);
                }
            };
            reader.readAsText(file);
        }
    }, [file, viewComfyStateDispatcher]);

    //获取拖拽区域文本
    const getDropZoneText = () => {
        if (viewComfyState.viewComfyDraft?.viewComfyJSON) {
            return <div className="text-muted-foreground text-lg">
                拖拽你的 <b>workflow_api.json</b> 开始
            </div>
        }
        return <div className="text-muted-foreground text-lg">
            拖拽你的 <b>workflow_api.json</b> 或 <b>view_comfy.json</b> 开始
        </div>
    }

    //显示删除工作流按钮
    const showDeleteWorkflowButton = () => {
        return viewComfyState.currentViewComfy;
    }

    //删除工作流JSON
    const deleteViewComfyJSON = () => {
        if (viewComfyState.currentViewComfy) {
            viewComfyStateDispatcher({
                type: ActionType.REMOVE_VIEW_COMFY,
                payload: viewComfyState.currentViewComfy,
            });
        }
    }

    //显示拖拽区域
    const showDropZone = () => {
        return !viewComfyState.viewComfyDraft
    }

    //提交表单
    const getOnSubmit = (data: IViewComfyBase) => {
        if (viewComfyState.currentViewComfy) {
            viewComfyStateDispatcher({
                type: ActionType.UPDATE_VIEW_COMFY,
                payload: {
                    id: viewComfyState.currentViewComfy.viewComfyJSON
                        .id,
                    viewComfy: {
                        type: data.type || 'image_generation',
                        viewComfyJSON: {
                            ...data,
                            id: viewComfyState.currentViewComfy
                                .viewComfyJSON.id,
                        },
                        file: viewComfyState.viewComfyDraft?.file,
                        workflowApiJSON:
                            viewComfyState.viewComfyDraft
                                ?.workflowApiJSON,
                    },
                },
            });
        } else {
            if (data.title === "") {
                data.title = `工作流 ${viewComfyState.viewComfys.length + 1}`;
            }

            viewComfyStateDispatcher({
                type: ActionType.ADD_VIEW_COMFY,
                payload: { 
                    type: data.type || 'image_generation',
                    viewComfyJSON: { ...data, id: Math.random().toString(16).slice(2) }, 
                    file: viewComfyState.viewComfyDraft?.file, 
                    workflowApiJSON: viewComfyState.viewComfyDraft?.workflowApiJSON 
                }
            });
        }
    }

    //选择视图配置
    const onSelectChange = (data: IViewComfy) => {
        return viewComfyStateDispatcher({
            type: ActionType.UPDATE_CURRENT_VIEW_COMFY,
            payload: { ...data }
        });
    }

    //添加工作流
    const addWorkflowOnClick = () => {
        return viewComfyStateDispatcher({
            type: ActionType.RESET_CURRENT_AND_DRAFT_VIEW_COMFY,
            payload: undefined
        });
    }

    //渲染页面
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header title="功能编辑">
            </Header>
            <main className="flex-1 overflow-hidden p-2">
                {showDropZone() && (
                    <div className="flex flex-col w-full h-full overflow-hidden">
                        <div className="w-full mt-10 sm:w-1/2 sm:h-1/2 mx-auto">
                            <Dropzone
                                onChange={setFile}
                                fileExtensions={[".json"]}
                                className="custom-dropzone w-full h-full"
                                inputPlaceholder={getDropZoneText()}
                            />
                        </div>
                    </div>
                )}

                {!showDropZone() && (
                    <>
                        {viewComfyState.viewComfyDraft?.viewComfyJSON && (
                            <div className="flex flex-col w-full h-full overflow-hidden">
                                <div className="w-full flex flex-wrap items-center gap-4 mb-4">
                                    {(viewComfyState.viewComfys.length > 0 && viewComfyState.currentViewComfy) && (
                                        <div className="flex">
                                            <WorkflowSwitcher viewComfys={viewComfyState.viewComfys} currentViewComfy={viewComfyState.currentViewComfy} onSelectChange={onSelectChange} />
                                        </div>
                                    )}
                                    {showDeleteWorkflowButton() && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="destructive"
                                                onClick={deleteViewComfyJSON}
                                            >
                                                删除工作流
                                            </Button>
                                            <Button onClick={addWorkflowOnClick}>
                                                添加工作流
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <ViewComfyFormEditor onSubmit={getOnSubmit} viewComfyJSON={viewComfyState.viewComfyDraft?.viewComfyJSON} />
                                </div>
                            </div>
                        )}
                        {(viewJSON) && (
                            <div className="flex flex-col h-full overflow-hidden">
                                <JSONPreview />
                            </div>
                        )}
                    </>
                )}
            </main>
            <ErrorAlertDialog
                open={errorDialog.open}
                errorDescription={getErrorText(errorDialog.error)}
                onClose={() => setErrorDialog({ open: false, error: undefined })} />
        </div>
    )
}

//获取错误文本
function getErrorText(error: Error | undefined) {
    if (!error) {
        return <> </>
    }
    if (error instanceof WorkflowJSONError) {
        return <>
            Looks like you have uploaded a workflow.json instead of workflow_api.json <br />
            To generate workflow_api.json, enable dev mode options in the ComfyUI settings and export using the "Save (API format)" button.
        </>
    }

    return <> An error occurred while parsing the JSON, most commons cuase is the json is not valid or is empty. <br /> <b> error details: </b> <br /> {error.message} </>

}

//JSON预览  
function JSONPreview() {
    const { viewComfyState, viewComfyStateDispatcher } = useViewComfy();
    const getFileInfo = () => {
        if (viewComfyState.viewComfyDraft?.file) {
            const fileSizeInKB = Math.round(viewComfyState.viewComfyDraft.file.size / 1024);
            return `Uploaded file: ${viewComfyState.viewComfyDraft.file.name} (${fileSizeInKB} KB)`;
        }
        return undefined;
    }

    const removeFileOnClick = () => {
        viewComfyStateDispatcher({
            type: ActionType.SET_VIEW_COMFY_DRAFT,
            payload: undefined
        });
    }



    return (
        <>
            {!viewComfyState.currentViewComfy && (
                <Button
                    variant="secondary"
                    className="border-2 border-dashed text-muted-foreground mb-4"
                    onClick={removeFileOnClick}
                >
                    <p className="text-muted-foreground mr-2">{getFileInfo()}</p>
                    <Trash2 className="size-5" />
                </Button>
            )}
            <div className="h-full hidden md:block">
                <Label className="mb-2">Workflow API JSON</Label>
                <ScrollArea className="flex-1 rounded-md border">
                    <JsonView src={viewComfyState.viewComfyDraft?.workflowApiJSON} collapsed={3} displaySize={3} editable={false} />
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </>
    )
}
