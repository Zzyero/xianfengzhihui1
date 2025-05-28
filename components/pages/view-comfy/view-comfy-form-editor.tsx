import React, { useEffect, useState } from 'react';
import 'react18-json-view/src/style.css'
import { useViewComfy, type IViewComfyBase } from "@/app/providers/view-comfy-provider";
import { useForm, useFieldArray } from 'react-hook-form';
import { ViewComfyForm } from '@/components/view-comfy/view-comfy-form';
import { ToastAction } from "@/components/ui/toast"
import { useToast } from '@/hooks/use-toast';
import { CheckIcon, Trash2 } from 'lucide-react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import JsonView from 'react18-json-view'

interface ViewComfyFormEditorProps {
    onSubmit: (data: IViewComfyBase) => void;
    viewComfyJSON: IViewComfyBase;
}

//视图配置表单编辑器组件
export default function ViewComfyFormEditor(props: ViewComfyFormEditorProps) {
    const { onSubmit, viewComfyJSON } = props;
    const { toast } = useToast();
    const [viewType, setViewType] = useState<'image_generation' | 'smart_ps' | 'audio_generation' | 'video_generation'>(
        viewComfyJSON?.type || 'image_generation'
    );

    //获取视图配置
    const { viewComfyState } = useViewComfy();

    const [downloadJson, setDownloadJson] = useState<boolean>(false);

    //默认值
    const defaultValues: IViewComfyBase = {
        title: viewComfyJSON.title,
        description: viewComfyJSON.description,
        textOutputEnabled: viewComfyJSON.textOutputEnabled,
        previewImages: viewComfyJSON.previewImages,
        inputs: viewComfyJSON.inputs,
        advancedInputs: viewComfyJSON.advancedInputs,
        type: viewComfyJSON.type || 'image_generation',
    }

    //表单
    const form = useForm<IViewComfyBase>({
        defaultValues
    });

    //输入框
    const inputFieldArray = useFieldArray({
        control: form.control,
        name: "inputs"
    });

    //高级输入框
    const advancedFieldArray = useFieldArray({
        control: form.control,
        name: "advancedInputs"
    });

    //当配置更新时重置表单
    useEffect(() => {
        if (viewComfyJSON) {
            form.reset({
                title: viewComfyJSON.title,
                description: viewComfyJSON.description,
                textOutputEnabled: viewComfyJSON.textOutputEnabled,
                previewImages: viewComfyJSON.previewImages,
                inputs: viewComfyJSON.inputs,
                advancedInputs: viewComfyJSON.advancedInputs,
                type: viewComfyJSON.type || 'image_generation',
            });
        }
    }, [viewComfyJSON, form]);

    //提交表单
    function submitOnCLick(data: IViewComfyBase) {
        onSubmit(data);

        //提示  
        toast({
            title: "表单保存成功!",
            description: "去 Playground 运行它",
            duration: 3000,
            action: (
                <ToastAction altText="Goto schedule to undo">
                    <CheckIcon className="size-5 text-green-500" />
                </ToastAction>
            ),
        });
    }

    //下载视图配置
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function downloadViewComfyJSON(data: any) {
        onSubmit(data);
        setDownloadJson(true);
    }

    //下载视图配置
    useEffect(() => {
        if (downloadJson) {
            const workflows = viewComfyState.viewComfys.map((item) => {
                return {
                    type: item.type || item.viewComfyJSON.type || 'image_generation',
                    viewComfyJSON: item.viewComfyJSON,
                    workflowApiJSON: item.workflowApiJSON
                }
            });
            const viewComfyJSON = {
                "file_type": "view_comfy",
                "file_version": "1.0.0",
                "version": "0.0.1",
                workflows
            }

            //转换为json字符串  
            const jsonString = JSON.stringify(viewComfyJSON, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'view_comfy.json';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setDownloadJson(false);
        }
    }, [downloadJson, viewComfyState.viewComfys]);

    //渲染表单
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <ViewComfyForm 
                form={form} 
                onSubmit={submitOnCLick} 
                inputFieldArray={inputFieldArray} 
                advancedFieldArray={advancedFieldArray} 
                editMode={true}
                downloadViewComfyJSON={downloadViewComfyJSON}
                >
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem className="pb-5">
                            <FormLabel>类型</FormLabel>
                            <Select
                                value={field.value}
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    const workflowType = value as 'image_generation' | 'smart_ps' | 'audio_generation' | 'video_generation';
                                    setViewType(workflowType);
                                }}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="选择类型" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="image_generation">智能生图</SelectItem>
                                    <SelectItem value="smart_ps">智能修图</SelectItem>
                                    <SelectItem value="audio_generation">智能音频</SelectItem>
                                    <SelectItem value="video_generation">智能视频</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </ViewComfyForm>
        </div>
    )
}

//将工作流API类型转换为输入HTML类型
export function parseWorkflowApiTypeToInputHtmlType(type: string): HTMLInputElement["type"] {

    switch (type) {
        case "string":
            return "text";
        case "number":
            return "number";
        case "bigint":
            return "number";
        case "boolean":
            return "checkbox";
        case "float":
            return "number";
        case "long-text":
            return "text";
        default:
            return "text";
    }
}

