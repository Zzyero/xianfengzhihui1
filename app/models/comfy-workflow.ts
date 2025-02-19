import path from "node:path";
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import type { IInput } from "@/app/interfaces/input";
import { SEED_LIKE_INPUT_VALUES } from "@/app/constants";
import { getComfyUIRandomSeed } from "@/lib/utils";

// 定义输入文件和工作流文件的存储目录
const COMFY_INPUTS_DIR = path.join(process.cwd(), "comfy", "inputs");
const COMFY_WORKFLOWS_DIR = path.join(process.cwd(), "comfy", "workflows");

export class ComfyWorkflow {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private workflow: { [key: string]: any };
    // 工作流文件名
    private workflowFileName: string;
    // 工作流文件完整路径
    private workflowFilePath: string;
    // 工作流唯一标识符
    private id: string;

    constructor(workflow: object) {
        this.workflow = workflow;
        // 生成唯一ID
        this.id = crypto.randomUUID();
        this.workflowFileName = `workflow_${this.id}.json`;
        this.workflowFilePath = path.join(COMFY_WORKFLOWS_DIR, this.workflowFileName);
    }

    // 设置 ViewComfy 输入参数
    public async setViewComfy(viewComfy: IInput[]) {
        // 遍历所有输入参数
        for (const input of viewComfy) {
            const path = input.key.split("-");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let obj: any = this.workflow;
            // 根据路径定位到需要设置的对象
            for (let i = 0; i < path.length - 1; i++) {
                if (i === path.length - 1) {
                    continue;
                }
                obj = obj[path[i]];
            }
            // 如果输入是文件类型，创建文件并保存路径
            if (input.value instanceof File) {
                const filePath = await this.createFileFromInput(input.value);
                obj[path[path.length - 1]] = filePath;
            } else {
                // 直接设置值
                obj[path[path.length - 1]] = input.value;
            }
        }

        // 处理工作流中的特殊节点
        for (const key in this.workflow) {
            const node = this.workflow[key];
            switch (node.class_type) {
                // 对于保存图片和视频合并节点，设置文件名前缀
                case "SaveImage":
                case "VHS_VideoCombine":
                    node.inputs.filename_prefix = this.getFileNamePrefix();
                    break;

                default:
                    // 处理种子相关的输入值
                    Object.keys(node.inputs).forEach((key) => {
                        if (
                            SEED_LIKE_INPUT_VALUES.includes(key)
                            && node.inputs[key] === Number.MIN_VALUE
                        ) {
                            const newSeed = this.getNewSeed();
                            node.inputs[key] = newSeed;
                        }
                    });
            }
        }
    }

    // 获取工作流配置
    public getWorkflow() {
        return this.workflow;
    }

    // 获取工作流文件路径
    public getWorkflowFilePath() {
        return this.workflowFilePath;
    }

    // 获取工作流文件名
    public getWorkflowFileName() {
        return this.workflowFileName;
    }

    // 获取文件名前缀（使用工作流ID）
    public getFileNamePrefix() {
        return `${this.id}_`;
    }

    // 获取新的随机种子
    public getNewSeed() {
        return getComfyUIRandomSeed();
    }

    // 从输入文件创建新文件
    private async createFileFromInput(file: File) {
        const fileName = `${this.getFileNamePrefix()}${file.name}`;
        const filePath = path.join(COMFY_INPUTS_DIR, fileName);
        const fileBuffer = await file.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(fileBuffer));
        return filePath;
    }
}
