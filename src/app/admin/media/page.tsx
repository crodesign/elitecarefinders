"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, ImageIcon, Loader2, Menu, X, Copy, Trash2, Check, Folder, Pencil, MoreVertical, CheckSquare, Square } from "lucide-react";
import type { MediaFolder, MediaItem } from "@/types";

// Folders that cannot have files uploaded directly to them (only subfolders allowed)
const RESTRICTED_PARENT_FOLDERS = ["Home Images", "Facility Images"];

// Check if current folder is restricted for uploads
const isRestrictedFolder = (folder: MediaFolder | null): boolean => {
    if (!folder) return true; // Root is restricted
    // Check if it's a top-level folder with a restricted name
    return !folder.parentId && RESTRICTED_PARENT_FOLDERS.includes(folder.name);
};
import { FolderTree, StateOption } from "@/components/admin/media/FolderTree";
import { supabase } from "@/lib/supabase";
import { MediaUploader } from "@/components/admin/media/MediaUploader";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    getFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    getMediaItems,
    updateMediaItem,
    deleteMediaItem,
    bulkUploadMedia,
    seedDefaultFolders,
} from "@/lib/services/mediaService";

// Media tile component with thumbnail, caption input, and edit button
function MediaTile({
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
}: {
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
}) {
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
        if (folderChanged) {
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
                    newFolderId: folderChanged ? folderId : undefined,
                    altText: captionChanged ? caption : undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Update failed");
            }

            // Refresh the media list
            await onUpdate(item.id, {});
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

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Update failed");
            }

            // Refresh the media list
            await onUpdate(item.id, {});

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
        <div className={`flex flex-col rounded-xl transition-all ${isSelected ? "ring-2 ring-accent overflow-visible" : "overflow-hidden"}`}>
            {/* Image container */}
            <div className="relative w-full aspect-square bg-black/30 rounded-t-xl overflow-hidden">
                {item.mimeType.startsWith("image/") ? (
                    <img
                        src={item.url}
                        alt={item.altText || item.filename}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <span className="text-sm">{item.mimeType.split("/")[1]}</span>
                    </div>
                )}

                {/* Image info overlay in top left */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg bg-black/60 text-white/70 text-[10px] flex items-center gap-1.5">
                    {item.width && item.height && (
                        <span>{item.width}×{item.height}</span>
                    )}
                    <span className="uppercase">{item.mimeType.split("/")[1]}</span>
                </div>

                {/* Edit/Close button in upper right - or checkbox in bulk mode */}
                {isBulkSelectMode ? (
                    <button
                        onClick={onToggleBulkSelect}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${isBulkSelected
                            ? "bg-accent text-white"
                            : "bg-black/60 text-white/70 hover:bg-black/80 hover:text-white"
                            }`}
                    >
                        {isBulkSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                ) : (
                    <button
                        onClick={onClick}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all ${isSelected
                            ? "bg-accent text-white"
                            : "bg-black/60 text-white/70 hover:bg-black/80 hover:text-white"
                            }`}
                    >
                        {isSelected ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    </button>
                )}
            </div>

            {/* Caption and edit fields container */}
            <div className={`p-3 bg-[#151b23] border-t border-white/10 ${isSelected ? "space-y-2 rounded-b-xl" : ""}`}>
                {/* Caption row */}
                <div className="flex items-center gap-2">
                    {isSelected && (
                        <label className="text-xs text-zinc-400 flex-shrink-0 w-12">Caption</label>
                    )}
                    <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add caption..."
                        className={`flex-1 min-w-0 text-sm text-white placeholder-zinc-500 focus:outline-none ${isSelected
                            ? "bg-black/20 rounded px-2 py-1.5"
                            : "bg-transparent"
                            }`}
                    />
                    {/* Only show Save button when NOT in edit mode and has changes */}
                    {!isSelected && captionChanged && (
                        <button
                            onClick={handleSaveCaptionOnly}
                            disabled={isSaving}
                            className="flex-shrink-0 px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light transition-colors disabled:opacity-50"
                            title="Save caption (Enter)"
                        >
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                        </button>
                    )}
                </div>

                {/* Edit fields - only when selected */}
                {isSelected && (
                    <>
                        {/* URL row */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-400 flex-shrink-0 w-12">URL</label>
                            <input
                                type="text"
                                value={item.url}
                                readOnly
                                className="flex-1 min-w-0 bg-black/20 rounded px-2 py-1.5 text-xs text-zinc-400 truncate"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(item.url);
                                }}
                                className="flex-shrink-0 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Copy URL"
                            >
                                <Copy className="h-3 w-3" />
                            </button>
                        </div>

                        {/* Folder row - searchable dropdown */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-zinc-400 flex-shrink-0 w-12">Folder</label>
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
                                    className="w-full bg-black/20 rounded px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                                />
                                {showFolderDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0b1115] border border-white/10 rounded shadow-lg max-h-40 overflow-auto z-50">
                                        <button
                                            type="button"
                                            // Use onMouseDown to prevent blur from closing dropdown before click registers
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // Prevent focus loss
                                                setFolderId(null);
                                                setShowFolderDropdown(false);
                                                setFolderSearch("");
                                            }}
                                            className="w-full text-left px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
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
                                                        ? "text-zinc-600 cursor-not-allowed"
                                                        : "text-white hover:bg-white/10"
                                                        }`}
                                                >
                                                    <span>{"—".repeat(depth)} {folder.name}</span>
                                                    {isRestricted && (
                                                        <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500">(Restricted)</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Actions row */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <button
                                onClick={() => onDelete(item.id)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveClick}
                                    disabled={isSaving || !hasChanges}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-white font-medium rounded hover:bg-accent-light transition-colors disabled:opacity-50"
                                >
                                    {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                                    Save
                                </button>
                            </div>
                        </div>

                        <ConfirmationModal
                            isOpen={showConfirmModal}
                            onClose={handleCancelSave}
                            onConfirm={handleSaveConfirmed}
                            title="Move File?"
                            message={
                                <div>
                                    <p>Are you sure you want to move this file to <strong>{currentFolderName || "the root folder"}</strong>?</p>
                                    <p className="mt-2 text-zinc-500 text-xs">This will physically relocate the file on the server and update all database references.</p>
                                </div>
                            }
                            confirmLabel="Move File"
                            isLoading={isSaving}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

export default function MediaPage() {
    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedFolder, setSelectedFolder] = useState<MediaFolder | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [isMobileFolderOpen, setIsMobileFolderOpen] = useState(false);

    // State selection for folder filtering
    const [states, setStates] = useState<StateOption[]>([]);
    const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

    const LAST_FOLDER_KEY = "media_last_folder_id";

    const { showNotification } = useNotification();
    const { isSuperAdmin } = useAuth();

    // Folder actions menu state
    const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteFolder, setPendingDeleteFolder] = useState<MediaFolder | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Media item delete state
    const [pendingDeleteItem, setPendingDeleteItem] = useState<MediaItem | null>(null);

    // Bulk selection state
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const folderMenuRef = useRef<HTMLDivElement>(null);
    const contentAreaRef = useRef<HTMLDivElement>(null);

    const canUploadToSelectedFolder = !isRestrictedFolder(selectedFolder);

    // Helper to find folder by ID (including nested)
    const findFolderById = (folders: MediaFolder[], id: string): MediaFolder | null => {
        for (const folder of folders) {
            if (folder.id === id) return folder;
            if (folder.children) {
                const found = findFolderById(folder.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    // Load folders and seed defaults if needed
    const loadFolders = useCallback(async () => {
        try {
            let folderData = await getFolders();
            if (folderData.length === 0) {
                await seedDefaultFolders();
                folderData = await getFolders();
            }
            setFolders(folderData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load folders");
        }
    }, []);

    // Load media items for selected folder
    const loadMediaItems = useCallback(async () => {
        setIsLoadingMedia(true);
        try {
            const items = await getMediaItems(selectedFolder?.id);
            // Only update media items after successfully loading
            setMediaItems(items);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load media");
            // On error, clear the items
            setMediaItems([]);
        } finally {
            setIsLoadingMedia(false);
        }
    }, [selectedFolder]);

    // Initial load
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);

            // Load folders first
            let folderData = await getFolders();
            if (folderData.length === 0) {
                await seedDefaultFolders();
                folderData = await getFolders();
            }
            setFolders(folderData);

            // Load states from location taxonomy
            try {
                // First get the location taxonomy ID
                const { data: taxonomyData } = await supabase
                    .from('taxonomies')
                    .select('id')
                    .or('type.eq.location,slug.eq.location')
                    .single();

                if (taxonomyData) {
                    // Get top-level entries (states) from the location taxonomy
                    const { data: statesData } = await supabase
                        .from('taxonomy_entries')
                        .select('id, name, slug')
                        .eq('taxonomy_id', taxonomyData.id)
                        .is('parent_id', null)
                        .order('name');

                    if (statesData && statesData.length > 0) {
                        setStates(statesData);
                        // Start with no state selected - user must choose
                    }
                }
            } catch (err) {
                console.error('Failed to load states:', err);
            }

            setIsLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload media when folder changes
    useEffect(() => {
        if (!selectedFolder) {
            // No folder selected - clear items, don't fetch
            setMediaItems([]);
            return;
        }
        loadMediaItems();
    }, [selectedFolder, loadMediaItems]);

    // Auto-open uploader for empty, uploadable folders; close otherwise
    useEffect(() => {
        if (selectedFolder && canUploadToSelectedFolder && mediaItems.length === 0) {
            setIsUploaderOpen(true);
        } else {
            setIsUploaderOpen(false);
        }
    }, [selectedFolder, canUploadToSelectedFolder, mediaItems.length]);

    const handleSelectFolder = (folder: MediaFolder | null) => {
        setSelectedFolder(folder);
        setIsMobileFolderOpen(false);
        setSelectedItemId(null);
        // LocalStorage logic removed
        // if (folder) {
        //     localStorage.setItem(LAST_FOLDER_KEY, folder.id);
        // } else {
        //     localStorage.removeItem(LAST_FOLDER_KEY);
        // }
    };

    const handleCreateFolder = async (name: string, parentId?: string) => {
        const newFolder = await createFolder(name, parentId);
        await loadFolders();
        // Auto-select the newly created folder
        handleSelectFolder(newFolder);
        // Show notification
        showNotification("Folder created", newFolder.name);
    };

    const handleUpload = async (files: File[]) => {
        await bulkUploadMedia(files, selectedFolder?.id);
        await loadMediaItems();
    };

    const handleSelectItem = (itemId: string) => {
        setSelectedItemId(selectedItemId === itemId ? null : itemId);
    };

    const handleUpdateItem = async (id: string, updates: Partial<MediaItem>) => {
        await updateMediaItem(id, updates);
        await loadMediaItems();
        // Also refresh folders to update item counts in sidebar
        await loadFolders();
    };

    const handleDeleteItem = async (id: string) => {
        // Find the item to delete for the confirmation dialog
        const item = mediaItems.find(m => m.id === id);
        if (item) {
            setPendingDeleteItem(item);
        }
    };

    const handleConfirmDeleteItem = async () => {
        if (!pendingDeleteItem) return;

        setIsActionLoading(true);
        try {
            const result = await deleteMediaItem(pendingDeleteItem.id);
            setSelectedItemId(null);
            setPendingDeleteItem(null);
            await loadMediaItems();
            // Refresh folders to update item counts
            await loadFolders();
            showNotification("File Deleted", result.filename);
        } catch (error) {
            console.error("Failed to delete item:", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Bulk selection handlers
    const handleEnterBulkSelect = () => {
        setIsBulkSelectMode(true);
        setSelectedItems(new Set());
        setIsFolderMenuOpen(false);
        // Close other tools
        setIsRenaming(false);
        setIsUploaderOpen(false);
        // Scroll content area to top to show bulk selection bar
        contentAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleExitBulkSelect = () => {
        setIsBulkSelectMode(false);
        setSelectedItems(new Set());
    };

    const handleToggleSelectItem = (id: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        // Toggle: if all selected, deselect all; otherwise select all
        if (selectedItems.size === mediaItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(mediaItems.map(m => m.id)));
        }
    };

    const handleConfirmBulkDelete = async () => {
        if (selectedItems.size === 0) return;

        setIsActionLoading(true);
        try {
            const response = await fetch("/api/media/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaIds: Array.from(selectedItems) }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Bulk delete failed");
            }

            const result = await response.json();
            showNotification("Files Deleted", `${result.deletedCount} file${result.deletedCount !== 1 ? "s" : ""} removed`);

            // Reset state and refresh
            setShowBulkDeleteConfirm(false);
            handleExitBulkSelect();
            await loadMediaItems();
            await loadFolders();
        } catch (error) {
            console.error("Bulk delete error:", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Folder actions handlers
    const handleStartRename = () => {
        if (selectedFolder) {
            setRenameValue(selectedFolder.name);
            setIsRenaming(true);
            setIsFolderMenuOpen(false);
            // Close other tools
            handleExitBulkSelect();
            setIsUploaderOpen(false);
        }
    };

    const handleRenameFolder = async (folderId?: string, newName?: string) => {
        // If called from context menu, use passed args. If from main toolbar, use state.
        const targetId = folderId || selectedFolder?.id;
        const targetName = newName || renameValue;

        if (!targetId || !targetName.trim()) {
            setIsRenaming(false);
            return;
        }

        // Check if name hasn't changed (only if we have the original folder object)
        const folder = folderId ? findFolderById(folders, folderId) : selectedFolder;
        if (folder && targetName === folder.name) {
            setIsRenaming(false);
            return;
        }

        setIsActionLoading(true);
        try {
            const updatedFolder = await renameFolder(targetId, targetName.trim());
            await loadFolders();

            // If we renamed the currently selected folder, update the reference
            if (selectedFolder?.id === targetId) {
                setSelectedFolder(updatedFolder);
            }

            showNotification("Folder renamed to", updatedFolder.name);
        } catch (error) {
            console.error("Failed to rename folder:", error);
        } finally {
            setIsActionLoading(false);
            setIsRenaming(false);
        }
    };

    const handleDeleteFolder = async (folderId?: string) => {
        const targetId = folderId || selectedFolder?.id;
        if (!targetId) return;

        const folder = findFolderById(folders, targetId);
        if (folder) {
            setPendingDeleteFolder(folder);
            setShowDeleteConfirm(true);
        }
    };

    const executeDeleteFolder = async () => {
        if (!pendingDeleteFolder) return;

        setIsActionLoading(true);
        const folderName = pendingDeleteFolder.name;
        const folderId = pendingDeleteFolder.id;

        try {
            await deleteFolder(folderId);
            setShowDeleteConfirm(false);
            setPendingDeleteFolder(null);

            // If we deleted the selected folder, clear selection
            if (selectedFolder?.id === folderId) {
                setSelectedFolder(null);
            }

            await loadFolders();
            showNotification("Folder and contents deleted", folderName);
        } catch (error) {
            console.error("Failed to delete folder:", error);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Close folder menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
                setIsFolderMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close rename dialog when folder changes
    useEffect(() => {
        setIsRenaming(false);
        setRenameValue("");
    }, [selectedFolder?.id]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <>
            {/* Fixed Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6">
                {/* Title Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Mobile folder toggle - Blue button style */}
                        <button
                            onClick={() => setIsMobileFolderOpen(!isMobileFolderOpen)}
                            className="md:hidden p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-white">Media Library</h1>
                            <p className="text-xs md:text-sm text-zinc-400 mt-1">
                                {selectedFolder ? (
                                    <>
                                        {/* Breadcrumb from path */}
                                        {selectedFolder.path.split('/').filter(Boolean).map((segment, index, arr) => {
                                            const isLast = index === arr.length - 1;
                                            const pathToHere = '/' + arr.slice(0, index + 1).join('/');
                                            const folderForSegment = folders.find(f => f.path === pathToHere) ||
                                                (selectedFolder.parentId ? findFolderById(folders, selectedFolder.parentId) : null);

                                            return (
                                                <span key={index}>
                                                    {index > 0 && <span className="mx-1 text-zinc-500">&gt;</span>}
                                                    {isLast ? (
                                                        <span className="text-white">{segment}</span>
                                                    ) : folderForSegment ? (
                                                        <button
                                                            onClick={() => handleSelectFolder(folderForSegment)}
                                                            className="hover:text-white transition-colors"
                                                        >
                                                            {segment}
                                                        </button>
                                                    ) : (
                                                        <span>{segment}</span>
                                                    )}
                                                </span>
                                            );
                                        })}
                                        <span className="hidden md:inline ml-2 text-zinc-500">• {mediaItems.length} items</span>
                                    </>
                                ) : (
                                    <>Add Media</>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-2 relative">
                        {/* Rename Input - Desktop: inline, Mobile: overlay dropdown */}
                        {isRenaming && (
                            <>
                                {/* Desktop inline input with save button inside */}
                                <div className="hidden md:flex items-center gap-2">
                                    <div className="relative flex items-center">
                                        <input
                                            type="text"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && renameValue.trim() && renameValue !== selectedFolder?.name) handleRenameFolder();
                                                if (e.key === "Escape") setIsRenaming(false);
                                            }}
                                            className="px-3 py-1.5 pr-16 text-sm bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent/50 min-w-[200px]"
                                            autoFocus
                                            disabled={isActionLoading}
                                        />
                                        {/* Save button inside field - only shows when changed */}
                                        {renameValue.trim() && renameValue !== selectedFolder?.name && (
                                            <button
                                                onClick={() => handleRenameFolder()}
                                                disabled={isActionLoading}
                                                className="absolute right-1.5 px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light transition-colors disabled:opacity-50"
                                            >
                                                {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsRenaming(false)}
                                        disabled={isActionLoading}
                                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Mobile dropdown - attached to bottom of page header */}
                                <div className="md:hidden fixed left-0 right-0 top-[56px] bg-[#1a2128] border-b border-white/20 shadow-2xl z-[100] px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1 flex items-center">
                                            <input
                                                type="text"
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && renameValue.trim() && renameValue !== selectedFolder?.name) handleRenameFolder();
                                                    if (e.key === "Escape") setIsRenaming(false);
                                                }}
                                                className="w-full px-3 py-2 pr-14 text-sm bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent/50"
                                                autoFocus
                                                disabled={isActionLoading}
                                                placeholder="Folder name..."
                                            />
                                            {/* Save button inside field - only shows when changed */}
                                            {renameValue.trim() && renameValue !== selectedFolder?.name && (
                                                <button
                                                    onClick={() => handleRenameFolder()}
                                                    disabled={isActionLoading}
                                                    className="absolute right-1.5 px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light transition-colors disabled:opacity-50"
                                                >
                                                    {isActionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsRenaming(false)}
                                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Add Media Button - Icon only on mobile, same size as folder tree button */}
                        {selectedFolder && canUploadToSelectedFolder && mediaItems.length > 0 && (
                            <button
                                onClick={() => {
                                    handleExitBulkSelect();
                                    setIsRenaming(false);
                                    setIsUploaderOpen(true);
                                }}
                                className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2"
                            >
                                <Plus className="h-5 w-5 md:hidden" />
                                <span className="hidden md:flex md:items-center md:gap-2">
                                    <Plus className="h-5 w-5" />
                                    Add Media
                                </span>
                            </button>
                        )}

                        {/* Folder Actions Menu - Far Right */}
                        {selectedFolder && selectedFolder.parentId && (
                            <div className="relative" ref={folderMenuRef}>
                                <button
                                    onClick={() => setIsFolderMenuOpen(!isFolderMenuOpen)}
                                    className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <MoreVertical className="h-5 w-5" />
                                </button>

                                {/* Dropdown Menu */}
                                {isFolderMenuOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-[#1a2128] border border-white/20 rounded-lg shadow-2xl z-50 overflow-hidden">
                                        <button
                                            onClick={handleStartRename}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Rename
                                        </button>
                                        {mediaItems.length > 0 && (
                                            <button
                                                onClick={handleEnterBulkSelect}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                                            >
                                                <CheckSquare className="h-4 w-4" />
                                                Bulk Select
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsFolderMenuOpen(false);
                                                setShowDeleteConfirm(true);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* Bulk Selection Bar - Animated slide down */}
                <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${isBulkSelectMode
                        ? "max-h-20 opacity-100 mt-4"
                        : "max-h-0 opacity-0 mt-0"
                        }`}
                >
                    <div className="flex items-center justify-between gap-2 md:gap-4 p-2 md:p-3 bg-accent/10 border border-accent/30 rounded-lg">
                        <div className="flex items-center gap-2 md:gap-4">
                            <button
                                onClick={handleSelectAll}
                                className="p-1.5 text-accent hover:text-accent-light transition-colors"
                            >
                                <CheckSquare className="h-5 w-5" />
                            </button>
                            <span className="text-xs md:text-sm text-white">
                                {selectedItems.size === 0
                                    ? <span className="hidden md:inline">Select images to delete</span>
                                    : `${selectedItems.size} selected`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                disabled={selectedItems.size === 0}
                                className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden md:inline">Delete</span>
                            </button>
                            <button
                                onClick={handleExitBulkSelect}
                                className="p-2 md:px-3 md:py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4 md:hidden" />
                                <span className="hidden md:inline">Cancel</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="h-full flex gap-6">
                    {/* Folder Tree Sidebar - Desktop */}
                    <div className="hidden md:block w-[296px] flex-shrink-0">
                        <div className="card h-full">
                            <FolderTree
                                folders={folders}
                                selectedFolderId={selectedFolder?.id}
                                onSelectFolder={handleSelectFolder}
                                onCreateFolder={handleCreateFolder}
                                onRenameFolder={handleRenameFolder}
                                onDeleteFolder={handleDeleteFolder}
                                states={states}
                                selectedStateId={selectedStateId}
                                onSelectState={setSelectedStateId}
                                isSuperAdmin={isSuperAdmin}
                            />
                        </div>
                    </div>

                    {/* Mobile Folder Sidebar */}
                    {isMobileFolderOpen && (
                        <div className="fixed inset-0 z-50 md:hidden">
                            <div
                                className="absolute inset-0 bg-black/60"
                                onClick={() => setIsMobileFolderOpen(false)}
                            />
                            <div className="absolute left-0 top-14 bottom-0 w-72 bg-[#0b1115] shadow-2xl">
                                <div className="flex items-center justify-between p-4 border-b border-white/5">
                                    <span className="text-white font-medium">Folders</span>
                                    <button
                                        onClick={() => setIsMobileFolderOpen(false)}
                                        className="p-2 text-zinc-400 hover:text-white"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <FolderTree
                                    folders={folders}
                                    selectedFolderId={selectedFolder?.id}
                                    onSelectFolder={handleSelectFolder}
                                    onCreateFolder={handleCreateFolder}
                                    onRenameFolder={handleRenameFolder}
                                    onDeleteFolder={handleDeleteFolder}
                                    states={states}
                                    selectedStateId={selectedStateId}
                                    onSelectState={setSelectedStateId}
                                    isSuperAdmin={isSuperAdmin}
                                />
                            </div>
                        </div>
                    )}

                    {/* Media Grid or Add Media Landing */}
                    <div className="flex-1 min-w-0">
                        <div className="card h-full flex flex-col">
                            {/* Uploader Zone - Animated slide down */}
                            <div
                                className={`overflow-hidden transition-all duration-500 ease-out ${isUploaderOpen && selectedFolder && canUploadToSelectedFolder
                                    ? "max-h-[500px] opacity-100"
                                    : "max-h-0 opacity-0"
                                    }`}
                            >
                                {selectedFolder && canUploadToSelectedFolder && (
                                    <MediaUploader
                                        isOpen={isUploaderOpen}
                                        onClose={() => setIsUploaderOpen(false)}
                                        onUpload={handleUpload}
                                        folderName={selectedFolder.name}
                                        hideCloseButton={mediaItems.length === 0}
                                    />
                                )}
                            </div>

                            {/* Content Area */}
                            <div ref={contentAreaRef} className="flex-1 overflow-auto p-4" onClick={() => setSelectedItemId(null)}>
                                {!selectedFolder ? (
                                    /* Add Media Landing Page */
                                    <div className="flex flex-col items-center justify-start h-full text-center pt-[100px]">
                                        <ImageIcon className="h-20 w-20 text-accent/50 mb-6" />
                                        <h2 className="text-2xl font-semibold text-white mb-3">Add Media to Your Library</h2>
                                        <p className="text-zinc-400 max-w-md">
                                            Select a folder from the sidebar to view and upload images. Each folder organizes media for different sections of your site.
                                        </p>
                                    </div>
                                ) : isLoadingMedia && mediaItems.length === 0 ? (
                                    /* Loading state - only show when initially loading with no items */
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                                    </div>
                                ) : mediaItems.length === 0 ? (
                                    /* Empty folder */
                                    <div className="flex flex-col items-center justify-start h-full pt-[100px]">
                                        {canUploadToSelectedFolder ? (
                                            /* Uploadable folder - show empty message */
                                            <div className="text-center max-w-md">
                                                <ImageIcon className="h-16 w-16 text-accent/50 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-white mb-2">
                                                    No Images Yet
                                                </h3>
                                                <p className="text-sm text-zinc-400">
                                                    This folder is empty. Click &quot;Add Media&quot; to upload images.
                                                </p>
                                            </div>
                                        ) : (
                                            /* Restricted folder - show message only */
                                            <div className="text-center max-w-md">
                                                <Folder className="h-16 w-16 text-accent/50 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-white mb-2">
                                                    Select a Subfolder
                                                </h3>
                                                <p className="text-sm text-zinc-400">
                                                    Images cannot be saved directly in &quot;{selectedFolder?.name}&quot;.
                                                    Please select or create a subfolder from the folder tree.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className={`grid gap-4 md:gap-6 ${isBulkSelectMode
                                            ? "grid-cols-2"
                                            : "grid-cols-1"
                                            } md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]`}
                                        onClick={() => setSelectedItemId(null)}
                                    >
                                        {mediaItems.map((item) => (
                                            <div key={item.id} onClick={(e) => e.stopPropagation()}>
                                                <MediaTile
                                                    item={item}
                                                    isSelected={selectedItemId === item.id}
                                                    folders={folders}
                                                    onClick={() => handleSelectItem(item.id)}
                                                    onUpdate={handleUpdateItem}
                                                    onDelete={handleDeleteItem}
                                                    onClose={() => setSelectedItemId(null)}
                                                    isBulkSelectMode={isBulkSelectMode}
                                                    isBulkSelected={selectedItems.has(item.id)}
                                                    onToggleBulkSelect={() => handleToggleSelectItem(item.id)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Folder Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setPendingDeleteFolder(null);
                }}
                onConfirm={executeDeleteFolder}
                title="Delete Folder?"
                message={
                    <div>
                        <p>Are you sure you want to delete <strong>&quot;{pendingDeleteFolder?.name}&quot;</strong>?</p>
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-200 text-sm font-medium flex items-center gap-2">
                                <span className="text-lg">⚠️</span> Warning: This action is permanent!
                            </p>
                            <p className="mt-1 text-red-300/80 text-xs pl-7">
                                This will permanently delete the folder and <strong>all files contained within it</strong> from the hard drive. This cannot be undone.
                            </p>
                        </div>
                    </div>
                }
                confirmLabel="Yes, Delete Everything"
                isDangerous
                isLoading={isActionLoading}
            />

            {/* Delete Media Item Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!pendingDeleteItem}
                onClose={() => setPendingDeleteItem(null)}
                onConfirm={handleConfirmDeleteItem}
                title="Delete File?"
                message={
                    <div>
                        <p>Are you sure you want to delete <strong>&quot;{pendingDeleteItem?.filename}&quot;</strong>?</p>
                        <p className="mt-2 text-red-400 text-xs">
                            This file will be permanently removed. This action cannot be undone.
                        </p>
                    </div>
                }
                confirmLabel="Delete File"
                isDangerous
                isLoading={isActionLoading}
            />

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={handleConfirmBulkDelete}
                title="Delete Multiple Files?"
                message={
                    <div>
                        <p>Are you sure you want to delete <strong>{selectedItems.size} file{selectedItems.size !== 1 ? "s" : ""}</strong>?</p>
                        <p className="mt-2 text-red-400 text-xs">
                            These files will be permanently removed. This action cannot be undone.
                        </p>
                    </div>
                }
                confirmLabel={`Delete ${selectedItems.size} File${selectedItems.size !== 1 ? "s" : ""}`}
                isDangerous
                isLoading={isActionLoading}
            />
        </>
    );
}
