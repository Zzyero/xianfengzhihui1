// 导入必要的服务和类型定义
import { ComfyUIService } from '@/app/services/comfyui-service';
import { type NextRequest, NextResponse } from 'next/server';
import { ErrorResponseFactory } from '@/app/models/errors';
import { IViewComfy } from '@/app/interfaces/comfy-input';

// 创建错误响应工厂实例
const errorResponseFactory = new ErrorResponseFactory();

export async function POST(request: NextRequest) {
    // 解析请求中的表单数据
    const formData = await request.formData();
    
    // 处理工作流数据
    let workflow = undefined;
    if (formData.get('workflow') && formData.get('workflow') !== 'undefined') {
        workflow = JSON.parse(formData.get('workflow') as string);
    }

    // 初始化并处理 viewComfy 配置
    let viewComfy: IViewComfy = {inputs: [], textOutputEnabled: false};
    if (formData.get('viewComfy') && formData.get('viewComfy') !== 'undefined') {
        viewComfy = JSON.parse(formData.get('viewComfy') as string);
    }

    // 处理表单中的文件输入
    for (const [key, value] of Array.from(formData.entries())) {
        if (key !== 'workflow') {
            if (value instanceof File) {
                viewComfy.inputs.push({ key, value });
            }
        }
    }

    // 验证 viewComfy 是否存在
    if (!viewComfy) {
        return new NextResponse("viewComfy is required", { status: 400 });
    }

    try {
        // 创建 ComfyUI 服务实例并运行工作流
        const comfyUIService = new ComfyUIService();
        const stream = await comfyUIService.runWorkflow({ workflow, viewComfy });

        // 返回生成的图片流
        return new NextResponse<ReadableStream<Uint8Array>>(stream, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename="generated_images.bin"'
            }
        });
    } catch (error: unknown) {
        // 处理错误并返回错误响应
        const responseError = errorResponseFactory.getErrorResponse(error);
        return NextResponse.json(responseError, {
            status: 500,
        });
    }
}
