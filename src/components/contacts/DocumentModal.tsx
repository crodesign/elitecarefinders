"use client";

import { useEffect, useState } from "react";
import { X, Download, FileImage, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { ContactDocument } from "@/lib/services/contactDocumentService";

interface DocumentModalProps {
    documents: ContactDocument[];
    initialIndex: number;
    onClose: () => void;
}

// Chrome PDF viewer params to suppress toolbar and sidepanels
const PDF_PARAMS = "#toolbar=0&navpanes=0&scrollbar=0";

// Available height inside the modal for content:
// 90vh (modal max) - header (~2.75rem) - footer (~2.25rem) - content padding (2rem) = ~7rem
const CONTENT_MAX_H = "calc(100vh - 60px - 7rem)";
const CONTENT_MAX_W = "calc(100vw - 60px - 2rem)";

export function DocumentModal({ documents, initialIndex, onClose }: DocumentModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const doc = documents[currentIndex];
    const isPdf = doc.mimeType === "application/pdf";
    const total = documents.length;

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") setCurrentIndex((i) => Math.max(0, i - 1));
            if (e.key === "ArrowRight") setCurrentIndex((i) => Math.min(total - 1, i + 1));
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose, total]);

    const handleDownload = () => {
        const a = window.document.createElement("a");
        a.href = doc.url;
        a.download = doc.originalFilename;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-[30px]"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 backdrop-blur-sm transition-opacity"
                style={{ backgroundColor: "var(--glass-overlay)" }}
            />

            {/* Modal — w-fit so it shrinks to content width */}
            <div
                className="relative z-10 bg-surface-secondary border border-ui-border rounded-xl shadow-2xl flex flex-col w-fit min-w-[340px] max-w-[calc(100vw-60px)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-ui-border flex-none gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        {isPdf
                            ? <FileText className="h-4 w-4 text-content-muted flex-none" />
                            : <FileImage className="h-4 w-4 text-content-muted flex-none" />
                        }
                        <span className="text-sm text-content-primary font-medium truncate max-w-[40ch]">{doc.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-none">
                        <button
                            onClick={handleDownload}
                            className="p-1.5 rounded-lg bg-surface-input text-content-secondary hover:bg-accent hover:text-white transition-colors"
                        >
                            <Download className="h-4 w-4" />
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-content-secondary hover:bg-surface-hover hover:text-content-primary transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-none p-4 flex items-center justify-center">
                    {isPdf ? (
                        // A4 proportions (210:297 ≈ 0.707 width/height); height fills available space
                        <iframe
                            src={`${doc.url}${PDF_PARAMS}`}
                            className="rounded block border-0"
                            style={{
                                height: CONTENT_MAX_H,
                                width: `calc(${CONTENT_MAX_H} * 0.707)`,
                                maxWidth: CONTENT_MAX_W,
                            }}
                            title={doc.title}
                        />
                    ) : (
                        <img
                            src={doc.url}
                            alt={doc.title}
                            className="rounded block object-contain"
                            style={{
                                maxHeight: CONTENT_MAX_H,
                                maxWidth: CONTENT_MAX_W,
                            }}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-ui-border flex-none">
                    <span className="text-xs text-content-muted">{currentIndex + 1} of {total}</span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                            disabled={currentIndex === 0}
                            className="p-1.5 rounded-lg bg-surface-input text-content-secondary hover:bg-accent hover:text-white transition-colors disabled:opacity-30"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                            disabled={currentIndex === total - 1}
                            className="p-1.5 rounded-lg bg-surface-input text-content-secondary hover:bg-accent hover:text-white transition-colors disabled:opacity-30"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
