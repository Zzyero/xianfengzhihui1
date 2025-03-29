import { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Plus, Edit, Trash, Upload, Download, X, Image, FileUp, FileText, ArrowLeft } from "lucide-react";
import type { PromptItem, PromptTag } from './types';
import { PromptForm } from './prompt-form';
import { PromptLibraryService } from '@/lib/services/prompt-library-service';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';

interface PromptLibraryProps {
  prompts: PromptItem[];
  onAdd?: (prompt: Partial<PromptItem>) => void;
  onEdit?: (id: string, prompt: Partial<PromptItem>) => void;
  onDelete?: (id: string) => void;
  isSidebar?: boolean;
  showForm?: boolean;
  setShowForm?: (show: boolean) => void;
  editingPrompt?: Partial<PromptItem> | null;
  setEditingPrompt?: (prompt: Partial<PromptItem> | null) => void;
}

export function PromptLibrary({ 
  prompts, 
  onAdd, 
  onEdit, 
  onDelete, 
  isSidebar = false,
  showForm = false,
  setShowForm = () => {},
  editingPrompt = null,
  setEditingPrompt = () => {}
}: PromptLibraryProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [parsedPrompt, setParsedPrompt] = useState<string | null>(null);
  const [parsedPromptEn, setParsedPromptEn] = useState<string | null>(null);
  const [parsedParameters, setParsedParameters] = useState<Record<string, string>>({});

  // 添加控制台输出来调试
  useEffect(() => {
    console.log('搜索关键词:', searchQuery);
  }, [searchQuery]);

  const filteredPrompts = prompts.filter(prompt => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    
    // 检查提示词内容
    if (prompt.prompt && prompt.prompt.toLowerCase().includes(query)) return true;
    
    // 检查英文提示词
    if (prompt.promptEn && prompt.promptEn.toLowerCase().includes(query)) return true;
    
    // 检查标签名称
    if (prompt.tags && prompt.tags.some(tag => tag.name.toLowerCase() === query)) return true;
    
    return false;
  });

  // 处理标签点击
  const handleTagClick = (tagName: string) => {
    console.log('点击了标签:', tagName);
    // 清除搜索框后再设置新值，确保触发状态更新
    setSearchQuery('');
    setTimeout(() => {
      setSearchQuery(tagName);
    }, 0);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const importedPrompts = await PromptLibraryService.importPrompts(file);
        importedPrompts.forEach(prompt => onAdd?.(prompt));
      } catch (error) {
        console.error('导入失败:', error);
      }
    }
  };

  // 解析ComfyUI PNG图片
  const handleParsePngImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // 读取文件的前10KB作为ArrayBuffer
        const buffer = await readFileAsArrayBuffer(file, 20 * 1024);
        
        // 获取PNG文本数据
        const textData = extractPngTextChunks(buffer);
        console.log('PNG文本数据:', textData);
        
        if (textData.prompt) {
          try {
            // 解析JSON格式的prompt数据
            const promptData = JSON.parse(textData.prompt);
            console.log('解析的提示词数据:', promptData);
            
            // 创建FormData用于上传文件
            const formData = new FormData();
            formData.append('file', file);
            
            // 上传图片到服务器
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              throw new Error('上传图片失败');
            }
            
            const { filename } = await response.json();
            const imageUrl = `/images/prompts/${filename}`;  // 构造正确的图片URL
            
            // 尝试提取提示词
            let extractedPrompt = '';
            let extractedNegative = '';
            let params: Record<string, string> = {};
            
            try {
              // 定义默认参数
              params = {
                steps: '',
                cfg: '',
                sampler: '',
                seed: '',
                scheduler: 'normal',
                denoise: '1.0',
              };
              
              let foundKSampler = false;
              let foundBasicScheduler = false;
              let foundRandomNoise = false;
              
              // 遍历所有节点寻找提示词和参数
              for (const nodeId in promptData) {
                const node = promptData[nodeId];
                
                // 提取正向提示词
                if (node.class_type === 'CLIPTextEncode' && node.inputs?.text) {
                  // 检查是否为负向提示词（通过title或其他特征）
                  const isNegative = 
                    node._meta?.title?.toLowerCase().includes('negative') ||
                    node.inputs.text.toLowerCase().includes('negative prompt:') ||
                    nodeId.includes('negative');
                  
                  if (!isNegative) {
                    extractedPrompt = node.inputs.text || '';
                  } else {
                    extractedNegative = node.inputs.text || '';
                  }
                }
                
                // 提取KSampler参数
                if (node.class_type === 'KSampler' && !foundKSampler) {
                  foundKSampler = true;
                  params = {
                    ...params,
                    steps: node.inputs?.steps?.toString() || params.steps,
                    cfg: node.inputs?.cfg?.toString() || params.cfg,
                    sampler: node.inputs?.sampler_name || params.sampler,
                    seed: node.inputs?.seed?.toString() || params.seed,
                    scheduler: node.inputs?.scheduler || params.scheduler,
                    denoise: node.inputs?.denoise?.toString() || params.denoise,
                  };
                }
                
                // 提取KSamplerSelect参数
                if (node.class_type === 'KSamplerSelect') {
                  params.sampler = node.inputs?.sampler_name || params.sampler;
                }
                
                // 提取BasicScheduler参数
                if (node.class_type === 'BasicScheduler' && !foundBasicScheduler) {
                  foundBasicScheduler = true;
                  params = {
                    ...params,
                    steps: node.inputs?.steps?.toString() || params.steps,
                    scheduler: node.inputs?.scheduler || params.scheduler,
                    denoise: node.inputs?.denoise?.toString() || params.denoise,
                  };
                }
                
                // 提取RandomNoise参数（种子）
                if (node.class_type === 'RandomNoise' && !foundRandomNoise) {
                  foundRandomNoise = true;
                  params.seed = node.inputs?.noise_seed?.toString() || params.seed;
                }
                
                // 提取模型信息
                if (node.class_type === 'CheckpointLoaderSimple') {
                  params.model = node.inputs?.ckpt_name || '';
                }
              }
              
              console.log('提取的正向提示词:', extractedPrompt);
              console.log('提取的负向提示词:', extractedNegative);
              console.log('提取的参数:', params);
              
              // 设置提取的提示词和参数
              setParsedPromptEn(extractedPrompt);
              
              // 创建新的提示词表单
              setEditingPrompt({
                prompt: '',  // 中文版本留空
                promptEn: extractedPrompt,
                parameters: {
                  ...params,
                  negative: extractedNegative, // 添加负向提示词作为参数
                },
                tags: [],  // 标签留空
                imageUrl: imageUrl  // 使用保存后的图片路径
              });
              
              // 显示表单
              setShowForm(true);
            } catch (error) {
              console.error('解析提示词数据失败:', error);
              alert('解析提示词数据失败');
            }
          } catch (error) {
            console.error('解析提示词JSON失败:', error);
            alert('解析图片中的提示词数据失败');
          }
        } else {
          alert('图片中未包含提示词信息');
        }
      } catch (error) {
        console.error('解析PNG文件失败:', error);
        alert('解析PNG文件失败');
      }
    }
  };
  
  // 读取文件部分内容为ArrayBuffer
  const readFileAsArrayBuffer = (file: File, maxBytes: number): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        resolve(buffer);
      };
      reader.onerror = (e) => {
        reject(new Error('读取文件失败'));
      };
      
      // 只读取文件的前部分
      const blob = file.slice(0, Math.min(maxBytes, file.size));
      reader.readAsArrayBuffer(blob);
    });
  };
  
  // 从PNG文件中提取文本块
  const extractPngTextChunks = (buffer: ArrayBuffer): Record<string, string> => {
    const view = new DataView(buffer);
    const textChunks: Record<string, string> = {};
    
    // 跳过PNG头部(8字节)
    let offset = 8;
    
    while (offset < buffer.byteLength) {
      // 读取块长度(4字节)
      const length = view.getUint32(offset);
      offset += 4;
      
      // 读取块类型(4字节)
      const type = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      offset += 4;
      
      // 如果是文本块(tEXt)
      if (type === 'tEXt') {
        let keyword = '';
        let i = 0;
        
        // 读取关键字(直到0分隔符)
        while (offset + i < buffer.byteLength && view.getUint8(offset + i) !== 0) {
          keyword += String.fromCharCode(view.getUint8(offset + i));
          i++;
        }
        
        // 跳过分隔符
        i++;
        
        // 读取文本内容
        let text = '';
        for (let j = 0; j < length - keyword.length - 1 && offset + i + j < buffer.byteLength; j++) {
          text += String.fromCharCode(view.getUint8(offset + i + j));
        }
        
        textChunks[keyword] = text;
      }
      
      // 跳到下一个块(+4为CRC字段)
      offset += length + 4;
    }
    
    return textChunks;
  };

  // 处理图片双击事件
  const handleImageDoubleClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // 关闭图片预览
  const closeImagePreview = () => {
    setSelectedImage(null);
  };

  // 处理图片加载错误
  const handleImageError = (promptId: string) => {
    setImageErrors(prev => ({ ...prev, [promptId]: true }));
  };

  // 处理图片加载成功
  const handleImageLoad = (promptId: string) => {
    setLoadedImages(prev => ({ ...prev, [promptId]: true }));
  };

  // 图片预览对话框
  const ImagePreviewDialog = () => (
    <Dialog open={!!selectedImage} onOpenChange={closeImagePreview}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="relative w-full h-full">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={closeImagePreview}
          >
            <X className="h-4 w-4" />
          </Button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="预览图片"
              className="w-full h-auto object-contain max-h-[80vh]"
              onError={(e) => {
                // 如果预览图片加载失败，显示占位图
                e.currentTarget.style.display = 'none';
                const container = e.currentTarget.parentElement;
                if (container) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'flex items-center justify-center w-full h-[50vh] bg-gray-100';
                  placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                  container.appendChild(placeholder);
                }
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // 占位图组件
  const PlaceholderImage = () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-lg">
      <Image className="w-12 h-12 text-gray-400" />
    </div>
  );

  // 处理卡片点击，跳转到详情页
  const handleCardClick = (promptId: string) => {
    router.push(`/prompt-library/${promptId}`);
  };

  const handleBackHome = () => {
    router.push('/');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleParseImageClick = () => {
    imageFileInputRef.current?.click();
  };

  const content = (
    <>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>

      <div className="flex flex-col space-y-4">
        {!isSidebar && (
          <div className="flex items-center">
            <Button
              variant="ghost"
              className="mr-2"
              onClick={handleBackHome}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回主页
            </Button>
          </div>
        )}

        <div className={`flex items-center justify-between ${isSidebar ? 'flex-col gap-2' : ''}`}>
          <div className={`flex items-center gap-2 ${isSidebar ? 'w-full' : 'flex-1'}`}>
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索提示词或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加
            </Button>
          </div>

          <div className={`flex items-center gap-2 ${isSidebar ? 'w-full' : ''}`}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <input
              ref={imageFileInputRef}
              type="file"
              accept=".png"
              className="hidden"
              onChange={handleParsePngImage}
            />
            <Button variant="outline" onClick={handleImportClick}>
              <Upload className="w-4 h-4 mr-2" />
              导入
            </Button>
            <Button variant="outline" onClick={handleParseImageClick}>
              <FileUp className="w-4 h-4 mr-2" />
              解析图片
            </Button>
          </div>
        </div>

        <div className={`grid gap-4 ${
          isSidebar 
            ? 'grid-cols-1' 
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        }`}>
          {filteredPrompts.map((prompt) => (
            <Card 
              key={prompt.id} 
              className="p-4 flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick(prompt.id)}
            >
              <div 
                className="relative mb-3 overflow-hidden bg-white rounded-lg p-2"
                style={{ minHeight: '200px' }}
              >
                {!loadedImages[prompt.id] && !imageErrors[prompt.id] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-xs z-10">
                    加载中...
                  </div>
                )}
                
                {imageErrors[prompt.id] ? (
                  <PlaceholderImage />
                ) : (
                  <div className="relative w-full" style={{ paddingTop: '75%' }}>
                    <img
                      src={prompt.imageUrl}
                      alt={prompt.prompt}
                      className="absolute inset-0 w-full h-full object-contain transition-transform hover:scale-105"
                      loading="lazy"
                      onError={() => handleImageError(prompt.id)}
                      onLoad={() => handleImageLoad(prompt.id)}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {prompt.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      style={{ backgroundColor: tag.color }}
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTagClick(tag.name);
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <PromptForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingPrompt(undefined);
          }}
          onSubmit={(prompt) => {
            if (editingPrompt?.id) {
              onEdit?.(editingPrompt.id, prompt);
            } else {
              onAdd?.(prompt);
            }
            setShowForm(false);
          }}
          initialData={editingPrompt}
          title={editingPrompt ? "编辑提示词" : "添加提示词"}
        />

        <ImagePreviewDialog />
      </div>
    </>
  );

  return (
    <div className={`flex flex-col h-full bg-background ${isSidebar ? 'p-2' : 'p-4'} overflow-auto`}>
      {isSidebar ? (
        <ScrollArea className="h-full">
          {content}
        </ScrollArea>
      ) : (
        content
      )}
    </div>
  );
} 