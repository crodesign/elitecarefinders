"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Loader2, RefreshCw, X } from "lucide-react";
import { MediaItem, MediaFolder } from "@/types";
import { getMediaItems, getMediaItemsByUrls, deleteMediaItem, bulkUploadMedia } from "@/lib/services/mediaService";
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

export interface GalleryConfig {
    id: "main" | "team";
    title: string;
    shortLabel: string;
    urls: string[];
    emptyText?: string;
    onChange: (urls: string[]) => void;
}

interface MediaGalleryProps {
    folderId: string | null;
    title?: React.ReactNode;
    className?: string;
    onMediaSelect?: (media: MediaItem) => void;
    folders?: MediaFolder[];
    galleries?: GalleryConfig[];
    isDirty?: boolean;
    dropzoneText?: string;
    featuredImageUrl?: string;
    stepImageMap?: Record<string, number>;
}

export function MediaGallery({ folderId, title = "Media Gallery", className = "", onMediaSelect, folders = [], galleries, isDirty = false, dropzoneText, featuredImageUrl, stepImageMap }: MediaGalleryProps) {
    const [activeGalleryId, setActiveGalleryId] = useState<"main" | "team">("main");
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [brokenImageUrls, setBrokenImageUrls] = useState<string[]>([]);
    const { showNotification } = useNotification();
    const galleriesRef = useRef(galleries);
    useEffect(() => { galleriesRef.current = galleries; }, [galleries]);

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

        const activeGallery = galleries?.find(g => g.id === activeGalleryId);
        if (over && active.id !== over.id && activeGallery) {
            const oldIndex = activeGallery.urls.indexOf(active.id as string);
            const newIndex = activeGallery.urls.indexOf(over.id as string);

            activeGallery.onChange(arrayMove(activeGallery.urls, oldIndex, newIndex));
        }
    };

    const loadMedia = useCallback(async () => {
        if (!folderId) return;
        setIsLoading(true);
        setError(null);
        try {
            let items = await getMediaItems(folderId);
            if (items.length === 0 && galleriesRef.current) {
                const allGalleryUrls = galleriesRef.current.flatMap(g => g.urls);
                if (allGalleryUrls.length > 0) {
                    items = await getMediaItemsByUrls(allGalleryUrls);
                }
            }
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
        // across all provided galleries.
        if (updatedItem.url && galleries) {
            const oldItem = mediaItems.find(i => i.id === id);
            if (oldItem && oldItem.url !== updatedItem.url) {
                // Update every gallery that contains this old URL
                galleries.forEach(gallery => {
                    if (gallery.urls.includes(oldItem.url)) {
                        const newUrls = gallery.urls.map(u => u === oldItem.url ? updatedItem.url! : u);
                        gallery.onChange(newUrls);
                    }
                });
            }
        }
    };

    const handleDeleteItem = async (id: string) => {
        // Find the item's URL before deleting so we can deselect it everywhere
        const item = mediaItems.find(i => i.id === id);
        const deletedUrl = item?.url;

        try {
            await deleteMediaItem(id);
            showNotification("Image deleted");

            // Remove the deleted URL from all gallery selections so the
            // thumbnail strip and dirty state stay in sync
            if (deletedUrl && galleries) {
                galleries.forEach(gallery => {
                    if (gallery.urls.includes(deletedUrl)) {
                        gallery.onChange(gallery.urls.filter(u => u !== deletedUrl));
                    }
                });
            }

            await loadMedia();
        } catch (err) {
            console.error("Delete failed:", err);
            showNotification("Delete failed", "Could not delete image.");
        }
    };

    const handleToggleSelection = (url: string) => {
        const activeGallery = galleries?.find(g => g.id === activeGalleryId);
        if (!activeGallery) return;

        if (activeGallery.urls.includes(url)) {
            activeGallery.onChange(activeGallery.urls.filter(u => u !== url));
        } else {
            activeGallery.onChange([...activeGallery.urls, url]);
        }
    };

    if (!folderId) {
        return (
            <div className={`p-8 text-center border border-dashed border-ui-border rounded-xl ${className}`}>
                <p className="text-content-muted">No folder selected. Save the location details first.</p>
            </div>
        );
    }

    const handleImageError = (url: string) => {
        setBrokenImageUrls(prev => {
            if (prev.includes(url)) return prev;
            return [...prev, url];
        });
    };

    const handleRemoveBrokenImages = () => {
        const activeGallery = galleries?.find(g => g.id === activeGalleryId);
        if (!activeGallery) return;

        const newUrls = activeGallery.urls.filter(url => !brokenImageUrls.includes(url));
        activeGallery.onChange(newUrls);
        setBrokenImageUrls([]);
        showNotification("Gallery Updated", "Broken images detected and removed.");
    };

    const activeGallery = galleries?.find(g => g.id === activeGalleryId);
    const activeUrls = activeGallery ? activeGallery.urls : [];

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
                isDangerous={true}
            />

            {/* Selected Images Container */}
            {galleries && galleries.length > 0 && (
                <div className="bg-[var(--media-gallery-bg)] rounded-lg p-4 overflow-x-auto">
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
                        {galleries.length > 1 ? (
                            <div className="flex bg-surface-input p-1 rounded-lg">
                                {galleries.map(g => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setActiveGalleryId(g.id)}
                                        className={`flex items-center justify-center gap-2 flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${activeGalleryId === g.id
                                            ? "bg-accent text-white shadow-sm"
                                            : "text-content-muted hover:text-content-secondary"
                                            }`}
                                    >
                                        <span>{g.shortLabel}</span>
                                        {g.urls.length > 0 && (
                                            <span
                                                className={`flex items-center justify-center w-[18px] h-[18px] rounded-[4px] text-[10px] font-bold tracking-tight ${activeGalleryId === g.id
                                                    ? "bg-white text-accent"
                                                    : "bg-[var(--media-gallery-bg)] text-content-primary opacity-75"
                                                    }`}
                                            >
                                                {g.urls.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <h3 className="text-sm font-medium text-content-primary py-1">
                                    {galleries[0].title}
                                </h3>
                            </div>
                        )}
                        <div className="flex items-center">
                            {activeUrls.length > 0 && activeGallery && (
                                <button
                                    type="button"
                                    onClick={() => activeGallery.onChange([])}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all bg-[var(--media-gallery-bg)] ${activeUrls.length > 0 ? "text-content-secondary hover:bg-accent hover:text-white" : "opacity-50 cursor-not-allowed text-content-muted"}`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {activeUrls.length > 0 ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="flex gap-3 pb-2 pt-1 min-h-[104px] items-center">
                                <SortableContext
                                    items={activeUrls}
                                    strategy={horizontalListSortingStrategy}
                                >
                                    {activeUrls.map((url) => (
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
                    ) : (
                        <div className="h-[104px] flex items-center justify-center border-2 border-dashed border-ui-border rounded-lg bg-surface-primary/30 text-center px-4">
                            <p className="text-sm text-content-muted">
                                {activeGallery?.emptyText || `Select an image below to add it to the ${activeGallery?.shortLabel} Gallery.`}
                            </p>
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-center justify-between mt-2">
                <h3 className="text-lg font-medium text-content-primary">{title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadMedia}
                        className="p-2 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors shrink-0"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    {mediaItems.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setIsUploaderOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors shrink-0"
                        >
                            <Plus className="h-4 w-4" />
                            Add
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
                        folderName={dropzoneText || "this property"}
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
                        folderName={dropzoneText || "this property"}
                    />
                </div>
            ) : (
                <div className="bg-[var(--media-gallery-bg)] rounded-lg p-4 flex-1 overflow-y-auto min-h-0">
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
                        {mediaItems.map((item) => (
                            <div key={item.id}>
                                <MediaTile
                                    item={item}
                                    isSelected={(activeUrls.includes(item.url)) || selectedItemId === item.id || (!!featuredImageUrl && featuredImageUrl === item.url)}
                                    isEditMode={selectedItemId === item.id}
                                    folders={folders}
                                    onClick={() => setSelectedItemId(item.id)}
                                    onUpdate={handleUpdateItem}
                                    onDelete={handleDeleteItem}
                                    onClose={() => setSelectedItemId(null)}
                                    showUrlField={true}
                                    showFolderMove={false}
                                    showDimensions={true}
                                    isFeaturedImage={featuredImageUrl ? featuredImageUrl === item.url : !!(activeUrls.length > 0 && activeUrls[0] === item.url && activeGallery?.id === 'main')}
                                    stepLabel={stepImageMap && stepImageMap[item.url] !== undefined ? `Step ${stepImageMap[item.url]}` : undefined}
                                    onMediaSelect={galleries ? () => handleToggleSelection(item.url) : onMediaSelect}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


