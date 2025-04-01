import { NextRequest, NextResponse } from 'next/server';
import { readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 图片目录路径
const uploadDir = join(process.cwd(), 'public/images/prompts');

export async function POST(request: NextRequest) {
    try {
        const { usedImages } = await request.json();
        
        if (!Array.isArray(usedImages)) {
            return NextResponse.json(
                { error: '无效的图片列表' },
                { status: 400 }
            );
        }

        // 确保目录存在
        if (!existsSync(uploadDir)) {
            return NextResponse.json({ success: true });
        }

        // 读取目录中的所有文件
        const files = await readdir(uploadDir);
        const deletedFiles: string[] = [];
        const errors: string[] = [];

        // 删除未使用的图片
        for (const file of files) {
            if (!usedImages.includes(file)) {
                try {
                    await unlink(join(uploadDir, file));
                    deletedFiles.push(file);
                } catch (error) {
                    errors.push(`删除文件 ${file} 失败: ${error}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            deletedFiles,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('清理图片失败:', error);
        return NextResponse.json(
            { error: '清理图片失败' },
            { status: 500 }
        );
    }
} 