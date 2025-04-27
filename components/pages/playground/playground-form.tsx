import { useFieldArray, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button";
import type { IViewComfyBase, IViewComfyWorkflow } from "@/app/providers/view-comfy-provider";
import { cn } from "@/lib/utils";
import { ViewComfyForm } from "@/components/view-comfy/view-comfy-form";
import { WandSparkles } from "lucide-react";
import "./PlaygroundForm.css";
import { useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import stateManager, { PageType } from "@/lib/stateManager";

//表单组件
export default function PlaygroundForm(props: {
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

    // 首次渲染时，尝试从localStorage恢复表单状态
    useEffect(() => {
        if (viewComfyJSON) {
            try {
                // 尝试从localStorage加载保存的状态
                const savedState = stateManager.loadPageState<IViewComfyBase>(PageType.Playground);
                
                // 如果有保存的状态，且与当前工作流匹配（通过标题进行简单对比）
                if (savedState && savedState.title === viewComfyJSON.title) {
                    console.log('恢复智能生图表单状态', savedState);
                    form.reset(savedState);
                } else {
                    // 如果没有匹配的保存状态，使用默认值
                    form.reset({
                        title: viewComfyJSON.title,
                        description: viewComfyJSON.description,
                        textOutputEnabled: viewComfyJSON.textOutputEnabled ?? false,
                        inputs: viewComfyJSON.inputs,
                        advancedInputs: viewComfyJSON.advancedInputs,
                    });
                }
            } catch (error) {
                console.error('恢复智能生图表单状态失败:', error);
                // 发生错误时使用默认值
                form.reset({
                    title: viewComfyJSON.title,
                    description: viewComfyJSON.description,
                    textOutputEnabled: viewComfyJSON.textOutputEnabled ?? false,
                    inputs: viewComfyJSON.inputs,
                    advancedInputs: viewComfyJSON.advancedInputs,
                });
            }
        }
    }, [viewComfyJSON, form]);

    // 当表单值变化时保存到localStorage
    useEffect(() => {
        const subscription = form.watch((value) => {
            if (value.title) { // 确保表单已初始化
                stateManager.savePageState(PageType.Playground, value);
            }
        });
        
        return () => subscription.unsubscribe();
    }, [form]);

    // 处理表单提交
    const handleSubmit = (data: IViewComfyBase) => {
        // 提交前保存当前表单状态
        stateManager.savePageState(PageType.Playground, data);
        
        // 调用原有的提交函数
        onSubmit(data as IViewComfyWorkflow);
        
        // 显示提交成功提示
        toast({
            title: "生成请求已提交",
            description: "请等待生成结果",
            duration: 3000,
        });
    };

    return (
        <div className="flex flex-col w-full max-h-full px-4 pb-10">
            <ViewComfyForm
                form={form}
                onSubmit={handleSubmit}
                inputFieldArray={inputFieldArray}
                advancedFieldArray={advancedFieldArray}
                isLoading={loading}
            >
                <div className="flex flex-row-reverse mt-8">
                    <Button
                        type="submit"
                        className={cn(
                            "w-full transition-opacity duration-100",
                            loading && "opacity-50"
                        )}
                        disabled={loading}>
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="loading loading-xs loading-spinner"></span>
                                <span>{"生成中..."}</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <WandSparkles className="w-4 h-4" />
                                <span>{"开始生成"}</span>
                            </span>
                        )}
                    </Button>
                </div>
            </ViewComfyForm>
        </div>
    );
}

