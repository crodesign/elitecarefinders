import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    isDangerous?: boolean;
    isLoading?: boolean;
    customActions?: React.ReactNode;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isDangerous = false,
    isLoading = false,
    customActions,
}: ConfirmationModalProps) {
    // ... (existing code)

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isOpen && e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    if (!mounted || !isOpen) return null;

    // Use portal to render at body level
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 backdrop-blur-sm transition-opacity"
                style={{ backgroundColor: 'var(--glass-overlay)' }}
                onClick={isLoading ? undefined : onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-surface-secondary rounded-xl shadow-2xl p-6 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-4 right-4 text-content-secondary hover:text-content-primary transition-colors disabled:opacity-50"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isDangerous ? "bg-red-500/10 text-red-500" : "bg-accent/10 text-accent"}`}>
                        <AlertTriangle className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                        <h3 className="text-lg font-semibold text-content-primary mb-2">{title}</h3>
                        <div className="text-sm text-content-secondary">
                            {message}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6">
                    {customActions ? (
                        customActions
                    ) : (
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${isDangerous
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-accent hover:bg-accent/90"
                                    }`}
                            >
                                {isLoading && (
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}
                                {confirmLabel}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
