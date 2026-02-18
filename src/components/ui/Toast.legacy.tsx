"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";

export interface ToastProps {
    id: string;
    title: string;
    subtitle?: string;
    duration?: number;
    onDismiss: (id: string) => void;
}

export function Toast({ id, title, subtitle, duration = 3000, onDismiss }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        // Auto-dismiss after duration
        const timer = setTimeout(() => {
            handleDismiss();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration]);

    const handleDismiss = () => {
        setIsLeaving(true);
        setTimeout(() => onDismiss(id), 200);
    };

    return (
        <div
            className={`
                flex items-start gap-3 p-4 rounded-xl
                bg-[#0b1115] border border-white/10
                shadow-xl shadow-black/50
                transform transition-all duration-200 ease-out
                ${isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
            `}
        >
            {/* Success Icon */}
            <div className="flex-shrink-0 p-1 bg-green-500/10 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{title}</p>
                {subtitle && (
                    <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>
                )}
            </div>

            {/* Dismiss Button */}
            <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-zinc-500 hover:text-white transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export interface ToastContainerProps {
    toasts: ToastProps[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col-reverse gap-2 w-80">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}
