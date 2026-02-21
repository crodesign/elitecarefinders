"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropModalProps {
    isOpen: boolean;
    imageUrl: string;
    onClose: () => void;
    onSave: (croppedImageUrl: string) => void;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export function ImageCropModal({ isOpen, imageUrl, onClose, onSave }: ImageCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: CropArea) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCroppedImage = async () => {
        if (!croppedAreaPixels) return;

        const image = new Image();
        image.src = imageUrl;

        await new Promise((resolve) => {
            image.onload = resolve;
        });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) return;

        // Set canvas size to the crop area
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // Draw the cropped image
        ctx.drawImage(
            image,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            croppedAreaPixels.width,
            croppedAreaPixels.height
        );

        // Convert to data URL
        const croppedImageUrl = canvas.toDataURL("image/jpeg", 0.9);
        onSave(croppedImageUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-96 mx-4 bg-[rgb(13,17,21)] rounded-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                    <h2 className="text-lg font-semibold text-white">Crop Profile Picture</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-white/10 transition-colors"
                    >
                        <X className="h-5 w-5 text-white/60" />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative h-96 bg-black/50">
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </div>

                {/* Zoom Controls */}
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        <ZoomOut className="h-4 w-4 text-white/60" />
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                        <ZoomIn className="h-4 w-4 text-white/60" />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 p-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={createCroppedImage}
                        className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-light text-white rounded-md transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
