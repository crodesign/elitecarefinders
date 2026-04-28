'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils } from '@fortawesome/free-solid-svg-icons';
import { GalleryModal, LightboxModal, TileContent, type GalleryItem } from './HeroGallery';

interface DiningGalleryProps {
    images: { url: string; caption?: string }[];
    title: string;
}

const MAX_VISIBLE = 6;

export function DiningGallery({ images, title }: DiningGalleryProps) {
    const [showGallery, setShowGallery] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    if (images.length === 0) return null;

    const items: GalleryItem[] = images.map((img, i) => ({
        type: 'image' as const,
        url: img.url,
        alt: img.caption ? `${title} - ${img.caption}` : `${title} - Cuisine ${i + 1}`,
        caption: img.caption,
    }));

    const visible = items.slice(0, MAX_VISIBLE);
    const remaining = items.length - MAX_VISIBLE;

    const handleGalleryImageClick = (globalIndex: number) => {
        setShowGallery(false);
        setLightboxIndex(globalIndex);
    };

    return (
        <>
            <div className="bg-[#f0f8fc] rounded-xl p-6">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                        <FontAwesomeIcon icon={faUtensils} className="h-4 w-4 text-white" />
                    </span>
                    Dining &amp; Cuisine
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
                    {visible.map((item, i) => {
                        const isLastVisible = i === visible.length - 1;
                        const extra = isLastVisible && remaining > 0 ? remaining : undefined;
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setShowGallery(true)}
                                className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 cursor-zoom-in"
                                aria-label={`View cuisine photo ${i + 1}`}
                            >
                                <TileContent item={item} index={i} moreCount={extra} />
                            </button>
                        );
                    })}
                </div>
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
