"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Loader2, Youtube, X } from "lucide-react";
import type { VideoEntry } from "@/types";
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
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface VideosTabContentProps {
    videos: VideoEntry[];
    setVideos: (videos: VideoEntry[]) => void;
    setIsDirty: (value: boolean) => void;
    entityTitle: string;
}

function extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}

export function VideosTabContent({ videos, setVideos, setIsDirty, entityTitle }: VideosTabContentProps) {
    const [urlInput, setUrlInput] = useState("");
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = videos.findIndex(v => v.url === active.id);
            const newIndex = videos.findIndex(v => v.url === over.id);
            setVideos(arrayMove(videos, oldIndex, newIndex));
            setIsDirty(true);
        }
    };

    const handleAdd = async () => {
        const trimmed = urlInput.trim();
        if (!trimmed) return;

        if (!extractYouTubeId(trimmed)) {
            setFetchError("Please enter a valid YouTube URL.");
            return;
        }

        setIsFetching(true);
        setFetchError(null);

        try {
            const res = await fetch(`/api/video-meta?url=${encodeURIComponent(trimmed)}`);
            const meta = await res.json();

            const entry: VideoEntry = {
                url: trimmed,
                caption: meta.title || "",
                duration: meta.duration || undefined,
                thumbnailUrl: meta.thumbnailUrl || undefined,
            };

            setVideos([...videos, entry]);
            setIsDirty(true);
            setUrlInput("");
        } catch {
            setFetchError("Failed to fetch video info. The video will still be added.");
            const entry: VideoEntry = {
                url: trimmed,
                thumbnailUrl: (() => {
                    const id = extractYouTubeId(trimmed);
                    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
                })(),
            };
            setVideos([...videos, entry]);
            setIsDirty(true);
            setUrlInput("");
        } finally {
            setIsFetching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
        }
    };

    const handleDelete = (index: number) => {
        setVideos(videos.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    const handleCaptionChange = (index: number, caption: string) => {
        const updated = videos.map((v, i) => i === index ? { ...v, caption } : v);
        setVideos(updated);
        setIsDirty(true);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* URL Input */}
            <div className="flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                    <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5">
                        <Youtube className="h-4 w-4 text-red-500" />
                        YouTube URL
                    </label>
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => { setUrlInput(e.target.value); setFetchError(null); }}
                        onKeyDown={handleKeyDown}
                        className="form-input text-sm text-left w-full h-8 rounded-md px-3 flex-1"
                        placeholder="https://www.youtube.com/watch?v=..."
                        disabled={isFetching}
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={isFetching || !urlInput.trim()}
                        className="px-4 h-8 text-sm font-medium rounded-md flex items-center gap-2 bg-accent text-white hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        {isFetching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        Add Video
                    </button>
                </div>
                {fetchError && (
                    <p className="text-xs text-red-400 pl-1">{fetchError}</p>
                )}
            </div>

            {/* Video Gallery */}
            <div className="bg-surface-input rounded-lg p-4 flex-1 min-h-0 overflow-y-auto" style={{ border: '2px solid var(--form-border)' }}>
                {videos.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center border border-dashed border-ui-border rounded-xl py-16">
                        <Youtube className="h-10 w-10 text-content-muted opacity-30 mb-3" />
                        <p className="text-content-secondary text-sm font-medium">No videos added yet</p>
                        <p className="text-content-muted text-xs mt-1">Paste a YouTube URL above to add a video for {entityTitle || "this listing"}.</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={videos.map(v => v.url)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                                {videos.map((video, index) => (
                                    <VideoTile
                                        key={video.url}
                                        id={video.url}
                                        video={video}
                                        onDelete={() => handleDelete(index)}
                                        onCaptionChange={(caption) => handleCaptionChange(index, caption)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
}

interface VideoTileProps {
    id: string;
    video: VideoEntry;
    onDelete: () => void;
    onCaptionChange: (caption: string) => void;
}

function VideoTile({ id, video, onDelete, onCaptionChange }: VideoTileProps) {
    const [caption, setCaption] = useState(video.caption || "");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const captionChanged = caption !== (video.caption || "");

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    useEffect(() => {
        if (!isModalOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsModalOpen(false); };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isModalOpen]);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleCaptionBlur = () => {
        if (caption !== (video.caption || "")) {
            onCaptionChange(caption);
        }
    };

    const handleCaptionKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (caption !== (video.caption || "")) {
                onCaptionChange(caption);
            }
            (e.target as HTMLInputElement).blur();
        }
    };

    const videoId = extractYouTubeId(video.url);
    const thumbnail = video.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
    const isShorts = /youtube\.com\/shorts\//.test(video.url);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="relative rounded-xl overflow-hidden group cursor-grab active:cursor-grabbing touch-none"
        >
            {/* Thumbnail */}
            <div className={`relative w-full ${isShorts ? "aspect-[9/16]" : "aspect-video"} bg-surface-input rounded-xl overflow-hidden`}>
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={video.caption || "Video thumbnail"}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Youtube className="h-8 w-8 text-content-muted opacity-40" />
                    </div>
                )}

                {/* Play button */}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                >
                    <div className="w-10 h-7 bg-red-600 rounded-md flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5" />
                    </div>
                </button>

                {/* Duration badge */}
                {video.duration && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-lg bg-[var(--media-dim-label-bg)] text-[var(--media-dim-label-text)] shadow-sm text-[10px] font-medium flex items-center gap-1 backdrop-blur-md pointer-events-none">
                        {video.duration}
                    </div>
                )}

                {/* Delete button */}
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onDelete}
                    className="absolute top-2 right-2 p-1.5 rounded-lg shadow-sm backdrop-blur-md bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] opacity-50 group-hover:opacity-100 hover:bg-[var(--media-edit-btn-hover-bg)] hover:text-red-500 transition-all cursor-pointer"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {/* Caption overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className={`relative rounded-lg focus-within:ring-2 focus-within:ring-accent bg-[var(--media-edit-btn-bg)] text-[var(--media-edit-btn-text)] backdrop-blur-md`}>
                    <input
                        type="text"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        onBlur={handleCaptionBlur}
                        onKeyDown={handleCaptionKeyDown}
                        onPointerDown={(e) => e.stopPropagation()}
                        placeholder="Add caption..."
                        className={`overlay-input w-full text-xs bg-transparent outline-none placeholder:opacity-40 font-medium rounded-lg px-2 py-1.5 ${captionChanged ? 'pr-12' : ''}`}
                    />
                    {captionChanged && (
                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onCaptionChange(caption); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] bg-accent text-white rounded-md hover:bg-accent-light transition-colors font-medium"
                        >
                            Save
                        </button>
                    )}
                </div>
            </div>

            {/* Video modal */}
            {isModalOpen && videoId && createPortal(
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className={`relative mx-4 ${isShorts ? "h-[80vh] aspect-[9/16]" : "w-full max-w-4xl aspect-video"}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                            className="w-full h-full rounded-xl"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                        />
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="absolute -top-10 right-0 p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
