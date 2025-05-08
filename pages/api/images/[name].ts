import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

// 支持的图片格式
const SUPPORTED_FORMATS = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp'
};

// 图片所在目录
const LOCAL_IMAGE_DIRECTORY = "D:\\gitvscode\\smart-painting-pioneer\\components\\pages\\GenerateHistory\\photos";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { name } = req.query;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: '无效的图片名称' });
  }

  // 防止目录遍历攻击，确保文件名是安全的
  const sanitizedName = path.basename(name);
  const filePath = path.join(LOCAL_IMAGE_DIRECTORY, sanitizedName);

  try {
    // 检查文件是否存在
    try {
      await fsPromises.access(filePath);
    } catch (error) {
      console.error(`文件不存在: ${filePath}`);
      return res.status(404).json({ error: '图片不存在' });
    }

    if (req.method === 'GET') {
      // 获取文件扩展名
      const ext = path.extname(sanitizedName).toLowerCase();
      
      // 检查是否为支持的图片格式
      if (!(ext in SUPPORTED_FORMATS)) {
        return res.status(400).json({ error: '不支持的图片格式' });
      }
      
      // 读取文件
      const fileBuffer = await fsPromises.readFile(filePath);
      
      // 设置正确的 Content-Type
      const contentType = SUPPORTED_FORMATS[ext as keyof typeof SUPPORTED_FORMATS];
      
      // 设置缓存控制头，10分钟缓存
      res.setHeader('Cache-Control', 'public, max-age=600'); 
      res.setHeader('Content-Type', contentType);
      
      return res.send(fileBuffer);
    } else {
      return res.status(405).json({ error: '方法不允许' });
    }
  } catch (error) {
    console.error('提供图片时出错:', error);
    return res.status(500).json({ error: '无法提供图片' });
  }
} 