import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'public/images/prompts');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '没有找到文件' },
        { status: 400 }
      );
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const originalName = file.name;
    const extension = path.extname(originalName);
    const filename = `${timestamp}${extension}`;
    
    // 将文件保存到 public/images/prompts 目录
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    return NextResponse.json({ filename });
  } catch (error) {
    console.error('文件上传失败:', error);
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    );
  }
} 