"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, RefreshCw, X } from "lucide-react";
import { MediaItem, MediaFolder } from "@/types";
import { getMediaItems, deleteMediaItem, updateMediaItem, bulkUploadMedia } from "@/lib/services/mediaService";
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
}

export function MediaGallery({ folderId, title = "Media Gallery", className = "", onMediaSelect, folders = [], selectedUrls, onSelectionChange }: MediaGalleryProps) {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const { showNotification } = useNotification();

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
            <div className={`p-8 text-center border border-dashed border-white/10 rounded-xl ${className}`}>
                <p className="text-zinc-500">No folder selected. Save the location details first.</p>
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
        <div className={`space-y-4 ${className}`}>
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
                <div className="bg-[#151b23] border border-white/5 rounded-lg p-4 overflow-x-auto">
                    <h4 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider flex items-center justify-between">
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
                <h3 className="text-lg font-medium text-white">{title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadMedia}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
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
                    <p className="text-center text-sm text-zinc-500">
                        Drop images above or click to browse
                    </p>
                </div>
            ) : (
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
                                onMediaSelect={onSelectionChange ? () => handleToggleSelection(item.url) : onMediaSelect}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
