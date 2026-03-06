"use client";

import { useState, useEffect } from "react";
import { Loader2, Copy, Trash2, X, CheckSquare, Square } from "lucide-react";
import type { MediaFolder, MediaItem } from "@/types";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

// Folders that cannot have files uploaded directly to them (only subfolders allowed)
const RESTRICTED_PARENT_FOLDERS = ["Home Images", "Facility Images"];

const MIME_TO_EXT: Record<string, string> = {
    "image/svg+xml": "svg",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/avif": "avif",
};

function getFileExt(filename: string | null | undefined, mimeType: string | null | undefined): string {
    if (filename) {
        const dot = filename.lastIndexOf(".");
        if (dot !== -1 && dot < filename.length - 1) {
            return filename.slice(dot + 1).toLowerCase();
        }
    }
    if (mimeType) {
        return MIME_TO_EXT[mimeType] ?? mimeType.split("/").pop() ?? "";
    }
    return "";
}

// Check if current folder is restricted for uploads
const isRestrictedFolder = (folder: MediaFolder | null): boolean => {
    if (!folder) return true; // Root is restricted
    // Check if it's a top-level folder with a restricted name
    return !folder.parentId && RESTRICTED_PARENT_FOLDERS.includes(folder.name);
};

interface MediaTileProps {
    item: MediaItem;
    isSelected: boolean;
    isEditMode?: boolean;
    folders: MediaFolder[];
    onClick: () => void;
    onUpdate: (id: string, updates: Partial<MediaItem>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onClose: () => void;
    isBulkSelectMode?: boolean;
    isBulkSelected?: boolean;
    onToggleBulkSelect?: () => void;
    showUrlField?: boolean;
    showFolderMove?: boolean;
    showDimensions?: boolean;
    onMediaSelect?: (item: MediaItem) => void;
    isGalleryImage?: boolean;
    isFeaturedImage?: boolean;
    stepLabel?: string;

}

export function MediaTile({
    item,
    isSelected,
    isEditMode = false,
    folders,
    onClick,
    onUpdate,
    onDelete,
    onClose,
    isBulkSelectMode = false,
    isBulkSelected = false,
    onToggleBulkSelect,
    showUrlField = true,
    showFolderMove = true,
    showDimensions = true,
    onMediaSelect,
    isGalleryImage = false,
    isFeaturedImage = false,
    stepLabel,

}: MediaTileProps) {
    const [caption, setCaption] = useState(item.altText || "");
    const [folderId, setFolderId] = useState<string | null>(item.folderId || null);
    const [isSaving, setIsSaving] = useState(false);
    const [liveDims, setLiveDims] = useState<{ w: number; h: number } | null>(null);
    const [folderSearch, setFolderSearch] = useState("");
    const [showFolderDropdown, setShowFolderDropdown] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Sync local state when item changes (fixes stale state issues)
    useEffect(() => {
        setCaption(item.altText || "");
        setFolderId(item.folderId || null);
    }, [item]);

    // Check if caption or folder has changed
    const captionChanged = caption !== (item.altText || "");
    const folderChanged = folderId !== (item.folderId || null);
    const hasChanges = captionChanged || folderChanged;

    const handleSaveClick = () => {
        if (!hasChanges) {
            onClose();
            return;
        }

        // Show confirmation modal only for folder changes
        if (folderChanged && showFolderMove) {
            setShowConfirmModal(true);
        } else {
            // If only caption changed, save immediately
            handleSaveConfirmed();
        }
    };

    const handleSaveConfirmed = async () => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/media/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mediaId: item.id,
                    newFolderId: folderChanged && showFolderMove ? folderId : undefined,
                    altText: captionChanged ? caption : undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Update failed");
            }

            // Refresh the media list with the updated item
            await onUpdate(item.id, result.item);
            onClose();
        } catch (error) {
            console.error("Save error:", error);
            alert("Failed to save changes: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsSaving(false);
            setShowConfirmModal(false);
        }
    };

    const handleCancelSave = () => {
        setShowConfirmModal(false);
        // Reset folder selection to original
        setFolderId(item.folderId || null);
    };

    const handleSaveCaptionOnly = async () => {
        if (!captionChanged) return;
        setIsSaving(true);
        try {
            const response = await fetch("/api/media/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mediaId: item.id,
                    altText: caption,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Update failed");
            }

            // Refresh the media list with updated item
            await onUpdate(item.id, result.item);

            // Blur the active element to remove cursor
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        } catch (error) {
            console.error("Save error:", error);
        }
        setIsSaving(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && captionChanged) {
            e.preventDefault();
            handleSaveCaptionOnly();
        }
    };

    const handleTileClick = () => {
        if (onMediaSelect) {
            onMediaSelect(item);
        } else {
            onClick();
        }
    };

    // Flatten folders for the dropdown
    const flattenFolders = (folderList: MediaFolder[], depth = 0): { folder: MediaFolder; depth: number }[] => {
        const result: { folder: MediaFolder; depth: number }[] = [];
        folderList.forEach((folder) => {
            result.push({ folder, depth });
            if (folder.children && folder.children.length > 0) {
                result.push(...flattenFolders(folder.children, depth + 1));
            }
        });
        return result;
    };

    const flatFolders = flattenFolders(folders);

    // Filter folders based on search
    const filteredFolders = flatFolders.filter(({ folder }) =>
        folder.name.toLowerCase().includes(folderSearch.toLowerCase())
    );

    // Get current folder name based on local state
    const currentFolder = flatFolders.find(({ folder }) => folder.id === folderId);
    const currentFolderName = currentFolder ? currentFolder.folder.name : "";

    // Edit panel is open when: library mode tile is selected, OR gallery mode explicitly editing
    const showEditPanel = isEditMode || (isSelected && !onMediaSelect);

    return (
        <div className="rounded-xl overflow-hidden group">
            {/* Image container */}
            <div className="relative w-full aspect-square bg-surface-input rounded-xl overflow-hidden">
                {item.mimeType.startsWith("image/") ? (
                    <>
                        <img
                            src={item.urlMedium || item.url}
                            alt={item.altText || item.filename}
                            className={`w-full h-full ${item.mimeType === 'image/svg+xml' ? 'object-contain p-1' : 'object-cover'} transition-opacity ${isSelected && onMediaSelect ? "opacity-50" : "opacity-100"}`}
                        />
                        {item.mimeType !== 'image/svg+xml' && (item.width == null || item.height == null) && (
                            <img
                                src={item.url}
                                alt=""
                                className="hidden"
                                onLoad={(e) => setLiveDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                            />
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-content-muted">
                        <span className="text-sm uppercase">{getFileExt(item.filename, item.mimeType) || "file"}</span>
                    </div>
                )}

                {/* Image info overlay in top left */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    {showDimensions && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-[var(--media-dim-label-bg)] text-[var(--media-dim-label-text)] shadow-sm text-[10px] flex items-center gap-1.5 backdrop-blur-md">
                            {(() => {
                                const w = liveDims?.w ?? item.width;
                                const h = liveDims?.h ?? item.height;
                                return w != null && h != null && w > 0 && h > 0
                                    ? <span>{w}×{h}</span>
                                    : null;
                            })()}
                            <span className="uppercase font-medium">{getFileExt(item.filename, item.mimeType) || "img"}</span>
                        </div>
                    )}
                    {isFeaturedImage && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-[#239ddb] text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-white"></span>
                            Featured Image
                        </div>
                    )}
                    {stepLabel && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-amber-500/90 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-white"></span>
                            {stepLabel}
                        </div>
                    )}
                    {isGalleryImage && !isFeaturedImage && !stepLabel && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-emerald-500/90 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                            In Gallery
                        </div>
                    )}
                </div>

                {/* Top-right: context-sensitive action buttons */}
                {isBulkSelectMode ? (
                    // Bulk select mode: single checkbox
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleBulkSelect?.(); }}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${isBulkSelected
                            ? "bg-accent text-white"
                            : "bg-surface-secondary/80 text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                            }`}
                    >
                        {isBulkSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                ) : onMediaSelect ? (
                    // Gallery mode: stacked select checkbox + edit pencil
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onMediaSelect(item); }}
                            className={`p-1.5 rounded-lg transition-all ${isSelected
                                ? "bg-accent text-white"
                                : "bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] hover:bg-[var(--media-edit-btn-hover-bg)]"
                                }`}
                        >
                            {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                            className="p-1.5 rounded-lg shadow-sm backdrop-blur-md bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] opacity-50 group-hover:opacity-100 hover:bg-[var(--media-edit-btn-hover-bg)] hover:text-red-500 transition-all cursor-pointer"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    // Library/Gallery mode: single delete button
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg shadow-sm backdrop-blur-md bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] opacity-50 group-hover:opacity-100 hover:bg-[var(--media-edit-btn-hover-bg)] hover:text-red-500 transition-all cursor-pointer"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}

                {/* URL Overlay */}
                <div className="absolute bottom-10 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--media-edit-btn-bg)]/50 text-[var(--media-edit-btn-text)]">
                        <span className="text-[9px] uppercase font-black opacity-30 shrink-0">URL</span>
                        <span className="flex-1 text-[10px] truncate font-mono font-medium opacity-60">{item.url}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(item.url);
                            }}
                            className="flex-shrink-0 p-1 opacity-40 hover:opacity-100 transition-all ml-1"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                    </div>
                </div>
                {/* Caption overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="relative rounded-lg ring-1 ring-black/10 dark:ring-white/10 focus-within:ring-2 focus-within:ring-accent/60 bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] backdrop-blur-md">
                        <input
                            type="text"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Add caption..."
                            className={`w-full text-xs bg-transparent outline-none placeholder:opacity-40 font-medium rounded-lg px-2 py-1.5 ${captionChanged ? 'pr-12' : ''}`}
                        />
                        {captionChanged && (
                            <button
                                type="button"
                                onClick={handleSaveCaptionOnly}
                                disabled={isSaving}
                                className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] bg-accent text-white rounded-md hover:bg-accent-light transition-colors disabled:opacity-50 font-medium"
                            >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={() => { setShowDeleteModal(false); onDelete(item.id); }}
                title="Delete Image"
                message={
                    <div className="space-y-3">
                        <p>Are you sure you want to permanently delete <strong>&quot;{item.filename}&quot;</strong>? This will remove the physical file from the server and cannot be undone.</p>

                        {(isGalleryImage || isFeaturedImage || stepLabel) && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-200 text-sm font-medium flex items-center gap-2">
                                    <span className="text-lg">⚠️</span> Warning: Image in Use
                                </p>
                                <p className="mt-1 text-red-300/80 text-xs pl-7">
                                    This image is currently displayed in a gallery or featured slot. Deleting it will result in a broken image on the site.
                                </p>
                            </div>
                        )}
                    </div>
                }
                confirmLabel="Delete Permanently"
                cancelLabel="Cancel"
                isDangerous={true}
            />
        </div>
    );
}




