/* eslint-disable @next/next/no-img-element */
import React from "react";
import { useFieldArray, type UseFieldArrayRemove, type UseFieldArrayReturn, type UseFormReturn } from "react-hook-form"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";
import type { IViewComfyBase } from "@/app/providers/view-comfy-provider";
import type { IInputField } from "@/lib/workflow-api-parser";
import { parseWorkflowApiTypeToInputHtmlType } from "@/components/pages/view-comfy/view-comfy-form-editor";
import { Textarea } from "@/components/ui/textarea";
import { CHECKBOX_STYLE, FORM_STYLE, TEXT_AREA_STYLE } from "@/components/styles";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { Dropzone } from "../ui/dropzone";
import { ChevronsUpDown } from "lucide-react"
import { AutosizeTextarea } from "../ui/autosize-text-area"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useState, useEffect } from "react";
import { getComfyUIRandomSeed, cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Eraser } from "lucide-react"
import { MaskEditor } from "@/components/ui/mask-editor";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface IInputForm extends IInputField {
    id: string;
}

// ViewComfyForm 组件的主要功能：
// 1. 处理基础输入和高级输入字段
// 2. 支持编辑模式和预览模式
// 3. 处理表单提交和JSON下载
export function ViewComfyForm(args: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: UseFormReturn<IViewComfyBase, any, undefined>, onSubmit: (data: any) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputFieldArray: UseFieldArrayReturn<any>, advancedFieldArray: UseFieldArrayReturn<any>,
    editMode?: boolean,//是否处于编辑模式
    downloadViewComfyJSON?: (data: IViewComfyBase) => void,//下载ViewComfy JSON
    children?: React.ReactNode,//子组件
    isLoading?: boolean//加载状态

}) {
    const { form, onSubmit, inputFieldArray, advancedFieldArray, editMode = false, downloadViewComfyJSON, children } = args;
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full w-full">
                <div className="flex flex-row gap-x-2 flex-1 min-h-0">
                    <div className='flex-col flex-1 items-start gap-4 flex mr-1 min-h-0'>
                        <div id="inputs-form" className="grid w-full items-start gap-2 h-full">
                            <ScrollArea className="w-full h-full flex-1 rounded-md px-[5px] pr-4">
                                {/* 编辑模式下显示的表单字段 */}
                                {editMode && (
                                    <>
                                        {/* 标题输入字段 */}
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem key="title" className="ml-0.5">
                                                    <FormLabel>标题</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="工作流的名称" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {/* 描述输入字段 */}
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem key="description" className="ml-0.5">
                                                    <FormLabel>描述</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="描述工作流的功能" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {/* 文本输出启用开关 */}
                                        <FormField
                                            control={form.control}
                                            name="textOutputEnabled"
                                            render={({ field }) => (
                                                <FormItem key="textOutputEnabled" className="">
                                                    <FormControl>
                                                        <div className={cn(`flex ml-0.5 space-x-2 pt-2`,
                                                            (field.value) ? "mb-[-5px]" : "pb-2"
                                                        )}>
                                                            <FormLabel>允许文本生成</FormLabel>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                            />
                                                        </div>
                                                    </FormControl>
                                                    {/* 文本输出的警告提示 */}
                                                    {(field.value) && (
                                                        <FormDescription className="pb-2">
                                                            Text output is in beta and can lead to unexpected text being rendered
                                                        </FormDescription>
                                                    )}
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}

                                {/* 非编辑模式下显示的标题和描述 */}
                                {!editMode && (
                                    <div id="workflow-title-description">
                                        <h1 className="text-xl font-semibold">{form.getValues("title")}</h1>
                                        <p className="text-md text-muted-foreground whitespace-pre-wrap">{form.getValues("description")}</p>
                                    </div>
                                )}

                                {/* 基础输入字段区域 */}
                                <fieldset className="grid gap-2 rounded-lg p-1">
                                    {/* 编辑模式下显示的标题 */}
                                    {editMode && (
                                        <legend className="-ml-1 px-1 text-sm font-medium">
                                            基础输入
                                        </legend>
                                    )}
                                    {/* 渲染输入字段数组 */}
                                    {inputFieldArray.fields.map((field, index) => {
                                        // 检查是否有输入项
                                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                                        if (field.inputs.length > 0) {
                                            if (editMode) {
                                                return (
                                                    // 编辑模式下的输入字段组
                                                    <fieldset className="grid gap-4 rounded-lg border p-4">
                                                        <legend className="-ml-1 px-1 text-sm font-medium">
                                                            {
                                                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                                                // @ts-ignore
                                                                field.title
                                                            }
                                                            {/* 删除按钮 */}
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="text-muted-foreground"
                                                                onClick={() => inputFieldArray.remove(index)}
                                                            >
                                                                <Trash2 className="size-5" />
                                                            </Button>
                                                        </legend>
                                                        {/* 嵌套输入字段 */}
                                                        <NestedInputField form={form} nestedIndex={index} editMode={editMode} formFieldName="inputs" />
                                                    </fieldset>
                                                )
                                            }

                                            return (
                                                // 非编辑模式下的输入字段组
                                                <fieldset className="grid gap-4">
                                                    <NestedInputField form={form} nestedIndex={index} editMode={editMode} formFieldName="inputs" />
                                                </fieldset>
                                            )
                                        }
                                        return undefined;
                                    })}
                                    {/* 非编辑模式下的子组件 */}
                                    {!editMode && (children)}
                                </fieldset>
                                {/* 如果存在高级输入字段，显示高级输入区域 */}
                                {advancedFieldArray.fields.length > 0 && (
                                    <AdvancedInputSection advancedFieldArray={advancedFieldArray} form={form} editMode={editMode} />
                                )}
                                {/* 编辑模式下显示子组件 */}
                                {editMode && (children)}
                            </ScrollArea >
                        </div>
                    </div>
                    {/* 编辑模式下显示预览图片上传区域 */}
                    {editMode && (
                        <ScrollArea className="h-full flex-1 rounded-md px-[5px] pr-4">
                            <div className="">
                                <PreviewImagesInput form={form} />
                            </div>
                        </ScrollArea>
                    )}
                </div>
                {/* 编辑模式下显示底部保存按钮区域 */}
                {editMode && (
                    <div className={cn("sticky bottom-0 p-4 bg-background w-full flex flex-row gap-x-4 rounded-md")}>
                        {/* 保存更改按钮 */}
                        <Button type="submit" className="w-full mb-2" onClick={form.handleSubmit(onSubmit)}>
                            保存更改
                        </Button>
                        {/* 下载JSON按钮 */}
                        {downloadViewComfyJSON && (
                            <Button variant="secondary" className="w-full" onClick={form.handleSubmit(downloadViewComfyJSON)}>
                                下载ViewComfy.json文件
                            </Button>
                        )}
                    </div>
                )}
            </form>
        </Form>
    )
}

/**
 * 预览图片上传组件
 * 允许上传最多3张预览图片
 */
function PreviewImagesInput({ form }: { form: UseFormReturn<IViewComfyBase> }) {
    // 保存图片到服务器
    const saveImage = async (file: File | null, onChange: (url: string) => void): Promise<void> => {
        if (file) {
            try {
                const formData = new FormData()
                formData.append('file', file)
                const response = await fetch('/api/playground/preview-images', {
                    method: 'POST',
                    body: formData,
                })
                if (!response.ok) {
                    throw new Error('Upload failed')
                }
                const data = await response.json()
                onChange(data.url)
            } catch (error) {
                console.error('Error uploading file:', error)
            }
        }
    }

    // 从服务器删除图片
    const deleteImage = async (imageUrl: string) => {
        try {
            const response = await fetch('/api/playground/preview-images', {
                method: 'DELETE',
                body: JSON.stringify({ url: imageUrl }), // Send the image URL or identifier
            });
            if (!response.ok) {
                throw new Error('Image deletion failed');
            }
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    return (
        <div className="grid gap-4">
            {/* 渲染3个预览图片上传框 */}
            {[0, 1, 2].map((index) => (
                <FormField
                    key={index}
                    control={form.control}
                    name={`previewImages.${index}`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Preview Image {index + 1}</FormLabel>
                            <FormControl>
                                <div className="space-y-2">
                                    {/* 如果已有图片则显示图片预览和删除按钮 */}
                                    {field.value ? (
                                        <div className="flex flex-col gap-2">
                                            <img
                                                src={field.value}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full object-contain rounded-md max-h-[300px]"
                                                onError={() => {
                                                    field.onChange("");
                                                }}
                                            />
                                            <Button
                                                variant="secondary"
                                                className="border-2 text-muted-foreground"
                                                onClick={() => {
                                                    deleteImage(field.value);
                                                    field.onChange("")
                                                }}
                                            >
                                                <Trash2 className="size-5 mr-2" /> 删除图片
                                            </Button>
                                        </div>
                                    ) : (
                                        // 如果没有图片则显示拖放上传区域
                                        <Dropzone
                                            onChange={(file) => saveImage(file, field.onChange)}
                                            fileExtensions={['png', 'jpg', 'jpeg']}
                                            className="form-dropzone"
                                            inputPlaceholder="Drop an image"
                                        />
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ))}
        </div>
    );
}

/**
 * 高级输入区域组件
 * 可折叠显示的高级配置选项
 */
function AdvancedInputSection(args: { advancedFieldArray: UseFieldArrayReturn<any>, form: UseFormReturn<IViewComfyBase, any, undefined>, editMode: boolean }) {
    const { advancedFieldArray, form, editMode } = args;
    // 控制折叠状态，编辑模式下默认展开
    const [isOpen, setIsOpen] = useState(editMode);
    
    return (<>
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="space-y-2 mb-2"
        >
            {/* 非编辑模式下显示折叠触发器 */}
            {!editMode && (<div className="flex items-center space-x-4 px-4">
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="default" className="w-full">
                        高级设置
                        <ChevronsUpDown className="size-5" />
                    </Button>
                </CollapsibleTrigger>
            </div>
            )}
            <CollapsibleContent className="space-y-2">
                <fieldset className="grid gap-2 rounded-lg p-1">
                    {/* 编辑模式下显示标题 */}
                    {editMode && (
                        <legend className="-ml-1 px-1 text-sm font-medium">
                            高级设置
                        </legend>
                    )}
                    {/* 渲染高级输入字段 */}
                    {advancedFieldArray.fields.map((advancedField, index) => (
                        <fieldset className="grid gap-4 rounded-lg border p-4">
                            <legend className="-ml-1 px-1 text-sm font-medium">
                                {
                                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                    // @ts-ignore
                                    advancedField.title
                                }
                                {/* 编辑模式下显示删除按钮 */}
                                {editMode && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-muted-foreground"
                                        onClick={() => advancedFieldArray.remove(index)}
                                    >
                                        <Trash2 className="size-5" />
                                    </Button>
                                )}
                            </legend>
                            {/* 渲染嵌套的高级输入字段 */}
                            <NestedInputField form={form} nestedIndex={index} editMode={editMode} formFieldName="advancedInputs" />
                        </fieldset>
                    ))}
                </fieldset>
            </CollapsibleContent>
        </Collapsible>
    </>)
}

/**
 * 嵌套输入字段组件
 * 处理表单中的嵌套字段结构
 */
function NestedInputField(args: { form: UseFormReturn<IViewComfyBase, any, undefined>, nestedIndex: number, editMode: boolean, formFieldName: string }) {
    const { form, nestedIndex, editMode, formFieldName } = args;
    // 使用useFieldArray处理嵌套字段数组
    const nestedFieldArray = useFieldArray({
        control: form.control,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        name: `${formFieldName}[${nestedIndex}].inputs`
    });

    return (
        <>
            {/* 渲染每个嵌套输入字段 */}
            {nestedFieldArray.fields.map((item, k) => {
                const input = item as IInputForm;
                return (
                    <FormField
                        key={input.id}
                        control={form.control}
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        name={`${formFieldName}[${nestedIndex}].inputs[${k}].value`}
                        render={({ field }) => (
                            <>
                                <InputFieldToUI key={input.id} input={input} field={field} editMode={editMode} remove={nestedFieldArray.remove} index={k} />
                            </>
                        )}
                    />
                )
            })}
        </>
    )
}

/**
 * 输入字段类型转换组件
 * 根据输入字段类型返回对应的UI组件
 */
function InputFieldToUI(args: { input: IInputForm, field: any, editMode?: boolean, remove?: UseFieldArrayRemove, index: number }) {
    const { input, field, editMode, remove, index } = args;

    // 根据不同的输入类型返回对应的组件
    if (input.valueType === "long-text") {
        // 长文本输入
        return (
            <FormTextAreaInput input={input} field={field} editMode={editMode} remove={remove} index={index} />
        )
    }

    if (input.valueType === "boolean") {
        // 布尔值复选框
        return (
            <FormCheckboxInput input={input} field={field} editMode={editMode} remove={remove} index={index} />
        )
    }

    if (input.valueType === "video" || input.valueType === "image") {
        // 媒体文件输入
        return (
            <FormMediaInput input={input} field={field} editMode={editMode} remove={remove} index={index} />
        )
    }

    if (input.valueType === "seed" || input.valueType === "noise_seed" || input.valueType === "rand_seed") {
        // 随机种子输入
        return (
            <FormSeedInput input={input} field={field} editMode={editMode} remove={remove} index={index} />
        )
    }

    // 默认基础输入
    return (
        <FormBasicInput input={input} field={field} editMode={editMode} remove={remove} index={index} />
    )
}

/**
 * 随机种子输入组件
 * 支持手动输入和随机生成种子值
 */
function FormSeedInput(args: { input: IInputForm, field: any, editMode?: boolean, remove?: UseFieldArrayRemove, index: number }) {
    const { input, field, editMode, remove, index } = args;
    // Number.MIN_VALUE 用于标识输入已被随机化
    const [isRandomized, setIsRandomized] = useState(field.value === Number.MIN_VALUE);
    const [storedValue] = useState(field.value);

    // 切换随机化状态
    const toggleRandomize = () => {
        const newValue = !isRandomized;
        setIsRandomized(newValue);
        if (newValue) {
            // 启用随机化时设置为最小值
            field.onChange(Number.MIN_VALUE);
        } else {
            // 禁用随机化时恢复保存的值或生成新的随机值
            if (storedValue === Number.MIN_VALUE) {
                field.onChange(getComfyUIRandomSeed());
            } else {
                field.onChange(storedValue);
            }
        }
    };

    return (
        <FormItem key={input.id}>
            <FormLabel className={FORM_STYLE.label}>
                {input.title}
                {/* 编辑模式下显示删除按钮 */}
                {editMode && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={remove ? () => remove(index) : undefined}
                    >
                        <Trash2 className="size-5" />
                    </Button>
                )}
            </FormLabel>
            <FormControl>
                <div className="flex items-center space-x-2">
                    {/* 种子值输入框 */}
                    <Input
                        placeholder={input.placeholder}
                        {...field}
                        type="number"
                        disabled={isRandomized} // Disable input if checkbox is checked
                        value={isRandomized ? "" : field.value} // Display "randomize" if checkbox is checked
                        onChange={(e) => {
                            const value = e.target.value;
                            if (!isRandomized) {
                                field.onChange(value);
                            }
                        }}
                        className="flex-1"
                    />
                    {/* 随机化开关 */}
                    <Checkbox
                        checked={isRandomized}
                        onCheckedChange={toggleRandomize}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <FormLabel className={CHECKBOX_STYLE.checkBoxLabel}>
                            Randomize
                        </FormLabel>
                    </div>
                </div>
            </FormControl>
            {/* 帮助文本 */}
            {input.helpText !== "Helper Text" && (
                <FormDescription>
                    {input.helpText}
                </FormDescription>
            )}
        </FormItem>
    );
}

/**
 * 媒体文件(图片/视频)输入组件
 * 支持文件上传和预览功能
 */
function FormMediaInput(args: { input: IInputForm, field: any, editMode?: boolean, remove?: UseFieldArrayRemove, index: number }) {
    const { input, field, editMode, remove, index } = args;
    const [media, setMedia] = useState<{ src: string, name: string }>({
        src: "",
        name: ""
    });
    const [showMaskEditor, setShowMaskEditor] = useState(false);

    // 根据输入类型设置允许的文件扩展名
    let fileExtensions: string[] = []
    if (input.valueType === "image") {
        fileExtensions = ['png', 'jpg', 'jpeg']
    } else if (input.valueType === "video") {
        fileExtensions = ['mp4', 'avi', 'webm', 'mkv', 'gif']
    }

    // 当文件值改变时更新预览
    useEffect(() => {
        if (field.value && field.value instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const name = field.value.name
                    setMedia({
                        src: content,
                        name: name
                    });
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    setMedia({
                        src: "",
                        name: ""
                    });
                }
            };
            reader.readAsDataURL(field.value);
        }
    }, [field.value]);

    // 删除媒体文件
    const onDelete = () => {
        field.onChange(null);
        setMedia({
            src: "",
            name: ""
        });
    }

    return (
        <FormItem key={input.id}>
            <FormLabel className={FORM_STYLE.label}>{input.title}
                {editMode && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={remove ? () => remove(index) : undefined}
                    >
                        <Trash2 className="size-5" />
                    </Button>
                )}
            </FormLabel>
            <FormControl>
                {media.src ? (
                    <div key={input.id} className="flex flex-col items-center gap-2">
                        <div className="max-w-full h-48 flex items-center justify-center overflow-hidden border rounded-md">
                            {(input.valueType === "image") && (
                                <img
                                    src={media.src}
                                    alt={media.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            )}
                            {/* 视频预览 */}
                            {(input.valueType === "video") && (
                                <video
                                    className="max-w-full max-h-full object-contain"
                                    autoPlay
                                    loop
                                >
                                    <track default kind="captions" srcLang="en" src="" />
                                    <source src={media.src} />
                                </video>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                className="border-2 text-muted-foreground"
                                onClick={onDelete}
                            >
                                <Trash2 className="size-5 mr-2" /> 删除图片
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                className="border-2 text-muted-foreground"
                                onClick={() => setShowMaskEditor(true)}
                            >
                                <Eraser className="size-5 mr-2" /> 绘制蒙版
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Dropzone
                        key={input.id}
                        onChange={field.onChange}
                        fileExtensions={fileExtensions}
                        className="form-dropzone"
                        inputPlaceholder={field.value?.name}
                    />
                )}
            </FormControl>

            {/* 蒙版编辑器对话框 */}
            <Dialog open={showMaskEditor} onOpenChange={setShowMaskEditor}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>蒙版编辑器</DialogTitle>
                        <DialogDescription>
                            在图片上绘制需要重绘的区域
                        </DialogDescription>
                    </DialogHeader>
                    <MaskEditor 
                        imageUrl={media.src}
                        onSave={(blob) => {
                            console.log('蒙版已保存，等待上传功能实现');
                            setShowMaskEditor(false);
                        }}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowMaskEditor(false)}
                        >
                            取消
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </FormItem>
    )
}

/**
 * 文本区域输入组件
 * 用于长文本内容的输入
 */
function FormTextAreaInput(args: { input: IInputForm, field: any, editMode?: boolean, remove?: UseFieldArrayRemove, index: number }) {
    const { input, field, editMode, remove, index } = args;

    return (
        <FormItem key={input.id}>
            <FormLabel className={FORM_STYLE.label}>{input.title}
                {/* 编辑模式下显示删除按钮 */}
                {editMode && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={remove ? () => remove(index) : undefined}
                    >
                        <Trash2 className="size-5" />
                    </Button>
                )}
            </FormLabel>
            <FormControl>
                {/* 自适应高度的文本区域 */}
                <AutosizeTextarea
                    placeholder={input.placeholder}
                    className={TEXT_AREA_STYLE}
                    {...field}
                />
            </FormControl>
            {/* 帮助文本 */}
            {(input.helpText !== "Helper Text") && (
                <FormDescription>
                    {input.helpText}
                </FormDescription>
            )}
        </FormItem>
    )
}

/**
 * 复选框输入组件
 * 用于布尔值的输入
 */
function FormCheckboxInput(args: { input: IInputForm, field: any, editMode?: boolean, remove?: UseFieldArrayRemove, index: number }) {
    const { input, field, editMode, remove, index } = args;
    return (
        <FormItem className="flex flex-row items-center space-x-3 space-y-0" key={input.id}>
            <FormControl>
                {/* 复选框控件 */}
                <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                />
            </FormControl>
            <div className="grid gap-1.5 leading-none">
                {/* 复选框标签 */}
                <FormLabel className={CHECKBOX_STYLE.checkBoxLabel}>
                    {input.title}
                </FormLabel>
                {/* <FormDescription className="text-sm text-muted-foreground">
                    {input.helpText}
                </FormDescription> */}
            </div>
            {/* 编辑模式下显示删除按钮 */}
            {editMode && (
                <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground self-center"
                    onClick={remove ? () => remove(index) : undefined}
                >
                    <Trash2 className="size-5" />
                </Button>
            )}
        </FormItem>
    )
}

/**
 * 基础输入组件
 * 用于处理常规文本和数字输入
 */
function FormBasicInput(args: { input: IInputForm, field: any, editMode?: boolean, remove?: UseFieldArrayRemove, index: number }) {
    const { input, field, editMode, remove, index } = args;
    return (
        <FormItem key={input.id}>
            <FormLabel>{input.title}
                {/* 编辑模式下显示删除按钮 */}
                {editMode && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={remove ? () => remove(index) : undefined}
                    >
                        <Trash2 className="size-5" />
                    </Button>
                )}
            </FormLabel>
            <FormControl>
                <Input placeholder={input.placeholder} {...field} type={parseWorkflowApiTypeToInputHtmlType(input.valueType)} />
            </FormControl>
            {/* 帮助文本 */}
            {(input.helpText !== "Helper Text") && (
                <FormDescription>
                    {input.helpText}
                </FormDescription>
            )}
        </FormItem>
    )
}
