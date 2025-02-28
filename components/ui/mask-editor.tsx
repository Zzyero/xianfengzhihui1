"use client"

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Eraser, Paintbrush, Save, Trash } from 'lucide-react';

interface MaskEditorProps {
    imageUrl: string;
    onSave: (maskData: Blob) => void;
}

export function MaskEditor({ imageUrl, onSave }: MaskEditorProps) {
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
            ctx.lineWidth = brushSize;
            
            setMaskCtx(ctx);
        };
    }, [imageUrl]);

    // 获取画布上的坐标
    const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        return { x, y };
    };

    // 开始绘制
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!maskCtx) return;
        
        setIsDrawing(true);
        const { x, y } = getCanvasCoordinates(e);
        
        maskCtx.beginPath();
        maskCtx.moveTo(x, y);
    };

    // 绘制中
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !maskCtx) return;
        
        const { x, y } = getCanvasCoordinates(e);
        maskCtx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        maskCtx.lineTo(x, y);
        maskCtx.stroke();
    };

    // 结束绘制
    const stopDrawing = () => {
        if (!maskCtx) return;
        setIsDrawing(false);
        maskCtx.closePath();
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
        maskCtx.lineWidth = newSize;
    };

    // 保存蒙版
    const handleSave = () => {
        if (!maskCanvasRef.current) return;
        maskCanvasRef.current.toBlob((blob) => {
            if (blob) {
                onSave(blob);
            }
        }, 'image/png');
    };

    // 更新光标位置
    const updateCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = maskCanvasRef.current;
        const cursor = cursorRef.current;
        if (!canvas || !cursor) return;

        const rect = canvas.getBoundingClientRect();
        setCursorPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
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
        if (cursorRef.current) {
            cursorRef.current.style.display = 'block';
        }
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
        borderRadius: '50%',
        border: '1px solid #000',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',  // 居中光标
        zIndex: 10,
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 mb-4">
                <Button
                    type="button"
                    variant={!isEraser ? "secondary" : "outline"}
                    onClick={() => setIsEraser(false)}
                >
                    <Paintbrush className="size-5 mr-2" />
                    画笔
                </Button>
                <Button
                    type="button"
                    variant={isEraser ? "secondary" : "outline"}
                    onClick={() => setIsEraser(true)}
                >
                    <Eraser className="size-5 mr-2" />
                    橡皮擦
                </Button>
                <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">笔刷大小:</span>
                    <Slider
                        value={[brushSize]}
                        onValueChange={updateBrushSize}
                        min={1}
                        max={50}
                        step={1}
                        className="w-[200px]"
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={clearMask}
                >
                    <Trash className="size-5 mr-2" />
                    清除
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
            <div ref={containerRef} className="relative border rounded-lg overflow-hidden" style={containerStyle}>
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
                />
                <div
                    ref={cursorRef}
                    style={cursorStyle}
                />
            </div>
        </div>
    );
}