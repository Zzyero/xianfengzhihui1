/* eslint-disable @next/next/no-img-element */
"use client";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { IViewComfyWorkflow } from "@/app/providers/view-comfy-provider";

/**
 * 预览图片画廊组件
 * 用于展示最多3张预览图片，带有动画效果
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

    // 添加 useEffect 钩子来监听 viewComfyJSON 的变化
    useEffect(() => {
        // 当 viewComfyJSON 变化时，更新图片状态
        setImage1((viewComfyJSON.previewImages && viewComfyJSON.previewImages[0]) ? viewComfyJSON.previewImages[0] : null);
        setImage2((viewComfyJSON.previewImages && viewComfyJSON.previewImages[1]) ? viewComfyJSON.previewImages[1] : null);
        setImage3((viewComfyJSON.previewImages && viewComfyJSON.previewImages[2]) ? viewComfyJSON.previewImages[2] : null);
    }, [viewComfyJSON]); // 依赖项包含 viewComfyJSON，当它变化时执行 effect

    // 定义第一张图片的动画变体
    const first = {
        initial: {
            x: 20,
            rotate: -5,
        },
        hover: {
            x: 0,
            rotate: 0,
        },
    };

    // 定义第二张图片的动画变体
    const second = {
        initial: {
            x: -20,
            rotate: 5,
        },
        hover: {
            x: 0,
            rotate: 0,
        },
    };

    // 返回图片画廊组件
    return (
        <>
            {/* 图片画廊容器 */}
            <motion.div
                initial="initial"
                animate="animate"
                whileHover="hover"
                className="flex w-full min-h-[6rem] dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex-row space-x-2 items-center justify-center p-4"
            >   
                {(image1) && (
                    <motion.div
                        variants={first}
                        className="rounded-md flex items-center justify-center overflow-hidden"
                    >
                        <img
                            src={image1}
                            alt="avatar"
                            className={cn("max-h-[500px] aspect-square object-cover rounded-md transition-all hover:scale-105")}
                            onError={() => {
                                setImage1(null);
                            }}
                        />
                    </motion.div>
                )}
                {(image2) && (
                    <motion.div
                        className="relative z-20 rounded-md flex items-center justify-center overflow-hidden"
                    >
                        <img
                            src={image2}
                            alt="avatar"
                            className={cn("max-h-[500px] aspect-square object-cover rounded-md transition-all hover:scale-105")}
                            onError={() => {
                                setImage2(null);
                            }}
                        />
                    </motion.div>
                )}
                {(image3) && (
                    <motion.div
                        variants={second}
                        className="rounded-md flex items-center justify-center overflow-hidden"
                    >
                        <img
                            src={image3}
                            alt="avatar"
                            className={cn("max-h-[500px] aspect-square object-cover rounded-md transition-all hover:scale-105")}
                            onError={() => {
                                setImage3(null);
                            }}
                        />
                    </motion.div>
                )}
            </motion.div>
        {/* 当没有图片时显示提示信息 */}
        {!(image1 ?? image2 ?? image3) && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full text-center">
                <span className="text-lg">
                    点击生成按钮开始生图
                </span>
            </div>
        )}
        </>
    );
};
