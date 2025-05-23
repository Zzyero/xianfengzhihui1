import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setUploading(true);
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
      } finally {
        setUploading(false);
      }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setPreview(url);
    onChange(url);
  };

  const handleClear = () => {
    setPreview('');
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

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
          <img
            src={preview}
            alt="Preview"
            className="rounded-lg object-cover w-full h-full"
          />
        </div>
      )}
    </div>
  );
} 