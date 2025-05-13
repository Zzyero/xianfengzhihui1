import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// 支持的图片格式
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

// 使用相对路径
const LOCAL_IMAGE_DIRECTORY = path.join(process.cwd(), "components", "pages", "GenerateHistory", "photos");

// 图片列表JSON文件路径 - 使用相对路径
const IMAGE_LIST_JSON = path.join(process.cwd(), "components", "pages", "GenerateHistory", "image-list.json");

// 全局文件列表缓存及最后更新时间
const fileCache = {
  images: [] as any[],
  lastUpdate: 0,
  isWatching: false
};

// 确保data目录存在 - 这里不需要创建目录，因为使用的是已存在的项目目录
async function ensureDataDirectory() {
  const dataDir = path.dirname(IMAGE_LIST_JSON);
  try {
    await fsPromises.access(dataDir);
    console.log(`项目数据目录已存在: ${dataDir}`);
  } catch (error) {
    console.error(`访问项目数据目录失败: ${dataDir}`, error);
    // 不尝试创建目录，因为它应该已经存在
  }
}

// 从JSON文件读取图片列表
async function readImageListFromJson() {
  try {
    await ensureDataDirectory();
    
    try {
      // 检查JSON文件是否存在
      await fsPromises.access(IMAGE_LIST_JSON);
      
      // 读取并解析JSON文件
      const data = await fsPromises.readFile(IMAGE_LIST_JSON, 'utf8');
      const parsed = JSON.parse(data);
      
      // 确保解析后的数据具有正确的结构
      if (parsed && typeof parsed.lastUpdate === 'number' && Array.isArray(parsed.images)) {
        console.log(`从JSON文件加载了 ${parsed.images.length} 个图片记录`);
        return parsed;
      }
    } catch (error) {
      // 如果文件不存在或解析失败，返回空数据
      console.log('JSON文件不存在或格式不正确，将创建新文件');
    }
  } catch (error) {
    console.error('读取JSON文件失败:', error);
  }
  
  // 默认返回空数据
  return { images: [], lastUpdate: 0 };
}

// 将图片列表写入JSON文件
async function writeImageListToJson() {
  try {
    await ensureDataDirectory();
    
    // 准备要写入的JSON数据
    const jsonData = JSON.stringify({
      images: fileCache.images,
      lastUpdate: fileCache.lastUpdate
    }, null, 2); // 使用格式化的JSON，便于人工查看
    
    // 将数据只写入项目目录中的JSON文件
    await fsPromises.writeFile(
      IMAGE_LIST_JSON,
      jsonData,
      'utf8'
    );
    
    console.log(`已将 ${fileCache.images.length} 个图片记录保存到JSON文件`);
  } catch (error) {
    console.error('写入JSON文件失败:', error);
  }
}

// 设置文件监视
async function setupFileWatcher() {
  if (fileCache.isWatching) return;

  try {
    // 确保目录存在
    if (!fs.existsSync(LOCAL_IMAGE_DIRECTORY)) {
      fs.mkdirSync(LOCAL_IMAGE_DIRECTORY, { recursive: true });
      console.log(`已创建图片目录: ${LOCAL_IMAGE_DIRECTORY}`);
    }
    
    // 从JSON文件中加载初始数据
    const savedData = await readImageListFromJson();
    fileCache.images = savedData.images;
    fileCache.lastUpdate = savedData.lastUpdate;

    // 设置文件夹监视
    const watcher = fs.watch(LOCAL_IMAGE_DIRECTORY, { persistent: true }, async (eventType, filename) => {
      console.log(`检测到文件变化: ${eventType} - ${filename}`);
      
      // 刷新文件缓存并保存到JSON
      await refreshFileCache(true);
    });

    // 设置错误处理
    watcher.on('error', (error) => {
      console.error('文件监视错误:', error);
      fileCache.isWatching = false;
    });

    fileCache.isWatching = true;
    console.log(`开始监视文件夹: ${LOCAL_IMAGE_DIRECTORY}`);

    // 初始化缓存
    await refreshFileCache(true);
  } catch (error) {
    console.error('设置文件监视失败:', error);
  }
}

// 刷新文件缓存
async function refreshFileCache(saveToJson = false) {
  try {
    const files = await fsPromises.readdir(LOCAL_IMAGE_DIRECTORY);
    
    // 图片文件列表
    const imagePromises = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_FORMATS.includes(ext);
      })
      .map(async (file) => {
        const filePath = path.join(LOCAL_IMAGE_DIRECTORY, file);
        try {
          const stats = await fsPromises.stat(filePath);
          // 使用相对路径格式
          return {
            src: `/api/images/${encodeURIComponent(file)}`,
            name: file,
            timestamp: stats.mtimeMs
          };
        } catch (error) {
          console.error(`获取文件信息失败: ${file}`, error);
          return null;
        }
      });

    const images = (await Promise.all(imagePromises)).filter(Boolean);
    
    // 更新缓存
    fileCache.images = images;
    fileCache.lastUpdate = Date.now();
    
    console.log(`文件缓存已更新，共 ${images.length} 个图片`);
    
    // 如果需要，保存到JSON文件
    if (saveToJson) {
      await writeImageListToJson();
    }
  } catch (error) {
    console.error('刷新文件缓存失败:', error);
  }
}

// 初始化文件监视
setupFileWatcher();

// 导出API处理函数
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 获取请求方法和查询参数
  const { method, query } = req;

  try {
    switch (method) {
      case 'GET':
        console.log('处理图片列表请求');

        // 检查是否启动了文件监视
        if (!fileCache.isWatching) {
          await setupFileWatcher();
        }
        
        // 如果缓存过期或强制刷新，则更新缓存
        const forceRefresh = query.refresh === 'true';
        const cacheAge = Date.now() - fileCache.lastUpdate;
        
        if (forceRefresh || cacheAge > 5000 || fileCache.images.length === 0) {
          await refreshFileCache();
        }

        return res.status(200).json({
          images: fileCache.images,
          lastUpdate: fileCache.lastUpdate
        });

      case 'DELETE':
        const filename = query.filename as string;
        if (!filename) {
          return res.status(400).json({ error: '文件名不能为空' });
        }

        const filePath = path.join(LOCAL_IMAGE_DIRECTORY, filename);
        
        // 检查文件是否存在
        try {
          await fsPromises.access(filePath);
        } catch (error) {
          return res.status(404).json({ error: '文件不存在' });
        }

        // 删除文件
        await fsPromises.unlink(filePath);
        console.log(`已删除文件: ${filePath}`);
        
        // 更新缓存并保存到JSON
        await refreshFileCache(true);
        
        return res.status(200).json({ 
          success: true, 
          message: '文件已成功删除',
          images: fileCache.images,
          lastUpdate: fileCache.lastUpdate
        });

      case 'PATCH':
        // 处理图片重命名请求
        console.log('处理图片重命名请求');

        // 从请求体获取旧文件名和新文件名
        const { oldName, newName } = req.body;

        if (!oldName || !newName) {
          return res.status(400).json({ error: '旧文件名和新文件名不能为空' });
        }

        // 防止目录遍历攻击，确保文件名是安全的
        const sanitizedOldName = path.basename(oldName);
        const sanitizedNewName = path.basename(newName);

        // 确保扩展名没有变化
        const oldExt = path.extname(sanitizedOldName);
        const newExt = path.extname(sanitizedNewName);

        if (oldExt !== newExt) {
          return res.status(400).json({ error: '不能修改文件扩展名' });
        }

        const oldPath = path.join(LOCAL_IMAGE_DIRECTORY, sanitizedOldName);
        const newPath = path.join(LOCAL_IMAGE_DIRECTORY, sanitizedNewName);

        // 检查源文件是否存在
        try {
          await fsPromises.access(oldPath);
        } catch (error) {
          return res.status(404).json({ error: '源文件不存在' });
        }

        // 检查目标文件是否已存在
        try {
          await fsPromises.access(newPath);
          return res.status(409).json({ error: '目标文件名已存在' });
        } catch (error) {
          // 文件不存在，可以安全地重命名
        }

        // 执行重命名
        try {
          await fsPromises.rename(oldPath, newPath);
          console.log(`已重命名文件: ${oldPath} -> ${newPath}`);
        } catch (error) {
          console.error('重命名文件失败:', error);
          return res.status(500).json({ error: '重命名文件失败' });
        }

        // 更新缓存并保存到JSON
        await refreshFileCache(true);

        return res.status(200).json({ 
          success: true, 
          message: '文件已成功重命名',
          images: fileCache.images,
          lastUpdate: fileCache.lastUpdate
        });

      default:
        res.setHeader('Allow', ['GET', 'DELETE', 'PATCH']);
        return res.status(405).json({ error: `不支持 ${req.method} 方法` });
    }
  } catch (error) {
    console.error('API错误:', error);
    return res.status(500).json({ error: `服务器内部错误: ${error instanceof Error ? error.message : String(error)}` });
  }
}