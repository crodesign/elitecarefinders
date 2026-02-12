"use client";

import { useState, useEffect } from "react";
import { X, Copy, Trash2, Loader2, Check } from "lucide-react";
import type { MediaItem, MediaFolder } from "@/types";

interface MediaDetailPanelProps {
    item: MediaItem | null;
    folders: MediaFolder[];
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<MediaItem>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export function MediaDetailPanel({
    item,
    folders,
    isOpen,
    onClose,
    onUpdate,
    onDelete,
}: MediaDetailPanelProps) {
    const [altText, setAltText] = useState("");
    const [folderId, setFolderId] = useState<string | undefined>();
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (item) {
            setAltText(item.altText || "");
            setFolderId(item.folderId);
        }
    }, [item]);

    const handleSave = async () => {
        if (!item) return;
        setIsSaving(true);
        try {
            await onUpdate(item.id, {
                altText,
                folderId,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!item || !confirm("Are you sure you want to delete this media item?")) return;
        setIsDeleting(true);
        try {
            await onDelete(item.id);
            onClose();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCopyUrl = () => {
        if (item) {
            navigator.clipboard.writeText(item.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const flattenFolders = (folders: MediaFolder[], depth = 0): { folder: MediaFolder; depth: number }[] => {
        const result: { folder: MediaFolder; depth: number }[] = [];
        folders.forEach((folder) => {
            result.push({ folder, depth });
            if (folder.children && folder.children.length > 0) {
                result.push(...flattenFolders(folder.children, depth + 1));
            }
        });
        return result;
    };

    if (!isOpen || !item) return null;

    const isImage = item.mimeType.startsWith("image/");
    const flatFolders = flattenFolders(folders);

    return (
        <div className="fixed top-14 md:top-0 inset-x-0 bottom-0 z-[55]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="absolute right-0 top-0 h-full w-full md:w-[520px] bg-[#0b1115] border-l border-white/5 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex-none flex items-center justify-between p-4 border-b border-white/5">
                    <h2 className="text-lg font-semibold text-white">Media Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Preview */}
                    <div className="bg-black/30 rounded-xl overflow-hidden">
                        {isImage ? (
                            <img
                                src={item.url}
                                alt={item.altText || item.filename}
                                className="w-full max-h-64 object-contain"
                            />
                        ) : (
                            <div className="w-full h-40 flex items-center justify-center text-zinc-500">
                                <span className="text-lg">{item.mimeType}</span>
                            </div>
                        )}
                    </div>

                    {/* File info */}
                    <div className="bg-white/5 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Filename</span>
                            <span className="text-white">{item.originalFilename}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Size</span>
                            <span className="text-white">{formatFileSize(item.fileSize)}</span>
                        </div>
                        {item.width && item.height && (
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Dimensions</span>
                                <span className="text-white">{item.width} × {item.height}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-zinc-500">Type</span>
                            <span className="text-white">{item.mimeType}</span>
                        </div>
                    </div>

                    {/* URL */}
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={item.url}
                                readOnly
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-400"
                            />
                            <button
                                onClick={handleCopyUrl}
                                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Alt Text (used as caption/title on display) */}
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Alt Text / Caption</label>
                        <input
                            type="text"
                            value={altText}
                            onChange={(e) => setAltText(e.target.value)}
                            placeholder="Describe the image (used for accessibility and captions)"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-accent/50"
                        />
                    </div>

                    {/* Folder */}
                    <div>
                        <label className="block text-sm text-zinc-400 mb-2">Folder</label>
                        <select
                            value={folderId || ""}
                            onChange={(e) => setFolderId(e.target.value || undefined)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent/50"
                        >
                            <option value="" className="bg-[#0b1115]">No folder</option>
                            {flatFolders.map(({ folder, depth }) => (
                                <option key={folder.id} value={folder.id} className="bg-[#0b1115]">
                                    {"—".repeat(depth)} {folder.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="flex-none flex items-center justify-between p-4 border-t border-white/5">
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Delete
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50"
                    >
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
