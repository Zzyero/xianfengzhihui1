/* eslint-disable @next/next/no-img-element */
"use client";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { IViewComfyWorkflow } from "@/app/providers/view-comfy-provider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react"; // 导入X图标用于关闭按钮
import { Button } from "@/components/ui/button";
import { PreviewAudio } from "@/components/preview-audio";

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
 * 预览图片和音频画廊组件
 * 用于展示最多3张预览图片和3个音频文件，带有动画效果
 */
export function PreviewOutputsImageGallery({
    viewComfyJSON
}: {
    viewComfyJSON: IViewComfyWorkflow
}) {
    // 初始化三张预览图片的状态
    const [image1, setImage1] = useState<string | null>(
        (viewComfyJSON.previewImages && viewComfyJSON.previewImages[0]) ? viewComfyJSON.previewImages[0] : null
    );
    const [image2, setImage2] = useState<string | null>(
        (viewComfyJSON.previewImages && viewComfyJSON.previewImages[1]) ? viewComfyJSON.previewImages[1] : null
    );
    const [image3, setImage3] = useState<string | null>(
        (viewComfyJSON.previewImages && viewComfyJSON.previewImages[2]) ? viewComfyJSON.previewImages[2] : null
    );
    
    // 初始化三个预览音频的状态
    const [audio1, setAudio1] = useState<string | null>(
        (viewComfyJSON.previewAudios && viewComfyJSON.previewAudios[0]) ? viewComfyJSON.previewAudios[0] : null
    );
    const [audio2, setAudio2] = useState<string | null>(
        (viewComfyJSON.previewAudios && viewComfyJSON.previewAudios[1]) ? viewComfyJSON.previewAudios[1] : null
    );
    const [audio3, setAudio3] = useState<string | null>(
        (viewComfyJSON.previewAudios && viewComfyJSON.previewAudios[2]) ? viewComfyJSON.previewAudios[2] : null
    );
    
    // 音频错误状态
    const [audioErrors, setAudioErrors] = useState<{[key: number]: string | null}>({
        0: null, 1: null, 2: null
    });
    
    // 图片预览状态
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // 添加 useEffect 钩子来监听 viewComfyJSON 的变化
    useEffect(() => {
        // 当 viewComfyJSON 变化时，更新图片状态
        setImage1((viewComfyJSON.previewImages && viewComfyJSON.previewImages[0]) ? viewComfyJSON.previewImages[0] : null);
        setImage2((viewComfyJSON.previewImages && viewComfyJSON.previewImages[1]) ? viewComfyJSON.previewImages[1] : null);
        setImage3((viewComfyJSON.previewImages && viewComfyJSON.previewImages[2]) ? viewComfyJSON.previewImages[2] : null);
        
        // 当 viewComfyJSON 变化时，更新音频状态
        setAudio1((viewComfyJSON.previewAudios && viewComfyJSON.previewAudios[0]) ? viewComfyJSON.previewAudios[0] : null);
        setAudio2((viewComfyJSON.previewAudios && viewComfyJSON.previewAudios[1]) ? viewComfyJSON.previewAudios[1] : null);
        setAudio3((viewComfyJSON.previewAudios && viewComfyJSON.previewAudios[2]) ? viewComfyJSON.previewAudios[2] : null);
        
        // 重置音频错误状态
        setAudioErrors({0: null, 1: null, 2: null});
    }, [viewComfyJSON]); // 依赖项包含 viewComfyJSON，当它变化时执行 effect

    // 定义第一张图片的动画变体
    const first = {
        initial: {
            //x: 20,
            //rotate: -5,
        },
        hover: {
            //x: 0,
            //rotate: 0,
        },
    };

    // 定义第二张图片的动画变体
    const second = {
        initial: {
            //x: -20,
            //rotate: 5,
        },
        hover: {
            //x: 0,
            // rotate: 0,
        },
    };

    // 放大预览图片
    const openImagePreview = (imageUrl: string | null) => {
        if (imageUrl) {
            setPreviewImageUrl(imageUrl);
        }
    };

    // 关闭图片预览
    const closeImagePreview = () => {
        setPreviewImageUrl(null);
    };
    
    // 下载音频
    const downloadAudio = (audioUrl: string | null, index: number) => {
        if (audioUrl) {
            const link = document.createElement('a');
            link.href = audioUrl;
            
            // 根据URL或MIME类型设置文件扩展名
            let extension = 'wav';
            const mimeType = getAudioMimeType(audioUrl);
            if (mimeType === 'audio/mpeg') extension = 'mp3';
            else if (mimeType === 'audio/ogg') extension = 'ogg';
            else if (mimeType === 'audio/aac') extension = 'aac';
            else if (mimeType === 'audio/mp4') extension = 'm4a';
            else if (mimeType === 'audio/flac') extension = 'flac';
            
            link.download = `audio-${Date.now()}.${extension}`;
            link.click();
        }
    };
    
    // 检查浏览器是否支持特定音频格式
    const checkAudioSupport = (mimeType: string): boolean => {
        const audio = document.createElement('audio');
        return audio.canPlayType(mimeType) !== '';
    };
    
    // 设置音频错误
    const setAudioError = (index: number, error: string | null) => {
        setAudioErrors(prev => ({...prev, [index]: error}));
    };

    // 判断是否有图片预览
    const hasImages = image1 || image2 || image3;
    
    // 判断是否有音频预览
    const hasAudios = audio1 || audio2 || audio3;
    
    // 判断是否有任何预览内容
    const hasContent = hasImages || hasAudios;

    // 返回图片和音频画廊组件
    return (
        <>
            {/* 画廊容器 */}
            <motion.div
                initial="initial"
                animate="animate"
                whileHover="hover"
                className="flex w-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-col space-y-4 items-center justify-center p-4"
            >   
                {/* 图片部分 */}
                {hasImages && (
                    <div className="flex flex-row space-x-2 items-center justify-center w-full">
                        {image1 && (
                            <motion.div
                                variants={first}
                                className="rounded-md flex items-center justify-center overflow-hidden cursor-pointer"
                                onClick={() => openImagePreview(image1)}
                            >
                                <img
                                    src={image1}
                                    alt="preview"
                                    className={cn("max-h-[500px] aspect-square object-cover rounded-md transition-all hover:scale-105")}
                                    onError={() => {
                                        setImage1(null);
                                    }}
                                />
                            </motion.div>
                        )}
                        {image2 && (
                            <motion.div
                                className="relative z-20 rounded-md flex items-center justify-center overflow-hidden cursor-pointer"
                                onClick={() => openImagePreview(image2)}
                            >
                                <img
                                    src={image2}
                                    alt="preview"
                                    className={cn("max-h-[500px] aspect-square object-cover rounded-md transition-all hover:scale-105")}
                                    onError={() => {
                                        setImage2(null);
                                    }}
                                />
                            </motion.div>
                        )}
                        {image3 && (
                            <motion.div
                                variants={second}
                                className="rounded-md flex items-center justify-center overflow-hidden cursor-pointer"
                                onClick={() => openImagePreview(image3)}
                            >
                                <img
                                    src={image3}
                                    alt="preview"
                                    className={cn("max-h-[500px] aspect-square object-cover rounded-md transition-all hover:scale-105")}
                                    onError={() => {
                                        setImage3(null);
                                    }}
                                />
                            </motion.div>
                        )}
                    </div>
                )}
                
                {/* 音频部分 */}
                {hasAudios && (
                    <div className="flex flex-col space-y-4 w-full">
                        {hasImages && hasAudios && (
                            <h3 className="text-lg font-medium self-start">预览音频</h3>
                        )}
                        
                        {audio1 && (
                            <PreviewAudio src={audio1} />
                        )}
                        
                        {audio2 && (
                            <PreviewAudio src={audio2} />
                        )}
                        
                        {audio3 && (
                            <PreviewAudio src={audio3} />
                        )}
                    </div>
                )}
            </motion.div>
            
            {/* 当没有内容时显示提示信息 */}
            {!hasContent && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
                    <span className="text-lg">
                        点击生成按钮开始生成
                    </span>
                </div>
            )}
            
            {/* 图片放大预览对话框 */}
            <Dialog open={!!previewImageUrl} onOpenChange={(isOpen) => { if (!isOpen) closeImagePreview(); }}>
                <DialogContent className="max-w-5xl p-0 bg-transparent border-none">
                    <div className="relative">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                            onClick={closeImagePreview}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        {previewImageUrl && (
                            <img
                                src={previewImageUrl}
                                alt="预览图片"
                                className="w-full h-auto object-contain max-h-[90vh]"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
