"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { MediaItem, MediaFolder } from "@/types";
import { getMediaItems, deleteMediaItem, updateMediaItem, bulkUploadMedia } from "@/lib/services/mediaService";
import { MediaUploader } from "@/components/admin/media/MediaUploader";
import { MediaTile } from "@/components/admin/media/MediaTile";
import { useNotification } from "@/contexts/NotificationContext";

interface MediaGalleryProps {
    folderId: string | null;
    title?: string;
    className?: string;
    onMediaSelect?: (media: MediaItem) => void;
    folders?: MediaFolder[];
}

export function MediaGallery({ folderId, title = "Media Gallery", className = "", onMediaSelect, folders = [] }: MediaGalleryProps) {
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const { showNotification } = useNotification();

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
            // @ts-ignore - mismatch in build vs dev environment for bulkUploadMedia signature
            await bulkUploadMedia(files, folderId);
            showNotification("Upload complete", `${files.length} file(s) uploaded.`);
            await loadMedia();
        } catch (err) {
            console.error("Upload failed:", err);
            showNotification("Upload failed", "Some files could not be uploaded.", "error");
        }
    };

    const handleUpdateItem = async (id: string, updates: Partial<MediaItem>) => {
        await loadMedia();
    };

    const handleDeleteItem = async (id: string) => {
        if (!confirm("Are you sure you want to delete this image?")) return;

        try {
            // @ts-ignore - mismatch in build vs dev environment
            await deleteMediaItem(id);
            showNotification("Image deleted");
            await loadMedia();
        } catch (err) {
            console.error("Delete failed:", err);
            showNotification("Delete failed", "Could not delete image.", "error");
        }
    };

    if (!folderId) {
        return (
            <div className={`p-8 text-center border border-dashed border-white/10 rounded-xl ${className}`}>
                <p className="text-zinc-500">No folder selected. Save the location details first.</p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">{title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadMedia}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    {mediaItems.length > 0 && (
                        <button
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
                                isSelected={selectedItemId === item.id}
                                folders={folders}
                                onClick={() => setSelectedItemId(item.id)}
                                onUpdate={handleUpdateItem}
                                onDelete={handleDeleteItem}
                                onClose={() => setSelectedItemId(null)}
                                showUrlField={false}
                                showFolderMove={false}
                                showDimensions={false}
                                onMediaSelect={onMediaSelect}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
