import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// 使用相对路径，保存到项目根目录下的 public/masks 目录
const MASKS_DIR = path.join(process.cwd(), 'public', 'masks');

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const maskFile = formData.get('mask') as File;
        
        if (!maskFile) {
            return NextResponse.json(
                { error: 'No mask file provided' },
                { status: 400 }
            );
        }

        // 确保目录存在
        await mkdir(MASKS_DIR, { recursive: true });

        // 生成文件名
        const fileName = `mask_${Date.now()}.png`;
        const filePath = path.join(MASKS_DIR, fileName);

        // 将文件内容转换为 Buffer 并写入文件
        const arrayBuffer = await maskFile.arrayBuffer();
        await writeFile(filePath, new Uint8Array(arrayBuffer));

        // 返回相对路径的URL
        const relativePath = `/masks/${fileName}`;
        return NextResponse.json({
            success: true,
            filePath: relativePath
        });

    } catch (error) {
        console.error('Error saving mask:', error);
        return NextResponse.json(
            { error: 'Failed to save mask' },
            { status: 500 }
        );
    }
} 