import { ComfyWorkflowError } from '@/app/models/errors';
import { ComfyUIConnRefusedError } from '@/app/constants';

// ComfyUI WebSocket 事件类型定义
type ComfyUIWSEventType = "status" | "executing" | "execution_cached" | "progress" | "executed" | "execution_error" | "execution_success";

// ComfyUI WebSocket 事件数据接口定义
interface IComfyUIWSEventData {
    type: ComfyUIWSEventType;
    data: { [key: string]: unknown };
}

// ComfyUI 节点错误接口定义
export interface IComfyUINodeError {
    type: string;
    message: string;
}

// ComfyUI 错误接口定义
export interface IComfyUIError {
    message: string;
    node_errors: { [key: number]: IComfyUINodeError[] }
}

// ComfyUI 图片输出文件类定义       
export class ComfyImageOutputFile {
    public fileName: string;
    public subFolder: string;
    public outputType: string;

    constructor({ fileName, subFolder, outputType }: { fileName: string, subFolder: string, outputType: string }) {
        this.fileName = fileName;
        this.subFolder = subFolder;
        this.outputType = outputType;
    }
}

// 添加队列相关接口
export interface IComfyQueue {
    queue_running: string[];
    queue_pending: string[];
}

// ComfyUI API 服务类
export class ComfyUIAPIService {
    private baseUrl: string;             // ComfyUI API 基础 URL                                    
    private ws: WebSocket;               // WebSocket 连接对象
    private clientId: string;            // 客户端 ID
    private promptId: string | undefined = undefined; // 提示 ID
    private isPromptRunning: boolean;   // 提示是否正在运行
    private workflowStatus: ComfyUIWSEventType | undefined; // 工作流状态
    private secure: boolean;             // 是否启用安全连接
    private httpBaseUrl: string;          // HTTP 基础 URL
    private wsBaseUrl: string;           // WebSocket 基础 URL
    private outputFiles: Array<{ [key: string]: string }>; // 输出文件列表

    // 构造函数
    constructor(clientId: string) {
        // 初始化安全连接设置
        this.secure = process.env.COMFYUI_SECURE === "true";
        // 初始化基础 URL
        this.httpBaseUrl = this.secure ? "https://" : "http://";
        this.wsBaseUrl = this.secure ? "wss://" : "ws://";
        this.baseUrl = process.env.COMFYUI_API_URL || "127.0.0.1:8188";
        this.clientId = clientId;

        // 初始化 WebSocket 连接
        try {
            this.ws = new WebSocket(`${this.getUrl("ws")}/ws?clientId=${this.clientId}`);
            this.connect();
        } catch (error) {
            console.error(error);
            throw error;
        }
        this.isPromptRunning = false;
        this.workflowStatus = undefined;
        this.outputFiles = [];
    }
    // 获取完整URL
    private getUrl(protocol: "http" | "ws") {
        if (protocol === "http") {
            return `${this.httpBaseUrl}${this.baseUrl}`;
        }
        return `${this.wsBaseUrl}${this.baseUrl}`;
    }

    // 连接 WebSocket
    private async connect() {
        try {
            // 设置 WebSocket 连接打开事件处理
            this.ws.onopen = () => {
                console.log("WebSocket connection opened");
            };

            // WebSocket接收消息时的处理
            this.ws.onmessage = (event) => {
                // console.log("WebSocket message received:", event.data);
                this.comfyEventDataHandler(event.data);
            };
        } catch (error) {
            console.error(error);
            throw new Error("WebSocket connection error");
        }
    }
    // 处理ComfyUI事件数据
    private comfyEventDataHandler(eventData: string) {
        let event: IComfyUIWSEventData | undefined;
        try {
            event = JSON.parse(eventData) as IComfyUIWSEventData;
        } catch (error) {
            // console.log("Error parsing event data:", eventData);
            // console.error(error);
            return;
        }

        const data = event.data as object;
        // 跳过任何不是关于我们提示的消息
        if ("prompt_id" in data && data.prompt_id !== this.promptId) {
            return true;
        }

        switch (event.type) {
            case "status":
                // console.log("Status:", event.data);
                // 处理状态事件
                this.workflowStatus = event.type;
                break;
            case "executing":
                // console.log("Executing:", event.data);
                // 处理执行中事件
                this.workflowStatus = event.type;
                break;
            case "execution_cached":
                // console.log("Execution cached:", event.data);
                // 处理执行缓存事件
                this.workflowStatus = event.type;
                break;
            case "progress":
                // console.log("Progress:", event.data);
                // 处理进度事件
                this.workflowStatus = event.type;
                break;
            case "executed":
                // console.log("Executed:", event.data);
                // 处理执行完成事件
                this.parseOutputFiles(event.data);
                this.workflowStatus = event.type;
                break;
            case "execution_error":
                // console.log("Execution error:", event.data);
                // 处理执行错误事件
                this.isPromptRunning = false;
                this.workflowStatus = event.type;
                break;
            case "execution_success":
                // console.log("Execution success:", event.data);
                // 处理执行成功事件
                this.isPromptRunning = false;
                this.workflowStatus = event.type;
                break;
            default:
                // console.log("Unknown event type:", event.type);
                // 处理未知事件类型
                this.workflowStatus = event.type;
                break;
        }
    }

    // 提交提示
    public async queuePrompt(workflow: object) {
        // 准备请求数据
        const data = {
            "prompt": workflow,
            "client_id": this.clientId,
        }
        try {
            // 发送工作流执行请求
            const response = await fetch(`${this.getUrl("http")}/prompt`, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    "Content-Type": "application/json",
                },
            });
            // 检查响应状态
            if (!response.ok) {
                // 处理错误响应
                let resError: IComfyUIError | string;
                try {
                    const responseError = await response.json();
                    if (responseError.error?.message) {
                        resError = {
                            message: responseError.error.message,
                            node_errors: responseError.node_errors || [],
                        }
                    } else {
                        resError = responseError;
                    }
                } catch (error) {
                    resError = await response.text();
                }
                console.error(resError);
                throw resError;

            }

            if (!response.body) {
                throw new Error("No response body");
            }

            const responseData = await response.json();
            this.promptId = responseData.prompt_id;

            if (this.promptId === undefined) {
                throw new Error("Prompt ID is undefined");
            }

            this.isPromptRunning = true;

            while (this.isPromptRunning) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (this.workflowStatus === "execution_error") {
                throw new ComfyWorkflowError({
                    message: "ComfyUI workflow execution error",
                    errors: []
                });
            }
            return { outputFiles: this.outputFiles, promptId: this.promptId };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error);
            if (error?.cause?.code === "ECONNREFUSED") {
                throw new ComfyWorkflowError({
                    message: "Cannot connect to ComfyUI",
                    errors: [ComfyUIConnRefusedError(this.getUrl("http"))]
                });
            }
            throw error;
        }
    }
    // 获取输出文件
    public async getOutputFiles({ file }: { file: { [key: string]: string } }) {
        // 准备请求数据
        const data = new URLSearchParams({ ...file }).toString();

        try {
            // 发送获取输出文件请求
            const response = await fetch(`${this.getUrl("http")}/view?${encodeURI(data)}`);
            // 检查响应状态
            if (!response.ok) {
                // 处理404错误
                if (response.status === 404) {
                    const fileName = file.filename || "";
                    throw new ComfyWorkflowError({
                        message: "File not found",
                        errors: [`The file ${fileName} was not found in the ComfyUI output directory`]
                    });
                }
                // 处理其他错误
                const responseError = await response.json();
                throw responseError;
            }

            return await response.blob();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error);
            if (error?.cause?.code === "ECONNREFUSED") {
                throw new ComfyWorkflowError({
                    message: "Cannot connect to ComfyUI",
                    errors: [ComfyUIConnRefusedError(this.getUrl("http"))]
                });
            }
            throw error;
        }
    }

    private parseOutputFiles(data: { [key: string]: unknown }) {
        if (!data.output) {
            return
        }

        const output = data.output as { [key: string]: unknown } | undefined;
        for (const key in output) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const dict of output[key] as any[]) {
                if (dict.type !== "temp") {
                    this.outputFiles.push(dict)
                }
            }
        }
    }

    // 获取队列状态
    public async getQueue(): Promise<IComfyQueue> {
        try {
            const response = await fetch(`${this.getUrl("http")}/queue`);
            if (!response.ok) {
                throw new Error("获取队列状态失败");
            }
            return await response.json();
        } catch (error: any) {
            console.error(error);
            if (error?.cause?.code === "ECONNREFUSED") {
                throw new ComfyWorkflowError({
                    message: "无法连接到 ComfyUI",
                    errors: [ComfyUIConnRefusedError(this.getUrl("http"))]
                });
            }
            throw error;
        }
    }

    // 清除所有队列
    public async clearQueue(): Promise<void> {
        try {
            const response = await fetch(`${this.getUrl("http")}/queue`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ clear: true })
            });
            if (!response.ok) {
                throw new Error("清除队列失败");
            }
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }

    // 中断当前任务
    public async interruptQueue(): Promise<void> {
        try {
            const response = await fetch(`${this.getUrl("http")}/interrupt`, {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error("中断任务失败");
            }
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    }
}
