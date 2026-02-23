"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useUnsavedChangesSafe } from "@/contexts/UnsavedChangesContext";

interface SlidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: React.ReactNode;
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
    /** Optional className override for the content area (default: "flex-1 overflow-y-auto p-6") */
    contentClassName?: string;
    /** Z-index stack level for nested panels. 0 = z-54/55 (default), 1 = z-58/59, 2 = z-62/63 */
    stackLevel?: number;
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
    contentClassName,
    stackLevel = 0,
}: SlidePanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const { collapsed: sidebarCollapsed } = useSidebar();
    const unsavedContext = useUnsavedChangesSafe();
    const handleAction = unsavedContext?.handleAction || ((action: () => void) => action());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const backdropZ = 54 + stackLevel * 4;
    const panelZ = 55 + stackLevel * 4;

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                handleAction(onClose);
            }
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose, handleAction]);

    // Handle clicks on sidebar / header to close panel
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (!isOpen || !closeOnOverlayClick) return;
            const target = e.target as HTMLElement;

            const isSidebar = target.closest('#admin-sidebar') || target.closest('#admin-mobile-header');
            const isInteractive = target.closest('a') || target.closest('button') || target.closest('input') || target.closest('select');

            if (isSidebar && !isInteractive) {
                handleAction(onClose);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isOpen, closeOnOverlayClick, onClose, handleAction]);

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

    if (!mounted || !isOpen) return null;

    // Determine left position based on sidebar state
    const sidebarLeftClass = sidebarCollapsed ? "md:left-20" : "md:left-64";
    const shouldOffset = fullScreen || offsetSidebar;

    return createPortal(
        <>
            {/* Backdrop - Always full screen and independent of panel positioning */}
            {showOverlay && isOpen && (
                <div
                    className={`fixed inset-0 backdrop-blur-sm transition-opacity ${closeOnOverlayClick ? 'cursor-pointer' : 'cursor-default'}`}
                    style={{ zIndex: backdropZ, backgroundColor: 'var(--glass-overlay)' }}
                    onClick={closeOnOverlayClick ? () => handleAction(onClose) : undefined}
                />
            )}

            {/* Panel Wrapper */}
            <div
                className={`fixed bottom-0 transition-all duration-300 pointer-events-none ${shouldOffset
                    ? `top-14 md:top-0 right-0 left-0 ${sidebarLeftClass}`
                    : "top-14 md:top-0 inset-x-0"
                    }`}
                style={{ zIndex: panelZ }}
            >
                {/* Panel - full width on mobile, fixed width on md+ */}
                <div
                    ref={panelRef}
                    className="slide-panel absolute right-0 top-0 h-full w-full bg-surface-secondary shadow-2xl flex flex-col transform transition-transform duration-300 ease-out pointer-events-auto border-l-2"
                    style={{
                        animation: "slideInFromRight 0.3s ease-out",
                        "--panel-width": fullScreen ? "100%" : `${width}px`,
                        borderColor: "var(--surface-tab-border)",
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
                    <div className={`flex-none relative z-20 w-full shrink-0 px-6 pt-6 ${headerChildren ? 'pb-0' : 'pb-6'}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-content-primary">{title}</h2>
                                {subtitle && (
                                    <p className="text-sm text-content-secondary mt-1">{subtitle}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {actions}
                                <button
                                    onClick={() => handleAction(onClose)}
                                    className="p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Header Content */}
                    {headerChildren && (
                        <div className="flex-none relative z-20 w-full shrink-0 overflow-hidden">
                            {headerChildren}
                        </div>
                    )}

                    {/* Content */}
                    <div className={contentClassName ?? "flex-1 overflow-y-auto p-6"}>
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
        </>,
        document.body
    );
}
