"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, ArrowUpDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import './GenerateHistoryPage.css';
import { useRouter } from 'next/navigation';
import path from 'path';

// 图片类型接口
interface ImageItem {
  src: string;
  name: string;
  timestamp: number;
  tempFile?: string;
}

// 排序类型
type SortType = 'time' | 'name';
type SortOrder = 'asc' | 'desc';

// 预览图片刷新间隔
const PREVIEW_REFRESH_INTERVAL = 30000; // 30秒刷新一次预览图片

// 生成历史页面组件
export default function GenerateHistoryPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<ImageItem | null>(null);
  const [sortType, setSortType] = useState<SortType>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [previewTimestamp, setPreviewTimestamp] = useState<number>(Date.now());
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  // 获取图片列表 - 使用useCallback避免effect中的依赖问题
  const fetchImages = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setIsLoading(true);
      }
      
      // 添加时间戳避免缓存
      const cacheBreaker = new Date().getTime();
      console.log('正在请求图片数据...');
      
      // 通过API获取JSON文件内容，这样可以读取项目目录中的文件
      const response = await fetch(`/api/local-images?t=${cacheBreaker}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('获取图片列表错误:', response.status, errorText);
        throw new Error(`获取图片列表错误: ${response.status}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('解析图片数据失败:', parseError);
        throw new Error('无法解析图片数据，可能是格式不正确');
      }
      
      // 验证数据格式
      if (!data || !Array.isArray(data.images)) {
        console.error('图片数据格式不正确:', data);
        throw new Error('图片数据格式不正确');
      }
      
      console.log('成功获取图片数据:', data.images.length, '张图片');
      
      // 更新状态
      setImages(data.images);
      setLastUpdateTime(new Date(data.lastUpdate));
      setRefreshCount(prev => prev + 1);
    } catch (err) {
      console.error('加载图片错误:', err);
      if (showLoader) {
        setError(`加载图片失败: ${err instanceof Error ? err.message : '未知错误'}`);
      }
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, []);
  
  // 初始加载图片列表
  useEffect(() => {
    fetchImages(true); // 初始加载
  }, [fetchImages]);

  // 预览图片自动刷新
  useEffect(() => {
    if (!viewImage) return;
    
    console.log('启动预览图片自动刷新');
    const intervalId = setInterval(() => {
      console.log('刷新预览图片...');
      setPreviewTimestamp(Date.now());
    }, PREVIEW_REFRESH_INTERVAL);
    
    return () => {
      console.log('停止预览图片自动刷新');
      clearInterval(intervalId);
    };
  }, [viewImage]);

  // 监听滚动事件
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // 当滚动超过一定距离时显示返回顶部按钮
      const scrollPosition = scrollContainer.scrollTop;
      setShowScrollTop(scrollPosition > 300);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 处理排序
  const handleSort = (type: SortType) => {
    if (sortType === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortType(type);
      setSortOrder('desc');
    }
  };

  // 获取排序后的图片列表
  const getSortedImages = () => {
    return [...images].sort((a, b) => {
      if (sortType === 'time') {
        return sortOrder === 'asc' 
          ? a.timestamp - b.timestamp 
          : b.timestamp - a.timestamp;
      } else {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
    });
  };

  // 删除图片
  const handleDeleteImage = async (image: ImageItem) => {
    if (!confirm(`确定要删除图片 ${image.name} 吗？`)) {
      return;
    }

    try {
      // 使用标准API路径格式
      const response = await fetch(`/api/local-images?filename=${encodeURIComponent(image.name)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('删除图片错误:', response.status, errorText);
        throw new Error(`删除失败: ${response.status} ${errorText}`);
      }
      
      // 解析响应获取最新图片列表
      const data = await response.json();
      if (data && Array.isArray(data.images)) {
        setImages(data.images);
        setLastUpdateTime(new Date(data.lastUpdate));
      } else {
        // 如果没有返回新列表，则移除当前图片
        setImages(images.filter(img => img.name !== image.name));
      }
      
      if (viewImage && viewImage.name === image.name) {
        setViewImage(null);
      }
      
      alert('图片已删除');
    } catch (err) {
      console.error('删除图片错误:', err);
      alert(`删除图片时发生错误: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // 打开图片查看器
  const openImageViewer = (image: ImageItem) => {
    setPreviewTimestamp(Date.now());
    setViewImage(image);
  };

  // 关闭图片查看器
  const closeImageViewer = () => {
    setViewImage(null);
  };

  // 刷新预览图片
  const refreshPreviewImage = () => {
    setIsPreviewLoading(true);
    setPreviewTimestamp(Date.now());
  };

  // 图片加载完成
  const handleImageLoad = () => {
    setIsPreviewLoading(false);
  };

  // 图片加载错误
  const handleImageError = () => {
    setIsPreviewLoading(false);
    console.error('图片加载失败，尝试刷新');
    // 自动尝试再次加载
    setTimeout(() => {
      setPreviewTimestamp(Date.now());
    }, 1000);
  };

  // 滚动到顶部
  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // 处理重命名图片
  const handleRenameStart = () => {
    if (!viewImage) return;
    setNewFileName(viewImage.name);
    setIsRenaming(true);
    setRenameError(null);
    // 在下一个事件循环中聚焦输入框
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 50);
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameError(null);
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!viewImage || !newFileName.trim()) {
      setRenameError('文件名不能为空');
      return;
    }

    // 检查文件扩展名是否改变
    const originalExt = path.extname(viewImage.name);
    const newExt = path.extname(newFileName);
    
    // 如果修改了扩展名或文件名无效，显示错误
    if (originalExt !== newExt) {
      setRenameError('不能修改文件扩展名');
      return;
    }

    if (newFileName.includes('/') || newFileName.includes('\\') || newFileName.includes(':')) {
      setRenameError('文件名包含非法字符');
      return;
    }

    try {
      // 发送重命名请求
      const response = await fetch('/api/local-images', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldName: viewImage.name,
          newName: newFileName.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '重命名失败');
      }

      const data = await response.json();
      
      // 更新图片列表和当前查看的图片
      if (data && Array.isArray(data.images)) {
        setImages(data.images);
        setLastUpdateTime(new Date(data.lastUpdate));
        
        // 更新当前查看的图片为重命名后的图片
        const renamedImage = data.images.find((img: ImageItem) => img.name === newFileName.trim());
        if (renamedImage) {
          setViewImage(renamedImage);
        } else {
          setViewImage(null);
        }
      }

      setIsRenaming(false);
      setRenameError(null);
    } catch (err) {
      console.error('重命名图片错误:', err);
      setRenameError(`重命名失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // 手动刷新图片列表
  const handleManualRefresh = () => {
    console.log('手动刷新图片列表');
    fetchImages(true);
  };

  return (
    <div className="generate-history-container">
      <div className="generate-history-header">
        <h1>生成历史</h1>
        <div className="header-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            className="refresh-button"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <div className="sort-buttons">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('time')}
              className={sortType === 'time' ? 'active' : ''}
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              按时间排序 {sortType === 'time' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('name')}
              className={sortType === 'name' ? 'active' : ''}
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              按名称排序 {sortType === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
          
          {lastUpdateTime && (
            <div className="last-update-time">
              上次更新: {lastUpdateTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="generate-history-loading">
          <Loader />
          <p>加载图片中...</p>
        </div>
      ) : error ? (
        <div className="generate-history-error">
          <p>{error}</p>
          <Button onClick={() => window.location.reload()}>刷新页面</Button>
        </div>
      ) : images.length === 0 ? (
        <div className="generate-history-empty">
          <p>暂无生成历史图片</p>
        </div>
      ) : (
        <div className="generate-history-scroll-container" ref={scrollContainerRef}>
          <div className="generate-history-grid">
            {getSortedImages().map((image, index) => (
              <div key={`${image.name}-${image.timestamp}`} className="image-card">
                <div className="image-container" onClick={() => openImageViewer(image)}>
                  {/* 添加key参数防止图片缓存 */}
                  <img src={`${image.src}?t=${refreshCount}`} alt={image.name} loading="lazy" />
                </div>
                <div className="image-name" title={image.name}>
                  {image.name}
                </div>
                <div className="image-actions">
                  <span className="text-xs text-gray-500">
                    {new Date(image.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* 滚动指示器 */}
          {showScrollTop && (
            <div className={`scroll-indicator visible`} onClick={scrollToTop}>
              <ChevronUp className="h-6 w-6" />
            </div>
          )}
        </div>
      )}

      {/* 图片查看器 */}
      {viewImage && (
        <div className="image-viewer-overlay" onClick={closeImageViewer}>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-viewer-img-container">
              {isPreviewLoading && (
                <div className="preview-loader">
                  <Loader />
                </div>
              )}
              <img 
                ref={imageRef}
                src={`${viewImage.src}?t=${previewTimestamp}`} 
                alt={viewImage.name}
                onLoad={handleImageLoad} 
                onError={handleImageError}
                style={{ display: isPreviewLoading ? 'none' : 'block' }}
              />
            </div>
            <div className="image-viewer-info">
              {isRenaming ? (
                <form onSubmit={handleRenameSubmit} className="rename-form">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="rename-input"
                  />
                  {renameError && <p className="text-sm text-red-500">{renameError}</p>}
                  <div className="rename-actions">
                    <Button type="submit" variant="default">确认</Button>
                    <Button type="button" variant="outline" onClick={handleRenameCancel}>取消</Button>
                  </div>
                </form>
              ) : (
                <>
                  <p>{viewImage.name}</p>
                  <p className="text-sm text-gray-999">
                    {new Date(viewImage.timestamp).toLocaleString()}
                  </p>
                </>
              )}
              <div className="image-viewer-actions">
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteImage(viewImage)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除图片
                </Button>
                <Button 
                  variant="default"
                  onClick={handleRenameStart}
                >
                  重命名
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = viewImage.src;
                    link.download = viewImage.name;
                    link.click();
                  }}
                >
                  保存图片
                </Button>
                <Button 
                  variant="outline"
                  onClick={closeImageViewer}
                >
                  关闭
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
