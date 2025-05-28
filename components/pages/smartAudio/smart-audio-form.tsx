import { useFieldArray, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button";
import type { IViewComfyBase, IViewComfyWorkflow } from "@/app/providers/view-comfy-provider";
import { cn } from "@/lib/utils";
import { ViewComfyForm } from "@/components/view-comfy/view-comfy-form";
import { Music } from "lucide-react";
import "./SmartAudioForm.css";
import { useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

//表单组件
export default function SmartAudioForm(props: {
    viewComfyJSON: IViewComfyWorkflow, onSubmit: (data: IViewComfyWorkflow) => void, loading: boolean
}) {
    const { viewComfyJSON, onSubmit, loading } = props;

    //默认值
    const defaultValues = {
        title: viewComfyJSON.title,
        description: viewComfyJSON.description,
        textOutputEnabled: viewComfyJSON.textOutputEnabled ?? false,
        inputs: viewComfyJSON.inputs,
        advancedInputs: viewComfyJSON.advancedInputs,
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

    //重置表单
    useEffect(() => {
        if (viewComfyJSON) {
            form.reset({
                title: viewComfyJSON.title,
                description: viewComfyJSON.description,
                textOutputEnabled: viewComfyJSON.textOutputEnabled ?? false,
                inputs: viewComfyJSON.inputs,
                advancedInputs: viewComfyJSON.advancedInputs,
            });
        }
    }, [viewComfyJSON, form]);

    //渲染表单  
    return (
        <>
            <ViewComfyForm 
                form={form} 
                onSubmit={(data) => {
                    onSubmit(data);
                    toast({
                        title: "生成请求已提交",
                        description: "请等待生成结果",
                        duration: 3000,
                    });
                }} 
                inputFieldArray={inputFieldArray} 
                advancedFieldArray={advancedFieldArray}
                isLoading={loading}
            >
                <div className={cn("sticky bottom-0 p-4 bg-background w-full rounded-md")}>
                    <Button type="submit" className="w-full">
                        生成音频 <Music className={cn("size-5 ml-2")} />
                    </Button>
                </div>
            </ViewComfyForm>
        </>
    )
} 