"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, ImageIcon, X, Trash2, CheckSquare, Settings } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import type { MediaFolder, MediaItem } from "@/types";

import { supabase } from "@/lib/supabase";
import { MediaUploader } from "@/components/admin/media/MediaUploader";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
    getFolders,
    getMediaItems,
    updateMediaItem,
    deleteMediaItem,
    bulkUploadMedia,
    getAllUsedImageUrls,
    getAllFeaturedImageUrls,
    getAllRecipeStepImageMap,
} from "@/lib/services/mediaService";
import { MediaTile } from "@/components/admin/media/MediaTile";

export default function SiteImagesPage() {
    const [selectedFolder, setSelectedFolder] = useState<MediaFolder | null>(null);
    const [folders, setFolders] = useState<MediaFolder[]>([]);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [usedImageUrls, setUsedImageUrls] = useState<Set<string>>(new Set());
    const [featuredImageUrls, setFeaturedImageUrls] = useState<Set<string>>(new Set());
    const [stepImageMap, setStepImageMap] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);

    const { showNotification } = useNotification();
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();


    // Bulk selection state
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const contentAreaRef = useRef<HTMLDivElement>(null);

    // Redirect if not Super Admin
    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.push("/admin");
            showNotification("Access Denied", "You do not have permission to view Site Images.");
        }
    }, [isSuperAdmin, authLoading, router, showNotification]);

    // Initial load: Find "Site Images" folder
    useEffect(() => {
        const init = async () => {
            if (!isSuperAdmin) return;
            setIsLoading(true);

            try {
                const [folderData, usedUrls, featuredUrls, stepMap] = await Promise.all([
                    getFolders(),
                    getAllUsedImageUrls(),
                    getAllFeaturedImageUrls(),
                    getAllRecipeStepImageMap()
                ]);

                setFolders(folderData);

                // Find "site" folder and set as default
                const imagesFolder = folderData.find(f => f.slug === "site");
                if (imagesFolder) {
                    setSelectedFolder(imagesFolder);
                } else {
                    // Fallback to "Root" if no images folder found, but usually it should be seeded
                    setSelectedFolder({
                        id: null as any,
                        name: "Base Library",
                        slug: "base",
                        path: "/",
                        createdAt: new Date().toISOString()
                    });
                }

                setUsedImageUrls(usedUrls);
                setFeaturedImageUrls(featuredUrls);
                setStepImageMap(stepMap);
            } catch (err) {
                console.error('Failed to initialize Site Images page:', err);
                setError(err instanceof Error ? err.message : "Failed to load site images");
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading && isSuperAdmin) {
            init();
        }
    }, [isSuperAdmin, authLoading]);

    // Load media items when folder is identified
    const loadMediaItems = useCallback(async () => {
        setIsLoadingMedia(true);
        try {
            // Passing null specifically fetches items with folder_id = null (root)
            const items = await getMediaItems(selectedFolder?.id || null);
            setMediaItems(items);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load media");
            setMediaItems([]);
        } finally {
            setIsLoadingMedia(false);
        }
    }, [selectedFolder]);

    useEffect(() => {
        if (selectedFolder) {
            loadMediaItems();
        }
    }, [selectedFolder, loadMediaItems]);

    const handleUpload = async (files: File[]) => {
        if (!selectedFolder) return;
        await bulkUploadMedia(files, selectedFolder.id);
        await loadMediaItems();
        setIsUploaderOpen(false);
    };

    const handleSelectItem = (itemId: string) => {
        setSelectedItemId(selectedItemId === itemId ? null : itemId);
    };

    const handleUpdateItem = async (id: string, updates: Partial<MediaItem>) => {
        await updateMediaItem(id, updates);
        await loadMediaItems();
    };

    const handleDeleteItem = async (id: string) => {
        setIsActionLoading(true);
        try {
            const result = await deleteMediaItem(id);
            setSelectedItemId(null);
            await loadMediaItems();
            showNotification("File Deleted", result.filename);
        } catch (error) {
            console.error("Failed to delete item:", error);
            showNotification("Delete Failed", "An error occurred while deleting the file.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEnterBulkSelect = () => {
        setIsBulkSelectMode(true);
        setSelectedItems(new Set());
        setIsUploaderOpen(false);
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

            setShowBulkDeleteConfirm(false);
            handleExitBulkSelect();
            await loadMediaItems();
        } catch (error) {
            console.error("Bulk delete error:", error);
            showNotification("Delete Failed", error instanceof Error ? error.message : "An error occurred while deleting files.");
            setShowBulkDeleteConfirm(false);
        } finally {
            setIsActionLoading(false);
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <HeartLoader />
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    return (
        <>
            {/* Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-accent/10 rounded-lg flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-content-primary">Site Images</h1>
                            <p className="text-xs md:text-sm text-content-secondary mt-1">
                                Managing base library assets
                                {mediaItems.length > 0 && (
                                    <span className="ml-2 text-content-muted">• {mediaItems.length} items</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {mediaItems.length > 0 && !isBulkSelectMode && (
                            <button
                                onClick={handleEnterBulkSelect}
                                className="p-2 text-content-secondary hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors"
                                title="Bulk Select"
                            >
                                <CheckSquare className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            onClick={() => setIsUploaderOpen(true)}
                            className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2 flex items-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="hidden md:inline">Add Images</span>
                        </button>
                    </div>
                </div>

                {/* Bulk Selection Bar */}
                <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${isBulkSelectMode
                        ? "max-h-20 opacity-100 mt-4"
                        : "max-h-0 opacity-0 mt-0"
                        }`}
                >
                    <div className="flex items-center justify-between gap-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleSelectAll}
                                className="p-1.5 text-accent hover:text-accent-light transition-colors"
                            >
                                <CheckSquare className="h-5 w-5" />
                            </button>
                            <span className="text-sm text-content-primary font-medium">
                                {selectedItems.size === 0
                                    ? "Select images to delete"
                                    : `${selectedItems.size} selected`}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                disabled={selectedItems.size === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-40"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                            <button
                                onClick={handleExitBulkSelect}
                                className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                        {error}
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-[var(--media-panel-bg)] rounded-xl h-full flex flex-col shadow-sm transition-colors duration-200">
                    {/* Uploader Zone */}
                    <div
                        className={`overflow-hidden transition-all duration-500 ease-out ${isUploaderOpen
                            ? "max-h-[500px] opacity-100"
                            : "max-h-0 opacity-0"
                            }`}
                    >
                        {selectedFolder && (
                            <MediaUploader
                                isOpen={isUploaderOpen}
                                onClose={() => setIsUploaderOpen(false)}
                                onUpload={handleUpload}
                                folderName="the base library"
                                hideCloseButton={mediaItems.length === 0}
                            />
                        )}
                    </div>

                    {/* Content Area */}
                    <div ref={contentAreaRef} className="flex-1 overflow-auto p-4" onClick={() => setSelectedItemId(null)}>
                        {isLoadingMedia && mediaItems.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <HeartLoader />
                            </div>
                        ) : mediaItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                <ImageIcon className="h-16 w-16 text-accent/50 mb-4" />
                                <h3 className="text-lg font-semibold text-content-primary mb-2">No Images in Base Library</h3>
                                <p className="text-sm text-content-secondary max-w-sm">
                                    The base folder is currently empty. Start by uploading global assets like logos, banners, or place-holders.
                                </p>
                            </div>
                        ) : (
                            <div
                                className={`grid gap-4 md:gap-6 ${isBulkSelectMode ? "grid-cols-2" : "grid-cols-1"} md:grid-cols-6`}
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
                                            isGalleryImage={usedImageUrls.has(item.url)}
                                            isFeaturedImage={featuredImageUrls.has(item.url)}
                                            stepLabel={stepImageMap[item.url] !== undefined ? `Recipe Step ${stepImageMap[item.url]}` : undefined}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modals */}


            <ConfirmationModal
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={handleConfirmBulkDelete}
                title={`Delete ${selectedItems.size} Files?`}
                message={`This will permanently remove ${selectedItems.size} files from the Site Images library. This action cannot be undone.`}
                confirmLabel="Delete Everything"
                isDangerous
                isLoading={isActionLoading}
            />
        </>
    );
}
