import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// 确保上传目录存在
const uploadDir = join(process.cwd(), 'public/images/prompts');
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

    // 生成文件名
    const filename = `${Date.now()}${file.name.substring(file.name.lastIndexOf('.'))}`;
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    
    // 保存文件
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);
    
    return NextResponse.json({ filename });
  } catch (error) {
    console.error('上传文件失败:', error);
    return NextResponse.json(
      { error: '上传文件失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { error: '没有提供文件名' },
        { status: 400 }
      );
    }

    // 确保文件名不包含路径分隔符，防止目录遍历攻击
    const sanitizedFilename = filename.replace(/^.*[\\\/]/, '');
    const filepath = join(uploadDir, sanitizedFilename);

    // 检查文件是否存在
    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 删除文件
    await unlink(filepath);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { error: '删除文件失败' },
      { status: 500 }
    );
  }
} 