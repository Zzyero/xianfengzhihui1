import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";

/**
 * 获取音频文件的MIME类型
 */
function getAudioMimeType(url: string): string {
    if (url.includes('audio/flac') || url.endsWith('.flac')) return 'audio/flac';
    if (url.includes('audio/mpeg') || url.endsWith('.mp3')) return 'audio/mpeg';
    if (url.includes('audio/wav') || url.endsWith('.wav')) return 'audio/wav';
    if (url.includes('audio/ogg') || url.endsWith('.ogg')) return 'audio/ogg';
    if (url.includes('audio/aac') || url.endsWith('.aac')) return 'audio/aac';
    if (url.includes('audio/mp4') || url.endsWith('.m4a')) return 'audio/mp4';
    return 'audio/wav'; // 默认类型
}

/**
 * 检查浏览器是否支持特定音频格式
 */
function checkAudioSupport(mimeType: string): boolean {
    if (typeof window === 'undefined') return false; // 服务器端渲染时返回false
    const audio = document.createElement('audio');
    return audio.canPlayType(mimeType) !== '';
}

interface PreviewAudioProps {
    src: string;
    onDelete?: () => void;
    showDelete?: boolean;
    className?: string;
}

/**
 * 音频预览组件
 * 支持各种音频格式，包括FLAC
 */
export function PreviewAudio({ src, onDelete, showDelete = false, className = '' }: PreviewAudioProps) {
    const [error, setError] = useState<string | null>(null);
    const [audioType, setAudioType] = useState<string>('audio/wav');

    // 检测音频类型并验证浏览器支持
    useEffect(() => {
        if (src) {
            const mimeType = getAudioMimeType(src);
            setAudioType(mimeType);
            
            // 检查FLAC支持
            if (mimeType === 'audio/flac' && !checkAudioSupport('audio/flac')) {
                setError('您的浏览器不支持FLAC格式，请使用Chrome或Firefox最新版本');
            } else {
                setError(null);
            }
        }
    }, [src]);

    // 下载音频文件
    const handleDownload = () => {
        if (src) {
            const link = document.createElement('a');
            link.href = src;
            
            // 根据MIME类型设置文件扩展名
            let extension = 'wav';
            if (audioType === 'audio/mpeg') extension = 'mp3';
            else if (audioType === 'audio/ogg') extension = 'ogg';
            else if (audioType === 'audio/aac') extension = 'aac';
            else if (audioType === 'audio/mp4') extension = 'm4a';
            else if (audioType === 'audio/flac') extension = 'flac';
            
            link.download = `audio-${Date.now()}.${extension}`;
            link.click();
        }
    };

    if (!src) return null;

    return (
        <div className={`border rounded-md p-4 bg-card w-full ${className}`}>
            {error ? (
                <div className="flex flex-col gap-2">
                    <div className="text-red-500 text-sm">{error}</div>
                    <div className="flex justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleDownload}
                        >
                            <Download className="size-4 mr-2" /> 下载
                        </Button>
                        {showDelete && onDelete && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={onDelete}
                            >
                                <Trash2 className="size-4 mr-2" /> 删除
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <audio 
                        controls 
                        className="w-full mb-2"
                        onError={() => {
                            setError(`无法播放此音频格式`);
                        }}
                    >
                        <source src={src} type={audioType} />
                        您的浏览器不支持此音频格式
                    </audio>
                    <div className="flex justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleDownload}
                        >
                            <Download className="size-4 mr-2" /> 下载
                        </Button>
                        {showDelete && onDelete && (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={onDelete}
                            >
                                <Trash2 className="size-4 mr-2" /> 删除
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
} 