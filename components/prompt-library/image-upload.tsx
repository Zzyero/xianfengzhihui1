import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
        setImageError(false);
        setImageLoaded(false);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('上传失败');
        }

        const data = await response.json();
        const imagePath = `/images/prompts/${data.filename}`;
        setPreview(imagePath);
        onChange(imagePath);
      } catch (error) {
        console.error('上传图片失败:', error);
        alert('上传图片失败，请重试');
        setImageError(true);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPreview(url);
    setImageError(false);
    setImageLoaded(false);
    onChange(url);
  };

  const handleClear = () => {
    setPreview('');
    setImageError(false);
    setImageLoaded(false);
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleImageError = () => {
    console.error('图片加载失败:', preview);
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // 占位图组件
  const PlaceholderImage = () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-100 rounded-lg">
      <ImageIcon className="w-12 h-12 text-gray-400" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="输入图片URL或上传图片"
          value={value || ''}
          onChange={handleUrlChange}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          title="上传图片"
          aria-label="上传图片"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-4 h-4" />
        </Button>
        {preview && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {preview && (
        <div className="relative aspect-video">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
              加载中...
            </div>
          )}
          {imageError ? (
            <PlaceholderImage />
          ) : (
            <img
              src={preview}
              alt="预览图片"
              className="rounded-lg object-cover w-full h-full"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          )}
        </div>
      )}
    </div>
  );
} 