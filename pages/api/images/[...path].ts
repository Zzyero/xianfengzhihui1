import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { getImageDirectory } from '../../../components/pages/GenerateHistory/paths';

// 使用统一的配置
const LOCAL_IMAGE_DIRECTORY = getImageDirectory();
const IMAGE_LIST_JSON = path.join(process.cwd(), "public", "uploads", "image-list.json");

// 支持的图片类型与对应的Content-Type
const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp'
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  try {
    // 获取请求的路径参数
    const { path: pathSegments } = req.query;

    // 确保path是数组并且有内容
    if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
      return res.status(400).json({ error: '无效的路径' });
    }

    // 将路径片段组合成文件名
    const filename = pathSegments.join('/');
    
    // 防止任何形式的目录遍历
    const sanitizedFilename = path.basename(filename);
    
    // 构建完整的文件路径
    const filePath = path.join(LOCAL_IMAGE_DIRECTORY, sanitizedFilename);
    
    // 检查文件是否存在
    try {
      await fsPromises.access(filePath);
    } catch (error) {
      console.error(`文件不存在: ${filePath}`);
      return res.status(404).json({ error: '文件不存在' });
    }
    
    // 获取文件扩展名并确定内容类型
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    
    // 读取文件内容
    const fileBuffer = await fsPromises.readFile(filePath);
    
    // 设置缓存控制头（让浏览器缓存图片一段时间）
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    
    // 设置内容类型并发送文件数据
    res.setHeader('Content-Type', contentType);
    res.status(200).send(fileBuffer);
  } catch (error) {
    console.error('处理图片请求错误:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
} 