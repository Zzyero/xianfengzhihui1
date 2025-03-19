import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PromptItem } from '@/components/prompt-library/types';

// 提示词库 JSON 文件路径
const promptLibraryPath = path.join(process.cwd(), 'data', 'prompt-library.json');

// 读取提示词库数据
function readPromptLibrary() {
  try {
    const data = fs.readFileSync(promptLibraryPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取提示词库文件失败:', error);
    return { prompts: [] };
  }
}

// 写入提示词库数据
function writePromptLibrary(data: { prompts: PromptItem[] }) {
  try {
    fs.writeFileSync(promptLibraryPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('写入提示词库文件失败:', error);
    return false;
  }
}

// GET 请求处理 - 获取提示词库数据
export async function GET() {
  const data = readPromptLibrary();
  return NextResponse.json(data);
}

// POST 请求处理 - 保存提示词库数据
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 验证数据格式
    if (!data.prompts || !Array.isArray(data.prompts)) {
      return NextResponse.json(
        { error: '无效的提示词库数据格式' },
        { status: 400 }
      );
    }
    
    // 写入数据
    const success = writePromptLibrary(data);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: '保存提示词库数据失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('处理提示词库保存请求失败:', error);
    return NextResponse.json(
      { error: '处理请求失败' },
      { status: 500 }
    );
  }
} 