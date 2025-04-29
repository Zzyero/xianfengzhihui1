// 导入必要的模块和类
import path from "node:path";
import type { IComfyInput } from "@/app/interfaces/comfy-input";
import { ComfyWorkflow } from "@/app/models/comfy-workflow";
import fs from "node:fs/promises";
import { ComfyErrorHandler } from "@/app/helpers/comfy-error-handler";
import { ComfyError, ComfyWorkflowError } from "@/app/models/errors";
import { ComfyUIAPIService } from "@/app/services/comfyui-api-service";
import mime from 'mime-types';
import { missingViewComfyFileError, viewComfyFileName } from "@/app/constants";

// ComfyUI 服务类：处理工作流执行和文件处理的核心服务
export class ComfyUIService {
    private comfyErrorHandler: ComfyErrorHandler;
    public comfyUIAPIService: ComfyUIAPIService;
    private clientId: string;

    constructor() {
        // 初始化服务实例
        this.clientId = crypto.randomUUID();
        this.comfyErrorHandler = new ComfyErrorHandler();
        this.comfyUIAPIService = new ComfyUIAPIService(this.clientId);
    }

    // 执行工作流
    async runWorkflow(args: IComfyInput) {
        let workflow = args.workflow;
        const textOutputEnabled = args.viewComfy.textOutputEnabled ?? false;

        // 如果工作流未提供，则从本地获取
        if (!workflow) {
            workflow = await this.getLocalWorkflow();
        }

        // 创建ComfyWorkflow实例
        const comfyWorkflow = new ComfyWorkflow(workflow);
        // 设置视图配置
        await comfyWorkflow.setViewComfy(args.viewComfy.inputs);

        try {
            // 提交提示
            const promptData = await this.comfyUIAPIService.queuePrompt(workflow);
            // 获取输出文件
            const outputFiles = promptData.outputFiles;
            // 获取API服务实例
            const comfyUIAPIService = this.comfyUIAPIService;

            // 如果输出文件为空，则抛出错误
            if (outputFiles.length === 0) {
                throw new ComfyWorkflowError({
                    message: "No output files found",
                    errors: ["No output files found"],
                });
            }

            // 创建可读流
            const stream = new ReadableStream<Uint8Array>({
                async start(controller) {
                    for (const file of outputFiles) {
                        try {
                            let outputBuffer: Blob;
                            let mimeType: string;
                            // 处理文本输出
                            if (typeof file === 'string' && textOutputEnabled) {
                                    outputBuffer = new Blob([file], {
                                        type: 'text/plain'
                                    });
                                    mimeType = 'text/plain'
                                }
                            // 处理文件输出
                            else {
                                outputBuffer = await comfyUIAPIService.getOutputFiles({ file });
                                mimeType =
                                    mime.lookup(file?.filename) || "application/octet-stream";
                            }
                            const mimeInfo = `Content-Type: ${mimeType}\r\n\r\n`;
                            controller.enqueue(new TextEncoder().encode(mimeInfo));
                            controller.enqueue(
                                new Uint8Array(await outputBuffer.arrayBuffer()),
                            );
                            controller.enqueue(
                                new TextEncoder().encode("\r\n--BLOB_SEPARATOR--\r\n"),
                            );
                        } catch (error) {
                            console.error("Failed to get output file");
                            console.error(error);
                        }
                    }
                    controller.close();
                },
            });
            return stream;

            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        } catch (error: unknown) {
            // 处理错误
            console.error("Failed to run the workflow");
            console.error({ error });

            // 如果错误是ComfyWorkflowError实例，则抛出错误
            if (error instanceof ComfyWorkflowError) {
                throw error;
            }

            const comfyError =
                this.comfyErrorHandler.tryToParseWorkflowError(error);
            // 如果ComfyError实例，则抛出错误
            if (comfyError) {
                throw comfyError;
            }

            // 抛出通用错误
            throw new ComfyWorkflowError({
                message: "Error running workflow",
                errors: [
                    "在执行工作流时出错,可能是缺少节点和内存不足等原因。请确保可以在本地运行此工作流",
                ],
            });
        }
    }

    // 获取本地工作流
    private async getLocalWorkflow(): Promise<object> {
        const missingWorkflowError = new ComfyError({
            message: "Failed to launch ComfyUI",
            errors: [missingViewComfyFileError],
        });

        let workflow = undefined;

        try {
            // 获取工作流文件路径
            const filePath = path.join(process.cwd(), viewComfyFileName);
            // 读取工作流文件内容
            const fileContent = await fs.readFile(filePath, "utf8");
            // 解析工作流文件内容
            workflow = JSON.parse(fileContent);
        } catch (error) {
            // 如果读取文件失败，则抛出错误
            throw missingWorkflowError;
        }

        if (!workflow) {
            throw missingWorkflowError;
        }

        for (const w of workflow.workflows as { [key: string]: object }[]) {
            for (const key in w) {
                if (key === "workflowApiJSON") {
                    return w[key];
                }
            }
        }

        throw new ComfyWorkflowError({
            message: "Failed to find workflowApiJSON",
            errors: ["Failed to find workflowApiJSON"],
        });
    }

}