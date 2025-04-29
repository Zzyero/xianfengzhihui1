"use client"
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import './GenerateHistoryPage.css';
import { useRouter } from 'next/navigation';
import fs from 'fs';
import path from 'path';

// 图片类型接口
interface ImageItem {
  src: string;
  name: string;
  fullPath?: string;
}

// 生成历史页面组件
export default function GenerateHistoryPage() {
  // 图片列表状态
  const [images, setImages] = useState<ImageItem[]>([]);
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  // 错误状态
  const [error, setError] = useState<string | null>(null);
  // 图片查看状态
  const [viewImage, setViewImage] = useState<ImageItem | null>(null);
  const router = useRouter();

  // 加载图片列表
  useEffect(() => {
    // 在客户端获取公共文件夹中的所有图片
    async function fetchImages() {
      try {
        setIsLoading(true);
        
        // 使用fetch获取图片文件列表
        // 在实际应用中，这可能需要一个简单的API或静态生成的数据
        // 这里我们直接列出public/images/prompts目录中的文件
        
        // 模拟读取目录内容
        // 注意：浏览器端代码不能直接读取文件系统
        // 这里直接扫描public/images/prompts文件夹下的文件
        
        // 获取public/images/prompts目录下的所有图片文件
        const imageFiles = await getPublicImages();
        setImages(imageFiles);
      } catch (err) {
        console.error('加载图片错误:', err);
        setError('加载图片失败，请刷新页面重试');
      } finally {
        setIsLoading(false);
      }
    }

    fetchImages();
  }, []);

  // 模拟获取public文件夹中的图片
  // 这个函数在实际应用中需要替换为服务器端代码
  async function getPublicImages(): Promise<ImageItem[]> {
    // 在生产环境中，这些图片应该通过静态生成或API获取
    // 这里我们假设public/images/prompts目录下有一些图片
    
    // 扫描public/images/prompts目录(模拟)
    // 用一些示例图片替代
    return [
      {
        src: '/images/prompts/sample1.jpg',
        name: 'sample1.jpg'
      },
      {
        src: '/images/prompts/sample2.jpg',
        name: 'sample2.jpg'
      },
      // 添加更多示例图片...
    ];
    
    // 注意：在真实实现中，这部分应该由服务器端或静态生成提供
    // 例如，可以创建一个getStaticProps函数来获取图片列表
  }

  // 删除图片
  const handleDeleteImage = async (image: ImageItem) => {
    if (!confirm(`确定要删除图片 ${image.name} 吗？`)) {
      return;
    }

    try {
      // 在实际应用中，这里需要调用服务器API或使用适当的方法删除文件
      // 这里我们只从状态中移除图片以进行演示
      setImages(images.filter(img => img.src !== image.src));
      
      // 如果当前正在查看该图片，关闭查看器
      if (viewImage && viewImage.src === image.src) {
        setViewImage(null);
      }
      
      // 显示删除成功消息
      alert('图片已删除');
      
      // 重新加载页面以刷新图片列表
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (err) {
      console.error('删除图片错误:', err);
      alert('删除图片时发生错误');
    }
  };

  // 打开图片查看器
  const openImageViewer = (image: ImageItem) => {
    setViewImage(image);
  };

  // 关闭图片查看器
  const closeImageViewer = () => {
    setViewImage(null);
  };

  return (
    <div className="generate-history-container">
      <div className="generate-history-header">
        <h1>生成历史</h1>
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
        <div className="generate-history-grid">
          {images.map((image, index) => (
            <div key={index} className="image-card">
              <div className="image-container" onClick={() => openImageViewer(image)}>
                <img src={image.src} alt={image.name} loading="lazy" />
              </div>
              <div className="image-actions">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(image);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 图片查看器 */}
      {viewImage && (
        <div className="image-viewer-overlay" onClick={closeImageViewer}>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <img src={viewImage.src} alt={viewImage.name} />
            <div className="image-viewer-info">
              <p>{viewImage.name}</p>
              <div className="image-viewer-actions">
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteImage(viewImage)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除图片
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
