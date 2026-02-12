"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";

interface SlidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    /** Width in pixels for md+ screens, full width on mobile */
    width?: number;
    /** If true, fills the main content area instead of overlaying sidebar */
    fullScreen?: boolean;
    /** If true, shows a darkened backdrop behind the panel */
    showOverlay?: boolean;
    /** If true, clicking the overlay closes the panel. Default: true */
    closeOnOverlayClick?: boolean;
    /** If true, panel starts after the sidebar (respects sidebar width) */
    offsetSidebar?: boolean;
    /** Optional content to render in the fixed header area (e.g. tabs) */
    headerChildren?: React.ReactNode;
    /** Optional actions to render in the header next to the close button */
    actions?: React.ReactNode;
}

export function SlidePanel({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    width = 480,
    fullScreen = false,
    showOverlay = true,
    closeOnOverlayClick = true,
    offsetSidebar = false,
    headerChildren,
    actions,
}: SlidePanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const { collapsed: sidebarCollapsed } = useSidebar();

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

    // Determine left position based on sidebar state
    const sidebarLeftClass = sidebarCollapsed ? "md:left-20" : "md:left-64";
    const shouldOffset = fullScreen || offsetSidebar;

    return (
        <>
            {/* Backdrop - Always full screen and independent of panel positioning */}
            {showOverlay && isOpen && (
                <div
                    className={`fixed inset-0 z-[54] bg-black/40 backdrop-blur-sm transition-opacity ${closeOnOverlayClick ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={closeOnOverlayClick ? onClose : undefined}
                />
            )}

            {/* Panel Wrapper */}
            <div className={`fixed bottom-0 z-[55] transition-all duration-300 pointer-events-none ${shouldOffset
                ? `top-14 md:top-0 right-0 left-0 ${sidebarLeftClass}`
                : "top-14 md:top-0 inset-x-0"
                }`}
            >
                {/* Panel - full width on mobile, fixed width on md+ */}
                <div
                    ref={panelRef}
                    className="slide-panel absolute right-0 top-0 h-full w-full bg-[#0b1115] border-l border-white/5 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out pointer-events-auto"
                    style={{
                        animation: "slideInFromRight 0.3s ease-out",
                        "--panel-width": fullScreen ? "100%" : `${width}px`,
                    } as React.CSSProperties}
                >
                    <style>{`
                    @media (min-width: 768px) {
                        .slide-panel {
                            width: var(--panel-width) !important;
                        }
                    }
                `}</style>
                    {/* Header */}
                    <div className={`flex-none relative z-20 w-full shrink-0 px-6 pt-6 ${headerChildren ? 'pb-0' : 'pb-6 border-b border-white/5'}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">{title}</h2>
                                {subtitle && (
                                    <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {actions}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Header Content */}
                    {headerChildren && (
                        <div className="flex-none relative z-20 w-full shrink-0 border-b border-white/5 bg-[#0b1115] pt-[15px]">
                            {headerChildren}
                        </div>
                    )}

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
        </>
    );
}
