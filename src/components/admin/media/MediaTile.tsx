"use client";

import { useState, useEffect } from "react";
import { Loader2, Copy, Trash2, X, Pencil, CheckSquare, Square } from "lucide-react";
import type { MediaFolder, MediaItem } from "@/types";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

// Folders that cannot have files uploaded directly to them (only subfolders allowed)
const RESTRICTED_PARENT_FOLDERS = ["Home Images", "Facility Images"];

// Check if current folder is restricted for uploads
const isRestrictedFolder = (folder: MediaFolder | null): boolean => {
    if (!folder) return true; // Root is restricted
    // Check if it's a top-level folder with a restricted name
    return !folder.parentId && RESTRICTED_PARENT_FOLDERS.includes(folder.name);
};

interface MediaTileProps {
    item: MediaItem;
    isSelected: boolean;
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
    captionClassName?: string;
}

export function MediaTile({
    item,
    isSelected,
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
    captionClassName = 'bg-[var(--media-caption-bg)] text-[var(--text-primary)]',
}: MediaTileProps) {
    const [caption, setCaption] = useState(item.altText || "");
    const [folderId, setFolderId] = useState<string | null>(item.folderId || null);
    const [isSaving, setIsSaving] = useState(false);
    const [folderSearch, setFolderSearch] = useState("");
    const [showFolderDropdown, setShowFolderDropdown] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

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

    return (
        <div className={`flex flex-col rounded-xl transition-all ${isSelected && !onMediaSelect ? "ring-2 ring-accent overflow-visible" : "overflow-hidden"}`}>
            {/* Image container */}
            <div className="relative w-full aspect-square bg-surface-input rounded-t-xl overflow-hidden">
                {item.mimeType.startsWith("image/") ? (
                    <img
                        src={item.url}
                        alt={item.altText || item.filename}
                        className={`w-full h-full object-cover transition-opacity ${isSelected && onMediaSelect ? "opacity-50" : "opacity-100"}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-content-muted">
                        <span className="text-sm">{item.mimeType.split("/")[1]}</span>
                    </div>
                )}

                {/* Image info overlay in top left */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    {showDimensions && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-[var(--media-dim-label-bg)] text-[var(--media-dim-label-text)] shadow-sm text-[10px] flex items-center gap-1.5 backdrop-blur-md">
                            {item.width && item.height && (
                                <span>{item.width}×{item.height}</span>
                            )}
                            <span className="uppercase font-medium">{item.mimeType.split("/")[1]}</span>
                        </div>
                    )}
                    {isFeaturedImage && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-[#239ddb] text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-white"></span>
                            Featured Image
                        </div>
                    )}
                    {isGalleryImage && !isFeaturedImage && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-emerald-500/90 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
                            <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span>
                            In Gallery
                        </div>
                    )}
                </div>

                {/* Edit/Close button in upper right - or checkbox in bulk/selection mode */}
                {(isBulkSelectMode || onMediaSelect) ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onMediaSelect) {
                                onMediaSelect(item);
                            } else if (onToggleBulkSelect) {
                                onToggleBulkSelect();
                            }
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${isSelected || isBulkSelected
                            ? "bg-accent text-white"
                            : onMediaSelect
                                ? "bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] hover:bg-[var(--media-edit-btn-hover-bg)]"
                                : "bg-surface-secondary/80 text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                            }`}
                    >
                        {(isSelected || isBulkSelected) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleTileClick}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg shadow-sm backdrop-blur-sm transition-all ${isSelected
                            ? "bg-accent text-white"
                            : "bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] hover:bg-accent hover:text-white"
                            }`}
                    >
                        {isSelected ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </button>
                )}
            </div>

            {/* Caption and edit fields container */}
            <div className={`p-3 ${captionClassName} ${isSelected && !onMediaSelect ? "space-y-2 rounded-b-xl" : ""}`}>
                {/* Caption row */}
                <div className="flex items-center gap-2">
                    {isSelected && !onMediaSelect && (
                        <label className="text-xs text-content-muted flex-shrink-0 w-12">Caption</label>
                    )}
                    <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add caption..."
                        className={`flex-1 min-w-0 text-sm text-content-primary placeholder-content-muted focus:outline-none focus:bg-surface-input focus:ring-1 focus:ring-accent rounded-md px-1.5 transition-colors ${isSelected && !onMediaSelect
                            ? "bg-surface-input py-1.5"
                            : "bg-transparent py-0"
                            }`}
                    />
                    {/* Only show Save button when NOT in edit mode and has changes */}
                    {(!isSelected || onMediaSelect) && captionChanged && (
                        <button
                            type="button"
                            onClick={handleSaveCaptionOnly}
                            disabled={isSaving}
                            className="flex-shrink-0 px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light transition-colors disabled:opacity-50"
                            title="Save caption (Enter)"
                        >
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </button>
                    )}
                </div>

                {/* Edit fields - only when selected AND NOT in selection mode */}
                {isSelected && !onMediaSelect && (
                    <>
                        {/* URL row */}
                        {showUrlField && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-content-muted flex-shrink-0 w-12">URL</label>
                                <input
                                    type="text"
                                    value={item.url}
                                    readOnly
                                    className="flex-1 min-w-0 bg-surface-input rounded px-2 py-1.5 text-xs text-content-muted truncate"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(item.url);
                                    }}
                                    className="flex-shrink-0 px-2 py-1.5 bg-surface-input border border-ui-border rounded text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors"
                                    title="Copy URL"
                                >
                                    <Copy className="h-3 w-3" />
                                </button>
                            </div>
                        )}

                        {/* Folder row - searchable dropdown */}
                        {showFolderMove && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-content-muted flex-shrink-0 w-12">Folder</label>
                                <div className="flex-1 min-w-0 relative">
                                    <input
                                        type="text"
                                        value={showFolderDropdown ? folderSearch : currentFolderName}
                                        onChange={(e) => {
                                            setFolderSearch(e.target.value);
                                            setShowFolderDropdown(true);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onFocus={() => {
                                            setFolderSearch("");
                                            setShowFolderDropdown(true);
                                        }}
                                        onBlur={() => {
                                            // Delay to allow click on dropdown item
                                            setTimeout(() => setShowFolderDropdown(false), 150);
                                        }}
                                        placeholder="Search folders..."
                                        className="w-full rounded px-2 py-1.5 text-xs focus:outline-none bg-surface-input text-content-primary"
                                    />
                                    {showFolderDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-secondary rounded shadow-lg max-h-40 overflow-auto z-50">
                                            <button
                                                type="button"
                                                // Use onMouseDown to prevent blur from closing dropdown before click registers
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // Prevent focus loss
                                                    setFolderId(null);
                                                    setShowFolderDropdown(false);
                                                    setFolderSearch("");
                                                }}
                                                className="w-full text-left px-2 py-1.5 text-xs text-content-muted hover:bg-surface-hover hover:text-content-primary"
                                            >
                                                No folder
                                            </button>
                                            {filteredFolders.map(({ folder, depth }) => {
                                                const isRestricted = isRestrictedFolder(folder);
                                                return (
                                                    <button
                                                        key={folder.id}
                                                        type="button"
                                                        disabled={isRestricted}
                                                        // Use onMouseDown to prevent blur from closing dropdown before click registers
                                                        onMouseDown={(e) => {
                                                            if (isRestricted) return;
                                                            e.preventDefault(); // Prevent focus loss
                                                            setFolderId(folder.id);
                                                            setShowFolderDropdown(false);
                                                            setFolderSearch("");
                                                        }}
                                                        className={`w-full text-left px-2 py-1.5 text-xs flex items-center justify-between group ${isRestricted
                                                            ? "text-content-muted opacity-50 cursor-not-allowed"
                                                            : "text-content-primary hover:bg-surface-hover"
                                                            }`}
                                                    >
                                                        <span>{"—".repeat(depth)} {folder.name}</span>
                                                        {isRestricted && (
                                                            <span className="text-[10px] text-content-muted group-hover:text-content-secondary">(Restricted)</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Actions row */}
                        <div className="flex items-center justify-between pt-2 border-t border-ui-border">
                            <button
                                type="button"
                                onClick={() => onDelete(item.id)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-3 py-1.5 text-xs text-content-muted hover:text-content-primary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveClick}
                                    disabled={isSaving || !hasChanges}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-white font-medium rounded hover:bg-accent-light transition-colors disabled:opacity-50"
                                >
                                    {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Save
                                </button>
                            </div>
                        </div>

                        {showFolderMove && (
                            <ConfirmationModal
                                isOpen={showConfirmModal}
                                onClose={handleCancelSave}
                                onConfirm={handleSaveConfirmed}
                                title="Move File?"
                                message={
                                    <div>
                                        <p>Are you sure you want to move this file to <strong>{currentFolderName || "the root folder"}</strong>?</p>
                                        <p className="mt-2 text-content-muted text-xs">This will physically relocate the file on the server and update all database references.</p>
                                    </div>
                                }
                                confirmLabel="Move File"
                                isLoading={isSaving}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}




