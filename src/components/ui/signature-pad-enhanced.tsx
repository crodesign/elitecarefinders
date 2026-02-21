"use client";

import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { PenTool, Type, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface SignaturePadEnhancedProps {
    value?: string;
    onChange?: (signature: string) => void;
    disabled?: boolean;
    height?: number;
}

export interface SignaturePadEnhancedRef {
    clear: () => void;
    isEmpty: () => boolean;
    getSignatureData: () => string;
}

const SignaturePadEnhanced = forwardRef<SignaturePadEnhancedRef, SignaturePadEnhancedProps>(
    ({ value, onChange, disabled = false, height = 100 }, ref) => {
        const { mode: themeMode } = useTheme();
        const isLight = themeMode === 'light';
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [mode, setMode] = useState<'draw' | 'type'>('draw');
        const [typedName, setTypedName] = useState('');
        const isEmptyRef = useRef(true);
        const isDrawing = useRef(false);
        const lastPoint = useRef<{ x: number; y: number } | null>(null);

        // Size canvas correctly whenever it mounts or height changes
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const parent = canvas.parentElement;
            if (!parent) return;

            const resize = () => {
                const w = parent.getBoundingClientRect().width;
                if (w === 0) return;
                // Preserve existing drawing
                const dataUrl = !isEmptyRef.current ? canvas.toDataURL() : null;
                canvas.width = Math.floor(w);
                canvas.height = height;
                if (dataUrl) {
                    const img = new Image();
                    img.onload = () => canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    img.src = dataUrl;
                }
            };

            resize();
            const ro = new ResizeObserver(resize);
            ro.observe(parent);
            return () => ro.disconnect();
        }, [height]);

        // Load initial value into canvas
        useEffect(() => {
            if (!value || mode !== 'draw') return;
            const canvas = canvasRef.current;
            if (!canvas || canvas.width === 0) return;
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Force display color based on theme (white in dark mode, black in light mode), ignoring saved color
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const d = imageData.data;
                const targetColor = isLight ? 0 : 255;
                for (let i = 0; i < d.length; i += 4) {
                    if (d[i + 3] > 0) {
                        d[i] = targetColor;
                        d[i + 1] = targetColor;
                        d[i + 2] = targetColor;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                isEmptyRef.current = false;
            };
            img.src = value;
        }, [value, mode, isLight]);

        // --- Pointer event handlers ---
        const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current!;
            const rect = canvas.getBoundingClientRect();
            // Scale from CSS pixels to canvas pixels
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        };

        const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (disabled) return;
            e.preventDefault();
            isDrawing.current = true;
            lastPoint.current = getPos(e);
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!isDrawing.current || !lastPoint.current) return;
            e.preventDefault();
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const current = getPos(e);
            ctx.strokeStyle = isLight ? 'black' : 'white';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
            ctx.lineTo(current.x, current.y);
            ctx.stroke();
            lastPoint.current = current;
            isEmptyRef.current = false;
        };

        const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!isDrawing.current) return;
            e.preventDefault();
            isDrawing.current = false;
            lastPoint.current = null;
            const canvas = canvasRef.current;
            if (!canvas) return;

            if (!isLight) {
                // Dark mode display is white strokes, but we must save as black strokes
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const d = imageData.data;
                    for (let i = 0; i < d.length; i += 4) {
                        if (d[i + 3] > 0) {
                            d[i] = 0;
                            d[i + 1] = 0;
                            d[i + 2] = 0;
                        }
                    }
                    const offscreen = document.createElement('canvas');
                    offscreen.width = canvas.width;
                    offscreen.height = canvas.height;
                    offscreen.getContext('2d')!.putImageData(imageData, 0, 0);
                    onChange?.(offscreen.toDataURL());
                }
            } else {
                // Light mode display is already black strokes, save directly
                onChange?.(canvas.toDataURL());
            }
        };

        const handleClear = () => {
            if (mode === 'draw') {
                const canvas = canvasRef.current;
                if (canvas) {
                    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
                    isEmptyRef.current = true;
                }
            } else {
                setTypedName('');
            }
            onChange?.('');
        };

        // Generate image from typed name
        const generateImageFromText = useCallback((text: string): string => {
            if (!text.trim()) return '';
            const canvas = canvasRef.current;
            const w = canvas?.width || 600;
            const h = height;
            const offscreen = document.createElement('canvas');
            offscreen.width = w;
            offscreen.height = h;
            const ctx = offscreen.getContext('2d');
            if (!ctx) return '';
            ctx.font = `italic ${Math.floor(h * 0.4)}px 'Dancing Script', cursive`;
            ctx.fillStyle = 'black'; // Always save as black strokes
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, w / 2, h / 2);
            return offscreen.toDataURL();
        }, [height]);

        useEffect(() => {
            if (mode === 'type') onChange?.(generateImageFromText(typedName));
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [typedName, mode]);

        useImperativeHandle(ref, () => ({
            clear: handleClear,
            isEmpty: () => mode === 'draw' ? isEmptyRef.current : !typedName.trim(),
            getSignatureData: () => mode === 'draw'
                ? (canvasRef.current?.toDataURL() ?? '')
                : generateImageFromText(typedName),
        }));

        // Inject cursive font once
        useEffect(() => {
            const style = document.createElement('style');
            style.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap'); .sig-cursive { font-family: 'Dancing Script', cursive; }`;
            document.head.appendChild(style);
            return () => { document.head.removeChild(style); };
        }, []);

        return (
            <div className={cn('w-full', disabled && 'opacity-60 pointer-events-none')}>
                <Tabs value={mode} onValueChange={(v) => setMode(v as 'draw' | 'type')} className="w-full">
                    {/* Tab header */}
                    <div className="flex justify-between items-center mb-2">
                        <TabsList className={cn("inline-flex w-auto items-center rounded-lg p-1 border-0", isLight ? "bg-white" : "bg-black/30")}>
                            <TabsTrigger
                                value="draw"
                                className="flex items-center gap-1 rounded-md border-0 bg-transparent px-3 py-1.5 text-[10px] font-medium text-content-muted shadow-none transition-all hover:text-content-secondary data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                            >
                                <PenTool className="h-3 w-3" /> Draw
                            </TabsTrigger>
                            <TabsTrigger
                                value="type"
                                className="flex items-center gap-1 rounded-md border-0 bg-transparent px-3 py-1.5 text-[10px] font-medium text-content-muted shadow-none transition-all hover:text-content-secondary data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-sm"
                            >
                                <Type className="h-3 w-3" /> Type
                            </TabsTrigger>
                        </TabsList>
                        {!disabled && (
                            <Button type="button" variant="ghost" size="sm" onClick={handleClear}
                                className="text-content-muted hover:text-white hover:bg-white/10">
                                <RotateCcw className="h-4 w-4 mr-2" /> Clear
                            </Button>
                        )}
                    </div>

                    {/* Draw tab — canvas always in DOM so ResizeObserver works */}
                    <div
                        className={cn("relative rounded-lg overflow-hidden", isLight ? "bg-white" : "bg-black/30")}
                        style={{ height: `${height}px`, display: mode === 'draw' ? 'block' : 'none' }}
                    >
                        <canvas
                            ref={canvasRef}
                            style={{
                                display: 'block',
                                width: '100%',
                                height: `${height}px`,
                                cursor: disabled ? 'default' : 'crosshair',
                            }}
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerLeave={onPointerUp}
                        />
                        <div className="absolute left-4 right-4 bottom-8 border-b border-ui-border/50 pointer-events-none" />
                        <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none text-content-mutedtext-[10px] select-none">
                            Sign along the line above
                        </div>
                    </div>

                    {/* Type tab */}
                    <div
                        className={cn("relative rounded-lg overflow-hidden flex flex-col items-center justify-center", isLight ? "bg-white" : "bg-black/30")}
                        style={{ height: `${height}px`, display: mode === 'type' ? 'flex' : 'none' }}
                    >
                        <div className="w-full max-w-md px-4 space-y-3 text-center">
                            <div className="border-b border-ui-borderpb-2">
                                <span className={cn("text-4xl sig-cursive leading-normal block min-h-[52px]", isLight ? "text-black" : "text-white")}>
                                    {typedName || <span className="text-content-secondary select-none">Your Name</span>}
                                </span>
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Type your full name"
                                    value={typedName}
                                    onChange={(e) => setTypedName(e.target.value)}
                                    maxLength={40}
                                    className={cn(
                                        "w-full text-center rounded-md px-3 py-2 text-sm border outline-none",
                                        isLight
                                            ? "bg-black/5 border-ui-border text-content-primary placeholder-content-muted"
                                            : "bg-black/50 border-ui-border text-white placeholder-content-muted"
                                    )}
                                />
                                <p className="text-[10px] text-content-muted mt-1">
                                    By typing your name, you acknowledge this as your electronic signature.
                                </p>
                            </div>
                        </div>
                    </div>
                </Tabs>
            </div>
        );
    }
);

SignaturePadEnhanced.displayName = 'SignaturePadEnhanced';

export { SignaturePadEnhanced };
