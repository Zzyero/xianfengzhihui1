import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { getImageDirectory, getImageListJsonPath } from '../../components/pages/GenerateHistory/paths';

// 支持的图片格式
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

// 使用配置中的图片目录路径
const LOCAL_IMAGE_DIRECTORY = getImageDirectory();

// 图片列表JSON文件路径 - 使用配置
const IMAGE_LIST_JSON = getImageListJsonPath();

// 全局文件列表缓存及最后更新时间
const fileCache = {
  images: [] as any[],
  lastUpdate: 0,
  isWatching: false
};

// 添加节流控制变量
let isRefreshing = false;
let refreshTimeout: NodeJS.Timeout | null = null;
const THROTTLE_DELAY = 2000; // 设置2秒的节流延迟

// 全局初始化状态标志
let isInitialized = false;

// 确保data目录存在 - 这里不需要创建目录，因为使用的是已存在的项目目录
async function ensureDataDirectory() {
  const dataDir = path.dirname(IMAGE_LIST_JSON);
  try {
    await fsPromises.access(dataDir);
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
    
    // 先读取现有的JSON文件
    let currentData = { images: [], lastUpdate: 0 };
    try {
      const data = await fsPromises.readFile(IMAGE_LIST_JSON, 'utf8');
      currentData = JSON.parse(data);
    } catch (error) {
      console.log('JSON文件不存在或格式不正确，将创建新文件');
    }
    
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
  } catch (error) {
    console.error('写入JSON文件失败:', error);
  }
}

// 刷新文件缓存
async function refreshFileCache(saveToJson = false) {
  // 如果已经在刷新，则跳过
  if (isRefreshing) {
    console.log('已有刷新操作正在进行中，跳过本次刷新');
    return;
  }

  try {
    // 先从JSON文件读取当前的图片列表
    let currentImages: Array<{name: string, src: string, timestamp: number}> = [];
    let currentImageMap = new Map<string, {name: string, src: string, timestamp: number}>();
    
    try {
      const data = await readImageListFromJson();
      currentImages = data.images || [];
      // 创建一个以文件名为键的映射表，方便查找
      currentImageMap = new Map(currentImages.map(img => [img.name, img]));
    } catch (error) {
      console.error('读取现有图片列表失败:', error);
    }
    
    isRefreshing = true;
    const files = await fsPromises.readdir(LOCAL_IMAGE_DIRECTORY);
    
    // 当前文件系统中的文件集合
    const fileSet = new Set(files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_FORMATS.includes(ext);
    }));
    
    // 找出已不存在但仍在JSON中的文件（需要删除）
    const existingFileNames = new Set(currentImages.map(img => img.name));
    const filesToRemove: string[] = [];
    
    // 使用forEach避免Set的迭代器问题
    existingFileNames.forEach(fileName => {
      if (!fileSet.has(fileName)) {
        filesToRemove.push(fileName);
      }
    });
    
    // 从当前图片列表中移除已删除的文件
    if (filesToRemove.length > 0) {
      console.log(`从图片列表中移除 ${filesToRemove.length} 个已删除的文件`);
      for (const name of filesToRemove) {
        currentImageMap.delete(name);
      }
    }
    
    // 处理新增或更新的文件
    const updatedPromises: Promise<{src: string, name: string, timestamp: number}>[] = [];
    
    // 使用Array.from将Set转换为数组
    for (const file of Array.from(fileSet)) {
      const filePath = path.join(LOCAL_IMAGE_DIRECTORY, file);
      
      try {
        const stats = await fsPromises.stat(filePath);
        const fileModTime = stats.mtimeMs;
        
        // 检查文件是否已经在列表中，且修改时间是否有变化
        const existingImage = currentImageMap.get(file);
        
        if (!existingImage || fileModTime !== existingImage.timestamp) {
          // 如果是新文件或文件已更新，则添加/更新记录
          updatedPromises.push(Promise.resolve({
            src: `/api/images/${encodeURIComponent(file)}`,
            name: file,
            timestamp: fileModTime
          }));
          console.log(`${existingImage ? '更新' : '新增'}图片记录: ${file}`);
        } else {
          // 如果文件没有变化，保留现有记录
          updatedPromises.push(Promise.resolve(existingImage));
        }
      } catch (error) {
        console.error(`获取文件信息失败: ${file}`, error);
      }
    }
    
    const updatedImages = await Promise.all(updatedPromises);
    
    // 更新缓存
    fileCache.images = updatedImages;
    fileCache.lastUpdate = Date.now();
    
    // 减少日志输出频率，仅在首次或图片数量变化时输出
    const logMessage = `文件缓存已更新，共 ${updatedImages.length} 个图片`;
    if (!saveToJson) {
      console.log(logMessage);
    }
    
    // 如果需要，保存到JSON文件
    if (saveToJson) {
      await writeImageListToJson();
    }
  } catch (error) {
    console.error('刷新文件缓存失败:', error);
  } finally {
    isRefreshing = false;
  }
}

// 节流处理的刷新函数
function throttledRefreshCache(saveToJson = false) {
  // 如果已有定时器在运行，清除它
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  
  // 设置新的定时器
  refreshTimeout = setTimeout(async () => {
    await refreshFileCache(saveToJson);
    refreshTimeout = null;
  }, THROTTLE_DELAY);
}

// 设置文件监视
async function setupFileWatcher() {
  // 确保只初始化一次
  if (fileCache.isWatching || isInitialized) {
    console.log('文件监视已初始化，跳过重复初始化');
    return;
  }
  
  // 标记为已初始化
  isInitialized = true;

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
      
      // 使用节流函数刷新文件缓存并保存到JSON
      throttledRefreshCache(true);
    });

    // 设置错误处理
    watcher.on('error', (error) => {
      console.error('文件监视错误:', error);
      fileCache.isWatching = false;
      // 错误发生时不重置isInitialized，防止重复初始化失败
    });

    fileCache.isWatching = true;
    console.log(`开始监视文件夹: ${LOCAL_IMAGE_DIRECTORY}`);

    // 初始化缓存
    await refreshFileCache(true);
  } catch (error) {
    console.error('设置文件监视失败:', error);
    // 初始化失败时重置标志，允许下次尝试
    isInitialized = false;
  }
}

// 导出API处理函数
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 获取请求方法和查询参数
  const { method, query } = req;

  try {
    // 确保文件监视已初始化
    if (!isInitialized) {
      console.log('首次API请求，初始化文件监视');
      await setupFileWatcher();
    }
    
    switch (method) {
      case 'GET':
        console.log('处理图片列表请求');
        
        // 如果缓存过期或强制刷新，则更新缓存
        const forceRefresh = query.refresh === 'true';
        const cacheAge = Date.now() - fileCache.lastUpdate;
        
        if (forceRefresh || cacheAge > 5000 || fileCache.images.length === 0) {
          // 使用节流函数代替直接调用
          if (forceRefresh) {
            // 强制刷新时直接调用，不使用节流
            await refreshFileCache();
          } else if (!refreshTimeout) {
            // 没有正在进行的刷新时才触发
            throttledRefreshCache(false);
          }
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
        
        // 更新缓存并保存到JSON - 删除操作需要立即生效
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

        // 更新缓存并保存到JSON - 重命名操作需要立即生效
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