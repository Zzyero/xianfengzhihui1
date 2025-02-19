import { type NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import { missingViewComfyFileError, viewComfyFileName } from '@/app/constants';
import { ErrorBase, ErrorResponseFactory, ErrorTypes } from '@/app/models/errors';

// 创建错误响应工厂实例
const errorResponseFactory = new ErrorResponseFactory();

// 处理 GET 请求
// eslint-disable-next-line @typescript-eslint/no-unused-vars   
export async function GET(request: NextRequest) {
    // 获取 ViewComfy 配置文件的完整路径
    const viewComfyPath = path.join(process.cwd(), viewComfyFileName);
    try {
        // 读取 ViewComfy 配置文件的内容
        const fileContent = await fs.readFile(viewComfyPath, 'utf8');
        // 将文件内容解析为 JSON 并返回
        return NextResponse.json({ viewComfyJSON: JSON.parse(fileContent) });
    } catch (error) {
        // 处理错误 
        console.error("文件未找到");
        console.error(error);

        // 检查缺失的文件
        const missingFiles: string[] = [];
        if (!await fileExists(viewComfyPath)) {
            missingFiles.push(missingViewComfyFileError);
        }

        // 创建错误实例
        const err = new ErrorBase({
            message: "ViewMode 缺少文件",
            errorType: ErrorTypes.VIEW_MODE_MISSING_FILES,
            errors: missingFiles
        });

        // 获取错误响应
        const responseError = errorResponseFactory.getErrorResponse(err);
        return NextResponse.json(responseError, {
            status: 500,
        });
    }
}

// 辅助函数，检查文件是否存在
async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}
