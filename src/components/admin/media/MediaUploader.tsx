"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface UploadProgress {
    file: File;
    progress: number;
    status: "pending" | "uploading" | "complete" | "error";
    error?: string;
}

interface MediaUploaderProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => Promise<void>;
    folderName?: string;
    hideCloseButton?: boolean;
}

export function MediaUploader({ isOpen, onClose, onUpload, folderName, hideCloseButton = false }: MediaUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFiles(files);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            handleFiles(files);
        }
    };

    const handleFiles = async (files: File[]) => {
        const newUploads: UploadProgress[] = files.map((file) => ({
            file,
            progress: 0,
            status: "pending",
        }));

        setUploads((prev) => [...prev, ...newUploads]);
        setIsUploading(true);

        try {
            // Update status to uploading
            setUploads((prev) =>
                prev.map((u) =>
                    files.includes(u.file) ? { ...u, status: "uploading" as const } : u
                )
            );

            await onUpload(files);

            // Mark all as complete
            setUploads((prev) =>
                prev.map((u) =>
                    files.includes(u.file) ? { ...u, status: "complete" as const, progress: 100 } : u
                )
            );
        } catch (error) {
            setUploads((prev) =>
                prev.map((u) =>
                    files.includes(u.file)
                        ? { ...u, status: "error" as const, error: error instanceof Error ? error.message : "Upload failed" }
                        : u
                )
            );
        } finally {
            setIsUploading(false);
        }
    };

    const clearCompleted = () => {
        setUploads((prev) => prev.filter((u) => u.status !== "complete"));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!isOpen) return null;

    return (
        <div className="border-b border-ui-border bg-surface-secondary">
            <div className="p-4">
                {/* Drop zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                        ? "border-accent bg-accent/10"
                        : "border-ui-border hover:border-accent/30 hover:bg-surface-input"
                        }`}
                >
                    {/* Close button - inside drop zone top-right */}
                    {!hideCloseButton && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            disabled={isUploading}
                            className="absolute top-2 right-2 p-1.5 text-content-muted hover:text-content-primary bg-surface-input hover:bg-surface-hover rounded-full transition-all z-10"
                            title="Close uploader"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? "text-accent" : "text-content-muted"}`} />
                    <p className="text-content-primary font-medium">
                        {isDragging ? "Drop images here" : `Drag & drop images for ${folderName || "this folder"} here`}
                    </p>
                </div>

                {/* Upload progress list */}
                {uploads.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-content-muted">
                                {uploads.filter((u) => u.status === "complete").length} of {uploads.length} complete
                            </span>
                            {uploads.some((u) => u.status === "complete") && (
                                <button
                                    onClick={clearCompleted}
                                    className="text-xs text-accent hover:text-accent-light"
                                >
                                    Clear completed
                                </button>
                            )}
                        </div>

                        {uploads.map((upload, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-3 p-2 bg-surface-input rounded-lg"
                            >
                                {/* Status icon */}
                                {upload.status === "uploading" && (
                                    <Loader2 className="h-4 w-4 text-accent animate-spin flex-shrink-0" />
                                )}
                                {upload.status === "complete" && (
                                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                )}
                                {upload.status === "error" && (
                                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                )}
                                {upload.status === "pending" && (
                                    <div className="h-4 w-4 rounded-full border-2 border-ui-border flex-shrink-0" />
                                )}

                                {/* File info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-content-primary truncate">{upload.file.name}</p>
                                    <p className="text-xs text-content-muted">
                                        {formatFileSize(upload.file.size)}
                                        {upload.error && (
                                            <span className="text-red-400 ml-2">{upload.error}</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

