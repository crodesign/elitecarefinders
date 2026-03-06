'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faXmark, faBorderAll, faImage, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { VideoEntry } from '@/types';

type GalleryItem =
    | { type: 'image'; url: string; alt?: string; caption?: string }
    | { type: 'video'; url: string; caption?: string; thumbnailUrl?: string };

function toEmbedUrl(url: string): string | null {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v');
            return v ? `https://www.youtube.com/embed/${v}` : null;
        }
        if (u.hostname === 'youtu.be') {
            const v = u.pathname.slice(1);
            return v ? `https://www.youtube.com/embed/${v}` : null;
        }
        if (u.hostname.includes('vimeo.com')) {
            const v = u.pathname.split('/').filter(Boolean).pop();
            return v ? `https://player.vimeo.com/video/${v}` : null;
        }
        return null;
    } catch {
        return null;
    }
}

function isDirectVideo(url: string) {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

// ─── Tile (pure display, no button wrapper) ────────────────────────────────

function TileContent({ item, index, moreCount }: {
    item: GalleryItem;
    index: number;
    moreCount?: number;
}) {
    return (
        <div className="relative w-full h-full group-hover:[&_img]:scale-[1.03] overflow-hidden">
            {item.type === 'image' ? (
                <img
                    src={item.url}
                    alt={item.alt || ''}
                    className="w-full h-full object-cover transition-transform duration-500"
                    loading={index === 0 ? 'eager' : 'lazy'}
                />
            ) : (
                <>
                    {item.thumbnailUrl
                        ? <img src={item.thumbnailUrl} alt={item.caption || ''} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-800" />
                    }
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                        <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center">
                            <FontAwesomeIcon icon={faPlay} className="h-6 w-6 text-white ml-1" />
                        </div>
                    </div>
                </>
            )}

            {/* "+N more" count overlay — on last visible thumb */}
            {moreCount != null && moreCount > 0 && (
                <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white gap-1.5 pointer-events-none">
                    <span className="text-3xl font-bold leading-none">+{moreCount}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest opacity-75">more photos</span>
                </div>
            )}
        </div>
    );
}

// ─── Lightbox Modal ────────────────────────────────────────────────────────

type ImageItem = Extract<GalleryItem, { type: 'image' }>;

function LightboxModal({ items, startIndex, onClose }: {
    items: GalleryItem[];
    startIndex: number;
    onClose: () => void;
}) {
    const imageItems = items
        .map((item, i) => ({ item, globalIndex: i }))
        .filter((x): x is { item: ImageItem; globalIndex: number } => x.item.type === 'image');

    const [pos, setPos] = useState(() => {
        const idx = imageItems.findIndex(x => x.globalIndex === startIndex);
        return idx >= 0 ? idx : 0;
    });

    const hasPrev = pos > 0;
    const hasNext = pos < imageItems.length - 1;
    const current = imageItems[pos];

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && pos > 0) setPos(p => p - 1);
            if (e.key === 'ArrowRight' && pos < imageItems.length - 1) setPos(p => p + 1);
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [pos, imageItems.length, onClose]);

    if (!current) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col">
            {/* Top bar */}
            <div className="flex-shrink-0 h-14 flex items-center justify-between px-4 border-b border-gray-100">
                <span className="text-sm text-gray-400 font-medium tabular-nums">
                    {pos + 1} / {imageItems.length}
                </span>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                </button>
            </div>

            {/* Image area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden px-14 py-6">
                {hasPrev && (
                    <button
                        onClick={() => setPos(p => p - 1)}
                        className="absolute left-3 p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors z-10"
                        aria-label="Previous"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} className="h-5 w-5" />
                    </button>
                )}

                <div className="flex flex-col items-center gap-3 max-h-full max-w-full">
                    <img
                        src={current.item.url}
                        alt={current.item.alt || ''}
                        className="max-h-[calc(100vh-160px)] max-w-full object-contain rounded-lg shadow-sm"
                    />
                    {current.item.caption && (
                        <p className="text-sm text-gray-600 font-medium text-center px-4">{current.item.caption}</p>
                    )}
                </div>

                {hasNext && (
                    <button
                        onClick={() => setPos(p => p + 1)}
                        className="absolute right-3 p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors z-10"
                        aria-label="Next"
                    >
                        <FontAwesomeIcon icon={faChevronRight} className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Gallery Modal (Scrolling) ─────────────────────────────────────────────

function GalleryModal({ items, onClose, onImageClick }: {
    items: GalleryItem[];
    onClose: () => void;
    onImageClick: (globalIndex: number) => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const videos = items.filter(it => it.type === 'video');
    const imageItems = items
        .map((item, i) => ({ item, globalIndex: i }))
        .filter((x): x is { item: ImageItem; globalIndex: number } => x.item.type === 'image');

    return (
        <div className="fixed inset-0 z-[100] bg-white/50 backdrop-blur-md flex flex-col pt-14" onClick={onClose}>
            {/* Top fixed bar */}
            <div className="absolute top-0 inset-x-0 h-14 bg-[#239ddb] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase text-sm">
                    <FontAwesomeIcon icon={faImage} className="h-5 w-5" />
                    {"PHOTO GALLERY"}
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-6 w-6" />
                </button>
            </div>

            {/* Scrolling Content */}
            <div className="flex-1 overflow-y-auto w-full">
                <div className="max-w-[640px] mx-5 sm:mx-auto bg-white p-5 pb-0 space-y-8 shadow-2xl rounded-b-xl mb-[30px]" onClick={e => e.stopPropagation()}>

                    {/* Videos Section */}
                    {videos.length > 0 && (
                        <div className="space-y-6">
                            {videos.map((item, i) => (
                                <div key={`video-${i}`} className="relative w-full bg-black rounded-lg overflow-hidden ">
                                    {isDirectVideo(item.url) ? (
                                        <video src={item.url} controls className="w-full aspect-video" />
                                    ) : (
                                        <iframe
                                            src={toEmbedUrl(item.url) || item.url}
                                            className="w-full aspect-video"
                                            allow="fullscreen"
                                            allowFullScreen
                                        />
                                    )}
                                    {item.caption && (
                                        <div className="absolute bottom-0 left-0 right-0 px-5 pointer-events-none">
                                            <div className="rounded-t-lg bg-white px-3 py-1.5 text-sm text-gray-800 font-medium text-center">
                                                {item.caption}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Images Section */}
                    {imageItems.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] pb-5">
                            {imageItems.map(({ item, globalIndex }, i) => (
                                <button
                                    key={`image-${i}`}
                                    type="button"
                                    onClick={() => onImageClick(globalIndex)}
                                    className={`group w-full bg-gray-50 rounded-lg overflow-hidden  text-left cursor-zoom-in ${i === 0 ? 'sm:col-span-2' : ''}`}
                                >
                                    <div className="relative w-full overflow-hidden bg-gray-200/50" style={{ paddingBottom: '100%' }}>
                                        <img
                                            src={item.url}
                                            alt={item.alt || ''}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                            loading={i < 2 ? 'eager' : 'lazy'}
                                        />
                                        {item.caption && (
                                            <div className="absolute bottom-0 left-0 right-0 px-5">
                                                <div className="rounded-t-lg bg-white px-3 py-1.5 text-sm text-gray-800 font-medium text-center">
                                                    {item.caption}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

// ─── Hero Gallery ──────────────────────────────────────────────────────────

interface HeroGalleryProps {
    images: { url: string; caption?: string }[] | string[];
    videos?: VideoEntry[];
    title: string;
    featuredLabel?: string;
}

export function HeroGallery({ images, videos = [], title, featuredLabel }: HeroGalleryProps) {
    const [showGallery, setShowGallery] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const items: GalleryItem[] = [
        ...images.map((img, i) => {
            if (typeof img === 'string') return { type: 'image' as const, url: img, alt: `${title} - Photo ${i + 1}` };
            const alt = img.caption ? `${title} - ${img.caption}` : `${title} - Photo ${i + 1}`;
            return { type: 'image' as const, url: img.url, alt, caption: img.caption };
        }),
        ...videos.map(v => ({ type: 'video' as const, url: v.url, caption: v.caption, thumbnailUrl: v.thumbnailUrl })),
    ];

    const total = items.length;
    if (total === 0) return null;

    const handleGalleryImageClick = (globalIndex: number) => {
        setShowGallery(false);
        setLightboxIndex(globalIndex);
    };

    // Visible: large (index 0) + up to 4 thumbs (indices 1-4) = max 5
    const thumbs = items.slice(1, 5);
    const remaining = total - 5;

    return (
        <>
            <div className="relative">

                {/* ── Main grid ── */}
                <div className="flex flex-col md:flex-row gap-1 md:h-[440px] rounded-xl overflow-hidden">

                    {/* Featured image — square on mobile, 50% width on desktop */}
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setShowGallery(true)}
                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setShowGallery(true)}
                        className="group relative w-full md:w-1/2 shrink-0 overflow-hidden bg-gray-100 aspect-square md:aspect-auto cursor-pointer"
                        aria-label="Open gallery"
                    >
                        <TileContent item={items[0]} index={0} />
                        {videos.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="flex items-center gap-2 bg-[#239ddb] text-white text-sm uppercase tracking-widest px-4 py-1.5 rounded-lg shadow-lg">
                                    Watch Videos
                                    <FontAwesomeIcon icon={faPlay} className="h-3.5 w-3.5" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Thumbnails — horizontal row on mobile, 2×2 grid on desktop */}
                    {thumbs.length > 0 && (
                        <div className="relative md:flex-1 md:min-w-0">
                            <div
                                className="grid grid-cols-4 md:grid-cols-2 gap-1 overflow-hidden rounded-b-xl md:rounded-b-none md:rounded-r-xl h-full md:[grid-template-rows:1fr_1fr]"
                            >
                                {thumbs.map((item, i) => {
                                    const globalIdx = i + 1;
                                    const isLastVisible = i === 3;
                                    const extra = isLastVisible && remaining > 0 ? remaining : undefined;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setShowGallery(true)}
                                            className="group relative overflow-hidden bg-gray-100 aspect-square md:aspect-auto"
                                            aria-label={`View photo ${globalIdx + 1}`}
                                        >
                                            <TileContent item={item} index={globalIdx} moreCount={extra} />
                                        </button>
                                    );
                                })}
                            </div>
                            {/* View Gallery — mobile only, overlaps bottom of thumbnail row */}
                            {total > 1 && (
                                <div className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 z-10">
                                    <button
                                        type="button"
                                        onClick={() => setShowGallery(true)}
                                        className="flex items-center gap-2 bg-white text-[#239ddb] text-sm uppercase px-4 py-1 rounded-t-lg hover:bg-gray-50 transition-colors"
                                    >
                                        View Gallery
                                        <FontAwesomeIcon icon={faBorderAll} className="h-4 w-4 text-[#239ddb]" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Featured label — top-center ── */}
                {featuredLabel && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                        <div className="bg-green-600 text-white text-sm uppercase tracking-widest px-4 py-1 rounded-b-lg shadow-lg">
                            {featuredLabel}
                        </div>
                    </div>
                )}

                {/* ── VIEW GALLERY button — desktop only, bottom-centered over full gallery ── */}
                {total > 1 && (
                    <div className="hidden md:block absolute bottom-0 left-1/2 -translate-x-1/2 z-10">
                        <button
                            type="button"
                            onClick={() => setShowGallery(true)}
                            className="flex items-center gap-2 bg-white text-[#239ddb] text-sm uppercase px-4 py-1 rounded-t-lg hover:bg-gray-50 transition-colors"
                        >
                            View Gallery
                            <FontAwesomeIcon icon={faBorderAll} className="h-4 w-4 text-[#239ddb]" />
                        </button>
                    </div>
                )}

            </div>

            {showGallery && (
                <GalleryModal
                    items={items}
                    onClose={() => setShowGallery(false)}
                    onImageClick={handleGalleryImageClick}
                />
            )}

            {lightboxIndex !== null && (
                <LightboxModal
                    items={items}
                    startIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </>
    );
}
