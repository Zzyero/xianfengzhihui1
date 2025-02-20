import { IViewComfy } from "@/app/interfaces/comfy-input";
import type { ResponseError } from "@/app/models/errors";
import { useState, useCallback } from "react"

// 请求地址
const url = "/api/comfy"

// 请求参数接口
export interface IUsePostPlayground {
    viewComfy: IViewComfy,
    workflow?: object,
    onSuccess: (outputs: Blob[]) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => void,
}

// 自定义Hook: 用于处理图像生成工作流的提交
export const usePostPlayground = () => {
    // 加载状态
    const [loading, setLoading] = useState(false);

    // 提交处理函数
    const doPost = useCallback(async ({ viewComfy, workflow, onSuccess, onError }: IUsePostPlayground) => {
        setLoading(true);
        try {
            // 创建FormData对象用于提交数据
            const formData = new FormData();
            // 创建视图配置JSON对象
            const viewComfyJSON: IViewComfy = { 
                    inputs:[],
                    textOutputEnabled: viewComfy.textOutputEnabled ?? false
                };
            // 遍历视图配置的输入数据
            for (const { key, value } of viewComfy.inputs) {
                // 如果输入数据是文件类型，则添加到FormData对象中
                if (value instanceof File) {
                    formData.append(key, value);
                } else {
                    // 否则，将输入数据添加到视图配置JSON对象中
                    viewComfyJSON.inputs.push({ key, value });
                }
            }
            // 将工作流和视图配置添加到FormData对象中
            formData.append('workflow', JSON.stringify(workflow));
            formData.append('viewComfy', JSON.stringify(viewComfyJSON));
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
            });
            // 如果请求失败，则抛出错误
            if (!response.ok) {
                const responseError: ResponseError = await response.json();
                throw responseError;
            }
            // 如果响应体不存在，则抛出错误
            if (!response.body) {
                throw new Error("No response body");
            }
            // 创建响应体读取器
            const reader = response.body.getReader();
            // 创建缓冲区
            let buffer = new Uint8Array(0);
            // 创建输出数组
            const output: Blob[] = [];
            // 创建分隔符
            const separator = new TextEncoder().encode('--BLOB_SEPARATOR--');
            // 循环读取响应体
            while (true) {
                // 读取响应体
                const { done, value } = await reader.read();
                // 如果读取完成，则退出循环
                if (done) break;
                // 合并数据到缓冲区
                buffer = concatUint8Arrays(buffer, value);
                // 查找分隔符   
                let separatorIndex: number;
                // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
                while ((separatorIndex = findSubarray(buffer, separator)) !== -1) {
                    const outputPart = buffer.slice(0, separatorIndex);
                    buffer = buffer.slice(separatorIndex + separator.length);
                    // 查找MIME类型结束位置
                    const mimeEndIndex = findSubarray(outputPart, new TextEncoder().encode('\r\n\r\n'));
                    if (mimeEndIndex !== -1) {
                        const mimeType = new TextDecoder().decode(outputPart.slice(0, mimeEndIndex)).split(': ')[1];
                        const outputData = outputPart.slice(mimeEndIndex + 4);
                        const blob = new Blob([outputData], { type: mimeType });
                        output.push(blob);
                    }
                }
            }
            // 调用成功回调
            onSuccess(output);
        } catch (error) {
            onError(error);
        }
        setLoading(false);
    }, []);

    return { doPost, loading };
}

// 合并两个Uint8Array
function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
    const c = new Uint8Array(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    return c;
}

// 查找子数组
function findSubarray(arr: Uint8Array, separator: Uint8Array): number {
    outer: for (let i = 0; i <= arr.length - separator.length; i++) {
        for (let j = 0; j < separator.length; j++) {
            if (arr[i + j] !== separator[j]) {
                continue outer;
            }
        }
        return i;
    }
    return -1;
}
