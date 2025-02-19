// pages/api/upload.ts
// 导入必要的依赖
import { type NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { UPLOAD_PREVIEW_IMAGES_PATH } from '@/app/constants'

// POST 处理文件上传
export async function POST(request: NextRequest) {
    try {
        // 解析请求中的表单数据
        const formData = await request.formData();
        const file = formData.get('file') as File;

        // 验证是否上传了文件
        if (!file) {
            return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
        }

        // 生成唯一的文件名
        const fileName = `${Date.now()}-${file.name}`
        const publicPath = path.join(process.cwd(), "public", UPLOAD_PREVIEW_IMAGES_PATH);

        // 创建 uploads 目录（如果它不存在）
        try {
            await fs.stat(publicPath)
        } catch (error: unknown) { 
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                await fs.mkdir(publicPath, { recursive: true })
            }
        }

        // 将文件复制到 public/uploads
        const rawData = await file.arrayBuffer();
        await fs.writeFile(path.join(publicPath, fileName), Buffer.from(rawData))

        // 返回公共 URL
        const fileUrl = `/${UPLOAD_PREVIEW_IMAGES_PATH}/${fileName}`;

        return NextResponse.json({ url: fileUrl }, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ message: 'Error uploading file' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const { url } = await request.json()

    if (!url) {
        return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // 构造完整的文件路径
    const filePath = path.join(process.cwd(), 'public', url);
    try {
        // 检查文件是否存在
        if ((await fs.stat(filePath)).isFile()) {
            // 删除文件
            await fs.unlink(filePath);
            return NextResponse.json({ message: 'Image deleted successfully' }, { status: 200 });
        } else {
            return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ error: 'Image deletion failed' }, { status: 500 });
    }
}