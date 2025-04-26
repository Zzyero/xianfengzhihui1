"use client"

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eraser, Paintbrush, Save, Trash, Circle, Square } from 'lucide-react';

interface MaskEditorProps {
    imageUrl: string;
    onSave: (maskData: Blob, maskUrl: string) => void;
    onCancel?: () => void;
}

export function MaskEditor({ imageUrl, onSave, onCancel }: MaskEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const [maskCtx, setMaskCtx] = useState<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEraser, setIsEraser] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [brushHardness, setBrushHardness] = useState(1.0);
    const [lastPoint, setLastPoint] = useState<{ x: number, y: number } | null>(null);
    const [brushShape, setBrushShape] = useState<'circle' | 'square'>('circle');
    
    // 初始化画布和图层
    useEffect(() => {
        const image = new Image();
        image.src = imageUrl;
        image.onload = () => {
            if (!containerRef.current || !bgCanvasRef.current || !maskCanvasRef.current) return;

            // 计算合适的画布大小
            const container = containerRef.current;
            const maxWidth = container.clientWidth;
            const maxHeight = window.innerHeight * 0.7;

            let width = image.width;
            let height = image.height;

            if (width > maxWidth) {
                const ratio = maxWidth / width;
                width = maxWidth;
                height = height * ratio;
            }

            if (height > maxHeight) {
                const ratio = maxHeight / height;
                width = width * ratio;
                height = maxHeight;
            }

            // 设置画布大小
            setCanvasSize({ width, height });

            // 设置背景画布
            const bgCanvas = bgCanvasRef.current;
            const bgCtx = bgCanvas.getContext('2d');
            if (!bgCtx) return;

            bgCanvas.width = width;
            bgCanvas.height = height;
            bgCtx.drawImage(image, 0, 0, width, height);

            // 设置蒙版画布
            const maskCanvas = maskCanvasRef.current;
            const ctx = maskCanvas.getContext('2d', {
                willReadFrequently: true
            });
            if (!ctx) return;

            maskCanvas.width = width;
            maskCanvas.height = height;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#ffffff';
            
            setMaskCtx(ctx);
        };
    }, [imageUrl]);

    // 获取画布上的坐标和光标显示位置
    const getCanvasAndCursorPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return { canvasX: 0, canvasY: 0, cursorX: 0, cursorY: 0 };

        const rect = canvas.getBoundingClientRect();
        
        // 计算画布在容器中的实际位置（考虑objectFit: contain的情况）
        const canvasRatio = canvas.width / canvas.height;
        const containerRatio = rect.width / rect.height;
        
        let renderWidth = rect.width;
        let renderHeight = rect.height;
        let offsetX = 0;
        let offsetY = 0;
        
        // 如果画布比例与容器比例不同，计算实际渲染区域和偏移量
        if (canvasRatio > containerRatio) {
            // 宽度适应，高度居中
            renderHeight = rect.width / canvasRatio;
            offsetY = (rect.height - renderHeight) / 2;
        } else {
            // 高度适应，宽度居中
            renderWidth = rect.height * canvasRatio;
            offsetX = (rect.width - renderWidth) / 2;
        }
        
        // 计算鼠标在实际渲染区域内的相对位置
        const relativeX = e.clientX - rect.left - offsetX;
        const relativeY = e.clientY - rect.top - offsetY;
        
        // 检查鼠标是否在实际渲染区域内
        const isInRenderArea = 
            relativeX >= 0 && 
            relativeX <= renderWidth && 
            relativeY >= 0 && 
            relativeY <= renderHeight;
        
        // 将相对位置转换为画布坐标
        const scaleX = canvas.width / renderWidth;
        const scaleY = canvas.height / renderHeight;
        
        const canvasX = isInRenderArea ? relativeX * scaleX : -1;
        const canvasY = isInRenderArea ? relativeY * scaleY : -1;
        
        // 光标位置应该是相对于容器的，但需要考虑偏移
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        
        return { canvasX, canvasY, cursorX, cursorY, isInRenderArea };
    };

    // 获取画布上的坐标
    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const { canvasX, canvasY } = getCanvasAndCursorPosition(e);
        return { x: canvasX, y: canvasY };
    };

    // 开始绘制
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!maskCtx) return;
        
        const { x, y } = getCanvasCoordinates(e);
        if (x < 0 || y < 0) return; // 如果鼠标不在渲染区域内，不开始绘制
        
        setIsDrawing(true);
        setLastPoint({ x, y });
        drawBrushStroke(x, y);
    };

    // New function to draw a single brush circle with hardness
    const drawBrushStroke = (x: number, y: number) => {
        if (!maskCtx) return;
        const radius = brushSize / 2;
        maskCtx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';

        if (brushShape === 'circle') {
            // Create radial gradient based on hardness
            const gradient = maskCtx.createRadialGradient(x, y, 0, x, y, radius);
            const opaqueStop = Math.max(0, Math.min(1, brushHardness)); // Clamp hardness [0, 1]
            
            // Gradient: Opaque center, fades to transparent based on hardness
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Center is always opaque white
            gradient.addColorStop(opaqueStop * 0.9, 'rgba(255, 255, 255, 1)'); // Point where fading starts
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Edge is transparent

            maskCtx.fillStyle = gradient; 
            maskCtx.beginPath();
            maskCtx.arc(x, y, radius, 0, Math.PI * 2, false);
            maskCtx.fill();
        } else { // brushShape === 'square'
            // Draw a solid square for now (hardness not applied)
            maskCtx.fillStyle = 'rgba(255, 255, 255, 1)';
            maskCtx.fillRect(x - radius, y - radius, brushSize, brushSize);
        }
    }

    // 绘制中 (Modified to draw connected shapes)
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !maskCtx || !lastPoint) return;
        
        const { x, y } = getCanvasCoordinates(e);
        if (x < 0 || y < 0) return; // Ignore if outside canvas bounds

        // Calculate distance and angle from the last point
        const dx = x - lastPoint.x;
        const dy = y - lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Draw shapes along the line segment to connect points smoothly
        const step = brushSize / 4; // Adjust step for density (smaller means denser)
        for (let i = 0; i < distance; i += step) {
            const currentX = lastPoint.x + Math.cos(angle) * i;
            const currentY = lastPoint.y + Math.sin(angle) * i;
            drawBrushStroke(currentX, currentY);
        }

        // Draw the final shape at the exact current mouse position
        drawBrushStroke(x, y);

        // Update the last point
        setLastPoint({ x, y });
    };

    // 结束绘制
    const stopDrawing = () => {
        if (!maskCtx) return;
        setIsDrawing(false);
        setLastPoint(null);
    };

    // 清除所有蒙版
    const clearMask = () => {
        if (!maskCtx || !maskCanvasRef.current) return;
        maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    };

    // 更新笔刷大小
    const updateBrushSize = (value: number[]) => {
        if (!maskCtx) return;
        const newSize = value[0];
        setBrushSize(newSize);
    };

    // 更新笔刷硬度
    const updateBrushHardness = (value: number[]) => {
        setBrushHardness(value[0]);
    };

    // 处理鼠标滚轮事件
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        if (!maskCtx) return;
        
        e.preventDefault(); // 阻止页面滚动
        
        const change = e.deltaY < 0 ? 1 : -1; // 根据滚轮方向确定变化量
        const newSize = Math.max(1, Math.min(50, brushSize + change)); // 限制大小在 1-50 之间
        
        setBrushSize(newSize);
    };

    // 保存蒙版
    const handleSave = () => {
        if (!maskCanvasRef.current || !bgCanvasRef.current) return;

        // 创建一个新的 canvas 用于合成最终图像
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = canvasSize.width;
        outputCanvas.height = canvasSize.height;
        const outputCtx = outputCanvas.getContext('2d');
        
        if (!outputCtx) return;

        // 首先绘制原图
        outputCtx.drawImage(bgCanvasRef.current, 0, 0);

        // 应用蒙版
        outputCtx.globalCompositeOperation = 'destination-out';
        outputCtx.drawImage(maskCanvasRef.current, 0, 0);

        // 将结果转换为 blob
        outputCanvas.toBlob(async (blob) => {
            if (!blob) return;

            try {
                const formData = new FormData();
                formData.append('mask', blob);

                const response = await fetch('/api/save-mask', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('蒙版已成功保存到本地');
                    onSave(blob, data.filePath);
                } else {
                    console.error('保存蒙版失败');
                }
            } catch (error) {
                console.error('Error saving mask:', error);
            }
        }, 'image/png');
    };

    // 更新光标位置
    const updateCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = maskCanvasRef.current;
        const cursor = cursorRef.current;
        if (!canvas || !cursor) return;

        const { cursorX, cursorY, isInRenderArea } = getCanvasAndCursorPosition(e);
        
        // 只在渲染区域内显示光标
        if (isInRenderArea) {
            cursor.style.display = 'block';
            setCursorPos({
                x: cursorX,
                y: cursorY
            });
        } else {
            cursor.style.display = 'none';
        }
    };

    // 处理鼠标移动
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        updateCursor(e);
        if (isDrawing) {
            draw(e);
        }
    };

    // 处理鼠标进入/离开画布
    const handleMouseEnter = (e: React.MouseEvent<HTMLCanvasElement>) => {
        updateCursor(e);
    };

    const handleMouseLeave = () => {
        if (cursorRef.current) {
            cursorRef.current.style.display = 'none';
        }
        stopDrawing();
    };

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        width: '100%',
        height: `${canvasSize.height}px`,
        maxHeight: '70vh',
    };

    const canvasStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    };

    const cursorStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${cursorPos.x}px`,  // 直接使用像素值
        top: `${cursorPos.y}px`,   // 直接使用像素值
        width: `${brushSize}px`,
        height: `${brushSize}px`,
        borderRadius: brushShape === 'circle' ? '50%' : '0%',
        border: '1px solid #000',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',  // 居中光标
        zIndex: 10,
    };

    return (
        <div className="flex flex-col h-[85vh]">
            <div className="flex flex-row gap-4 flex-grow">
                <div className="flex flex-col gap-2 p-2 border-r w-16 items-center">
                    <Button
                        type="button"
                        variant={!isEraser ? "secondary" : "outline"}
                        size="icon"
                        onClick={() => setIsEraser(false)}
                        title="画笔"
                    >
                        <Paintbrush className="size-5" />
                    </Button>
                    <Button
                        type="button"
                        variant={isEraser ? "secondary" : "outline"}
                        size="icon"
                        onClick={() => setIsEraser(true)}
                        title="橡皮擦"
                    >
                        <Eraser className="size-5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setBrushShape(prev => prev === 'circle' ? 'square' : 'circle')}
                        title={brushShape === 'circle' ? '切换为方形笔刷' : '切换为圆形笔刷'}
                    >
                        {brushShape === 'circle' ? <Square className="size-5" /> : <Circle className="size-5" />}
                    </Button>
                </div>
                <div className="flex flex-col flex-grow gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
                        <div className="flex items-center flex-wrap gap-y-2 gap-x-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm whitespace-nowrap">大小:</span>
                                <Slider
                                    value={[brushSize]}
                                    onValueChange={updateBrushSize}
                                    min={1}
                                    max={50}
                                    step={1}
                                    className="w-[120px]"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm whitespace-nowrap">硬度:</span>
                                <Slider
                                    value={[brushHardness]}
                                    onValueChange={updateBrushHardness}
                                    min={0.1}
                                    max={1.0}
                                    step={0.05}
                                    className="w-[120px]"
                                />
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={clearMask}
                        >
                            <Trash className="size-5 mr-2" />
                            清除
                        </Button>
                    </div>
                    <div ref={containerRef} className="relative border rounded-lg overflow-hidden flex-grow" style={containerStyle}>
                        <canvas
                            ref={bgCanvasRef}
                            style={canvasStyle}
                        />
                        <canvas
                            ref={maskCanvasRef}
                            style={{...canvasStyle, cursor: 'none'}}
                            onMouseDown={startDrawing}
                            onMouseMove={handleMouseMove}
                            onMouseUp={stopDrawing}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            onWheel={handleWheel}
                        />
                        <div
                            ref={cursorRef}
                            style={cursorStyle}
                        />
                    </div>
                </div>
            </div>
            <div className="flex justify-end items-center pt-4 border-t mt-4 gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                >
                    取消
                </Button>
                <Button
                    type="button"
                    variant="default"
                    onClick={handleSave}
                >
                    <Save className="size-5 mr-2" />
                    保存
                </Button>
            </div>
        </div>
    );
}