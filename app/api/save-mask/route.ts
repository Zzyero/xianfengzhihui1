import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MASKS_DIR = path.join(process.cwd(), 'masks');

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

        // 将文件内容转换为 Buffer
        const arrayBuffer = await maskFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 写入文件
        await writeFile(filePath, buffer);

        return NextResponse.json({
            success: true,
            filePath: filePath
        });

    } catch (error) {
        console.error('Error saving mask:', error);
        return NextResponse.json(
            { error: 'Failed to save mask' },
            { status: 500 }
        );
    }
} 