"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, X, LayoutGrid, Images, MoreVertical, Trash2, CheckSquare } from "lucide-react";
import { StockImagePicker } from "@/components/admin/media/StockImagePicker";
import { HeartLoader } from "@/components/ui/HeartLoader";
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
    rectSortingStrategy,
} from "@dnd-kit/sortable";

export interface GalleryConfig {
    id: "main" | "team" | "cuisine";
    title: string;
    shortLabel: string;
    mobileLabel?: string;
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
    entityName?: string;
    showStockImages?: boolean;
    entityType?: "home" | "facility" | "post";
    entityId?: string;
}

export function MediaGallery({ folderId, title = "Media Gallery", className = "", onMediaSelect, folders = [], galleries, isDirty = false, dropzoneText, featuredImageUrl, stepImageMap, entityName, showStockImages = false, entityType, entityId }: MediaGalleryProps) {
    const [activeGalleryId, setActiveGalleryId] = useState<"main" | "team" | "cuisine">("main");
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [isSelectToRemove, setIsSelectToRemove] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [brokenImageUrls, setBrokenImageUrls] = useState<string[]>([]);
    const [showStockPicker, setShowStockPicker] = useState(false);
    const { showNotification } = useNotification();
    const galleriesRef = useRef(galleries);
    useEffect(() => { galleriesRef.current = galleries; }, [galleries]);
    const featuredImageUrlRef = useRef(featuredImageUrl);
    useEffect(() => { featuredImageUrlRef.current = featuredImageUrl; }, [featuredImageUrl]);
    const stepImageMapRef = useRef(stepImageMap);
    useEffect(() => { stepImageMapRef.current = stepImageMap; }, [stepImageMap]);

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

            // Always include gallery-selected images even if stored in a different folder
            const folderUrls = new Set(items.map(i => i.url));
            let extraUrls: string[] = [];
            if (galleriesRef.current) {
                extraUrls = galleriesRef.current.flatMap(g => g.urls).filter(u => u && !folderUrls.has(u));
            } else {
                // No galleries (e.g. recipe posts): use featured image and step images
                if (featuredImageUrlRef.current && !folderUrls.has(featuredImageUrlRef.current)) {
                    extraUrls.push(featuredImageUrlRef.current);
                }
                if (stepImageMapRef.current) {
                    Object.keys(stepImageMapRef.current).forEach(url => {
                        if (url && !folderUrls.has(url) && !extraUrls.includes(url)) extraUrls.push(url);
                    });
                }
            }
            if (extraUrls.length > 0) {
                const extraItems = await getMediaItemsByUrls(extraUrls);
                items = [...items, ...extraItems];
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

    useEffect(() => {
        if (mediaItems.length === 0 && isSelectToRemove) setIsSelectToRemove(false);
    }, [mediaItems.length, isSelectToRemove]);

    useEffect(() => {
        if (!isMoreMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMoreMenuOpen]);

    const handleUpload = async (files: File[]) => {
        if (!folderId) return;
        setIsUploading(true);
        try {
            const namePrefix = entityName
                ? entityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                : undefined;
            await bulkUploadMedia(files, folderId || undefined, undefined, namePrefix);
            showNotification("Upload complete", `${files.length} file(s) uploaded.`);
            await loadMedia();
            setTimeout(() => setShowUploadModal(false), 1200);
        } catch (err) {
            console.error("Upload failed:", err);
            showNotification("Upload failed", "Some files could not be uploaded.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleUpdateItem = async (id: string, updatedItem: Partial<MediaItem>) => {
        // Update local state immediately to reflect changes (e.g. caption, URL, folder move)
        setMediaItems(items => {
            const currentItem = items.find(i => i.id === id);
            // Only remove from view if the item's folder actually changed (explicit move)
            if (updatedItem.folderId && currentItem?.folderId && updatedItem.folderId !== currentItem.folderId) {
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

    const handleDeleteAll = async () => {
        setIsDeletingAll(true);
        try {
            await Promise.all(mediaItems.map(item => deleteMediaItem(item.id)));
            if (galleries) {
                galleries.forEach(g => g.onChange([]));
            }
            if (entityType && entityId) {
                await fetch("/api/entities/clear-gallery", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entityType, entityId }),
                });
            }
            showNotification("All images deleted");
            await loadMedia();
            setShowDeleteAllModal(false);
        } catch (err) {
            console.error("Delete all failed:", err);
            showNotification("Delete failed", "Could not delete all images.");
        } finally {
            setIsDeletingAll(false);
        }
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
            {showStockImages && (
                <StockImagePicker
                    isOpen={showStockPicker}
                    onClose={() => setShowStockPicker(false)}
                    folderId={folderId}
                    namePrefix={entityName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || undefined}
                    onImportComplete={loadMedia}
                />
            )}
            {/* Upload Modal */}
            {showUploadModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => { if (!isUploading) setShowUploadModal(false); }}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative z-10 w-full max-w-lg mx-4 bg-surface-primary rounded-2xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-ui-border">
                            <h3 className="text-base font-semibold text-content-primary">Upload Images</h3>
                            <button
                                type="button"
                                onClick={() => setShowUploadModal(false)}
                                disabled={isUploading}
                                className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <MediaUploader
                            isOpen={true}
                            onClose={() => setShowUploadModal(false)}
                            onUpload={handleUpload}
                            folderName={dropzoneText || entityName || "this folder"}
                            hideCloseButton={true}
                        />
                    </div>
                </div>
            )}

            {/* Delete All Modal */}
            <ConfirmationModal
                isOpen={showDeleteAllModal}
                onClose={() => setShowDeleteAllModal(false)}
                onConfirm={handleDeleteAll}
                title="Delete All Images"
                message={`This will permanently delete all ${mediaItems.length} image(s) from the library. This cannot be undone.`}
                confirmLabel="Delete All"
                cancelLabel="Cancel"
                isDangerous={true}
                isLoading={isDeletingAll}
            />

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
                <div className="bg-surface-input rounded-lg p-4 overflow-x-auto" style={{ border: '2px solid var(--form-border)' }}>
                    <div className="flex items-center justify-between mb-4 gap-4">
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
                                        <span className="sm:hidden">{g.mobileLabel ?? g.shortLabel}</span>
                                        <span className="hidden sm:inline">{g.shortLabel}</span>
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
                        {activeUrls.length > 0 && activeGallery && (
                            <button
                                type="button"
                                onClick={() => activeGallery.onChange([])}
                                title="Clear gallery"
                                className="p-1.5 rounded-md text-content-muted hover:bg-accent hover:text-white transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {activeUrls.length > 0 ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="grid grid-cols-4 gap-2 pb-2 pt-1 sm:flex sm:flex-wrap sm:gap-3">
                                <SortableContext
                                    items={activeUrls}
                                    strategy={rectSortingStrategy}
                                >
                                    {activeUrls.map((url, index) => (
                                        <SortableGalleryItem
                                            key={url}
                                            url={url}
                                            onRemove={(urlToRemove) => handleToggleSelection(urlToRemove)}
                                            onError={handleImageError}
                                            isFeatured={activeGalleryId === "main" && index === 0}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        </DndContext>
                    ) : (
                        <div className="min-h-[80px] py-4 flex items-center justify-center border-2 border-dashed border-ui-border rounded-lg bg-surface-primary/30 text-center px-4">
                            <p className="text-sm text-content-muted">
                                {activeGallery?.emptyText || `Select an image below to add it to the ${activeGallery?.shortLabel} Gallery.`}
                            </p>
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-center justify-between mt-2">
                <h3 className="flex items-start gap-2 text-lg font-medium text-content-primary">
                    <LayoutGrid className="h-4 w-4 text-accent shrink-0 mt-[6px]" />
                    {title}
                    {mediaItems.length > 0 && (
                        <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-lg bg-accent text-white text-[11px] font-bold tabular-nums shrink-0 mt-[4px]">
                            {mediaItems.length}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    {showStockImages && (
                        <button
                            type="button"
                            onClick={() => setShowStockPicker(true)}
                            className="p-2 bg-surface-hover text-content-secondary hover:bg-accent hover:text-white rounded-lg transition-colors shrink-0"
                        >
                            <Images className="h-4 w-4" />
                        </button>
                    )}
                    {mediaItems.length > 0 && (
                        <>
                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsMoreMenuOpen(v => !v)}
                                    className={`p-2 rounded-lg transition-colors shrink-0 ${isSelectToRemove
                                        ? "bg-accent text-white"
                                        : "bg-surface-hover text-content-secondary hover:bg-accent hover:text-white"
                                        }`}
                                >
                                    <MoreVertical className="h-4 w-4" />
                                </button>
                                {isMoreMenuOpen && (
                                    <div className="dropdown-menu absolute z-50 right-0 mt-1 w-max whitespace-nowrap flex flex-col">
                                        <div className="p-1">
                                            <button
                                                type="button"
                                                onClick={() => { setIsMoreMenuOpen(false); setIsSelectToRemove(v => !v); }}
                                                className={`dropdown-item w-full rounded text-sm ${isSelectToRemove ? "active" : ""}`}
                                            >
                                                <CheckSquare className="h-3.5 w-3.5" />
                                                <span>{isSelectToRemove ? "Exit Select Mode" : "Select to Remove"}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setIsMoreMenuOpen(false); setShowDeleteAllModal(true); }}
                                                className="dropdown-item w-full rounded text-sm"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Remove All</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowUploadModal(true)}
                                className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors shrink-0"
                            >
                                <Upload className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isLoading && !mediaItems.length ? (
                <div className="flex items-center justify-center p-12">
                    <HeartLoader />
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
                <div className="bg-surface-input rounded-lg p-4 flex-1 overflow-y-auto min-h-0" style={{ border: '2px solid var(--form-border)' }}>
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
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
                                    isTeamView={activeGalleryId === 'team'}
                                    onMediaSelect={galleries ? () => handleToggleSelection(item.url) : onMediaSelect}
                                    selectToRemove={isSelectToRemove}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


