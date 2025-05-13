import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fsPromises } from 'fs';
import path from 'path';

// 使用相对路径
const IMAGE_LIST_JSON = path.join(process.cwd(), "components", "pages", "GenerateHistory", "image-list.json");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 允许缓存控制
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '仅支持GET方法' });
  }

  try {
    // 检查文件是否存在
    try {
      await fsPromises.access(IMAGE_LIST_JSON);
    } catch (error) {
      console.error('JSON文件不存在:', IMAGE_LIST_JSON);
      // 文件不存在，返回空数据
      return res.status(200).json({
        images: [],
        lastUpdate: Date.now()
      });
    }

    // 读取JSON文件
    const data = await fsPromises.readFile(IMAGE_LIST_JSON, 'utf8');
    
    try {
      // 解析JSON数据
      const parsed = JSON.parse(data);
      
      // 确保数据格式正确
      if (parsed && typeof parsed.lastUpdate === 'number' && Array.isArray(parsed.images)) {
        console.log(`成功读取JSON文件，获取了 ${parsed.images.length} 张图片`);
        return res.status(200).json(parsed);
      } else {
        console.error('JSON数据格式不正确:', parsed);
        // 格式不正确，返回空数据
        return res.status(200).json({
          images: [],
          lastUpdate: Date.now()
        });
      }
    } catch (parseError) {
      console.error('JSON解析错误:', parseError);
      return res.status(200).json({
        images: [],
        lastUpdate: Date.now()
      });
    }
  } catch (error) {
    console.error('读取JSON文件失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
} 