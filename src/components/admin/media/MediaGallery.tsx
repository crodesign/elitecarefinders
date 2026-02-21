"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Loader2, RefreshCw, X, FolderOpen } from "lucide-react";
import { MediaItem, MediaFolder } from "@/types";
import { getMediaItems, deleteMediaItem, updateMediaItem, bulkUploadMedia } from "@/lib/services/mediaService";
import { supabase } from "@/lib/supabase";
import { MediaUploader } from "@/components/admin/media/MediaUploader";
import { MediaTile } from "@/components/admin/media/MediaTile";
import { SortableGalleryItem } from "@/components/admin/media/SortableGalleryItem";
import { useNotification } from "@/contexts/NotificationContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

interface MediaGalleryProps {
    folderId: string | null;
    title?: string;
    className?: string;
    onMediaSelect?: (media: MediaItem) => void;
    folders?: MediaFolder[];
    selectedUrls?: string[];
    onSelectionChange?: (urls: string[]) => void;
    isDirty?: boolean;
}

export function MediaGallery({ folderId, title = "Media Gallery", className = "", onMediaSelect, folders = [], selectedUrls, onSelectionChange, isDirty = false }: MediaGalleryProps) {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<string | null>(null);
    const { showNotification } = useNotification();

    // Fetch the folder path to build the media library deep-link
    useEffect(() => {
        if (!folderId) { setFolderPath(null); return; }
        supabase
            .from('media_folders')
            .select('path')
            .eq('id', folderId)
            .single()
            .then(({ data }: { data: { path: string } | null }) => setFolderPath(data?.path ?? null));
    }, [folderId]);

    // Build deep-link URL using same pathToSlug logic as media page.tsx
    // Splits on '/', lowercases+hyphenates each segment without stripping the
    // leading empty string, so the resulting slug keeps its leading slash:
    //   "/Hawaii/Oahu/Home Images" → "/hawaii/oahu/home-images"
    const mediaLibraryUrl = useMemo(() => {
        if (!folderPath) return '/admin/media';
        const slug = folderPath
            .split('/')
            .map(s => s.toLowerCase().replace(/\s+/g, '-'))
            .join('/');
        return `/admin/media?folder=${slug}`;
    }, [folderPath]);

    const handleManageImages = () => {
        if (isDirty) {
            const confirmed = window.confirm(
                'You have unsaved changes. If you navigate away, your changes will be lost.\n\nContinue to Media Library?'
            );
            if (!confirmed) return;
        }
        window.location.href = mediaLibraryUrl;
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id && selectedUrls && onSelectionChange) {
            const oldIndex = selectedUrls.indexOf(active.id as string);
            const newIndex = selectedUrls.indexOf(over.id as string);

            onSelectionChange(arrayMove(selectedUrls, oldIndex, newIndex));
        }
    };

    const loadMedia = useCallback(async () => {
        if (!folderId) return;
        setIsLoading(true);
        setError(null);
        try {
            const items = await getMediaItems(folderId);
            setMediaItems(items);
        } catch (err) {
            console.error("Failed to load media:", err);
            setError("Failed to load media items.");
        } finally {
            setIsLoading(false);
        }
    }, [folderId]);

    useEffect(() => {
        loadMedia();
    }, [loadMedia]);

    const handleUpload = async (files: File[]) => {
        if (!folderId) return;
        try {
            await bulkUploadMedia(files, folderId || undefined);
            showNotification("Upload complete", `${files.length} file(s) uploaded.`);
            await loadMedia();
        } catch (err) {
            console.error("Upload failed:", err);
            showNotification("Upload failed", "Some files could not be uploaded.");
        }
    };

    const handleUpdateItem = async (id: string, updatedItem: Partial<MediaItem>) => {
        // Update local state immediately to reflect changes (e.g. caption, URL, folder move)
        setMediaItems(items => {
            // If the item was moved to a different folder, remove it from the current view
            if (updatedItem.folderId && folderId && updatedItem.folderId !== folderId) {
                return items.filter(i => i.id !== id);
            }
            // Otherwise update it in place
            return items.map(item =>
                item.id === id ? { ...item, ...updatedItem } : item
            );
        });

        // If the URL changed (due to rename), we must update the selection state
        // because selectedUrls tracks items by URL, not ID.
        if (updatedItem.url && selectedUrls) {
            const oldItem = mediaItems.find(i => i.id === id);
            if (oldItem && oldItem.url !== updatedItem.url && selectedUrls.includes(oldItem.url)) {
                // Replace the old URL with the new URL in the selection list
                const newUrls = selectedUrls.map(u => u === oldItem.url ? updatedItem.url! : u);
                onSelectionChange?.(newUrls);
            }
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("Are you sure you want to delete this image?")) return;

        try {
            await deleteMediaItem(id);
            showNotification("Image deleted");
            await loadMedia();
        } catch (err) {
            console.error("Delete failed:", err);
            showNotification("Delete failed", "Could not delete image.");
        }
    };

    const handleToggleSelection = (url: string) => {
        if (!onSelectionChange || !selectedUrls) return;

        if (selectedUrls.includes(url)) {
            onSelectionChange(selectedUrls.filter(u => u !== url));
        } else {
            onSelectionChange([...selectedUrls, url]);
        }
    };

    if (!folderId) {
        return (
            <div className={`p-8 text-center border border-dashed border-ui-border rounded-xl ${className}`}>
                <p className="text-content-muted">No folder selected. Save the location details first.</p>
            </div>
        );
    }

    const [brokenImageUrls, setBrokenImageUrls] = useState<string[]>([]);

    const handleImageError = (url: string) => {
        setBrokenImageUrls(prev => {
            if (prev.includes(url)) return prev;
            return [...prev, url];
        });
    };

    const handleRemoveBrokenImages = () => {
        if (!onSelectionChange || !selectedUrls) return;

        const newUrls = selectedUrls.filter(url => !brokenImageUrls.includes(url));
        onSelectionChange(newUrls);
        setBrokenImageUrls([]);
        showNotification("Gallery Updated", "Broken images detected and removed.");
    };

    return (
        <div className={`flex flex-col gap-4 ${className}`}>
            {/* Broken Images Modal */}
            <ConfirmationModal
                isOpen={brokenImageUrls.length > 0}
                onClose={() => {
                    // Ideally we might want to allow them to ignore it, but for now enforcing cleanup or they stay busted
                    // Actually, let's allow close, but they might pop up again if re-rendered.
                    // Better to just clear the list if they ignore, but they'll still be broken.
                    setBrokenImageUrls([]);
                }}
                onConfirm={handleRemoveBrokenImages}
                title="Broken Images Detected"
                message={`We detected ${brokenImageUrls.length} broken image(s) in your gallery. Would you like to remove them?`}
                confirmLabel="Remove Broken Images"
                cancelLabel="Ignore"
                variant="destructive"
            />

            {/* Selected Images Container */}
            {selectedUrls && selectedUrls.length > 0 && (
                <div className="bg-surface-well rounded-lg p-4 overflow-x-auto">
                    <h4 className="text-xs font-medium text-content-muted mb-3 uppercase tracking-wider flex items-center justify-between">
                        <span>Selected Images ({selectedUrls.length})</span>
                        <button
                            type="button"
                            onClick={() => onSelectionChange?.([])}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                            Clear All
                        </button>
                    </h4>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex gap-3 pb-2">
                            <SortableContext
                                items={selectedUrls}
                                strategy={horizontalListSortingStrategy}
                            >
                                {selectedUrls.map((url) => (
                                    <SortableGalleryItem
                                        key={url}
                                        url={url}
                                        onRemove={(urlToRemove) => handleToggleSelection(urlToRemove)}
                                        onError={handleImageError}
                                    />
                                ))}
                            </SortableContext>
                        </div>
                    </DndContext>
                </div>
            )}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-content-primary">{title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadMedia}
                        className="p-2 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    {mediaItems.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsUploaderOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Images
                        </button>
                    )}
                    {/* Manage Images — deep-links to the media library folder */}
                    <button
                        type="button"
                        onClick={handleManageImages}
                        title="Manage Images in Media Library"
                        className="p-2 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors"
                    >
                        <FolderOpen className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {isUploaderOpen && (
                <div className="mb-6">
                    <MediaUploader
                        isOpen={true}
                        onClose={() => setIsUploaderOpen(false)}
                        onUpload={handleUpload}
                        folderName="this property"
                    />
                </div>
            )}

            {isLoading && !mediaItems.length ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 text-accent animate-spin" />
                </div>
            ) : mediaItems.length === 0 ? (
                <div className="space-y-4">
                    <MediaUploader
                        isOpen={true}
                        onClose={() => { }}
                        onUpload={handleUpload}
                        folderName="this property"
                    />
                    <p className="text-center text-sm text-content-muted">
                        Drop images above or click to browse
                    </p>
                </div>
            ) : (
                <div className="bg-surface-well rounded-lg p-4 flex-1 overflow-y-auto min-h-0">
                    <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
                        {mediaItems.map((item) => (
                            <div key={item.id}>
                                <MediaTile
                                    item={item}
                                    isSelected={(selectedUrls?.includes(item.url)) || selectedItemId === item.id}
                                    folders={folders}
                                    onClick={() => setSelectedItemId(item.id)}
                                    onUpdate={handleUpdateItem}
                                    onDelete={handleDeleteItem}
                                    onClose={() => setSelectedItemId(null)}
                                    showUrlField={false}
                                    showFolderMove={false}
                                    showDimensions={false}
                                    isFeaturedImage={!!(selectedUrls && selectedUrls.length > 0 && selectedUrls[0] === item.url)}
                                    onMediaSelect={onSelectionChange ? () => handleToggleSelection(item.url) : onMediaSelect}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


