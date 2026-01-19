"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface SlidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    width?: string;
}

export function SlidePanel({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    width = "w-[480px]",
}: SlidePanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed top-14 md:top-0 inset-x-0 bottom-0 z-[55]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="absolute right-0 top-0 h-full w-full md:w-[480px] bg-[#0b1115] border-l border-white/5 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out"
                style={{
                    animation: "slideInFromRight 0.3s ease-out",
                }}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-white/5">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            {subtitle && (
                                <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </div>

            <style jsx global>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
        </div>
    );
}
