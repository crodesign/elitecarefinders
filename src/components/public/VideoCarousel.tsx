'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FeaturedVideoItem } from '@/lib/public-db';

function getYouTubeId(url: string): string | null {
    const patterns = [
        /youtube\.com\/watch\?v=([^&\n?#]+)/,
        /youtu\.be\/([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export function VideoCarousel({ items }: { items: FeaturedVideoItem[] }) {
    const [current, setCurrent] = useState(0);
    const [playing, setPlaying] = useState(false);

    if (!items.length) return null;

    const item = items[current];
    const videoId = getYouTubeId(item.videoUrl);
    const thumbSrc = item.entityImage || item.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null);
    const entityPath = item.entityType === 'home' ? `/homes/${item.entitySlug}` : `/facilities/${item.entitySlug}`;

    function select(idx: number) {
        setCurrent(idx);
        setPlaying(false);
    }

    return (
        <section className="max-w-6xl mx-auto px-5 py-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Featured Video</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Walkthrough Tours</h2>

            {/* Both columns stretch to the same height (grid drives height) */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">

                {/* Main player column */}
                <div className="flex-1 min-w-0 flex flex-col bg-gray-100 rounded-2xl overflow-hidden shadow-xl">
                    <div className="relative bg-gray-200 aspect-video lg:aspect-auto lg:flex-1 overflow-hidden">
                        {playing && videoId ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                allow="autoplay; fullscreen"
                                className="absolute inset-0 w-full h-full border-0"
                                title={item.entityTitle}
                            />
                        ) : thumbSrc ? (
                            <button
                                onClick={() => setPlaying(true)}
                                className="absolute inset-0 w-full h-full group"
                                aria-label={`Play video for ${item.entityTitle}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={thumbSrc} alt={item.entityTitle} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                                    <div className="w-[106px] h-[106px] rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                                        <svg className="w-[88px] h-[88px] text-[#239ddb] ml-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                        ) : null}
                    </div>
                    <div className="flex items-end justify-between gap-3 p-[10px]">
                        <div className="min-w-0">
                            <Link href={entityPath} className="font-semibold text-gray-900 hover:text-[#239ddb] transition-colors truncate block">
                                {item.entityTitle}
                            </Link>
                            {item.caption && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.caption}</p>}
                        </div>
                        <Link href={entityPath} className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#239ddb] hover:bg-[#1d8bc4] transition-colors rounded-lg px-4 py-1.5">
                            Explore this {item.entityType === 'home' ? 'Home' : 'Facility'}
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </Link>
                    </div>
                </div>

                {/* Right: 2-col grid — natural height drives both columns */}
                {items.length > 1 && (
                    <div className="lg:w-[40%] flex-shrink-0 grid grid-cols-2 gap-2">
                        {items.map((v, i) => {
                            const vid = getYouTubeId(v.videoUrl);
                            const thumb = v.entityImage || v.thumbnailUrl || (vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : null);
                            const isActive = i === current;
                            return (
                                <button
                                    key={i}
                                    onClick={() => select(i)}
                                    className={`relative rounded-xl overflow-hidden aspect-video group ${isActive ? 'ring-2 ring-[#239ddb] ring-offset-1' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-gray-100" />
                                    {thumb && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={thumb} alt={v.entityTitle} className={`absolute inset-0 w-full h-full object-cover ${!isActive ? 'group-hover:scale-[1.04] transition-transform duration-200' : ''}`} />
                                    )}
                                    {!isActive && <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />}
                                    {isActive && <div className="absolute inset-0 bg-[#239ddb]/20" />}
                                    <div className="absolute bottom-0 left-[20px] right-[20px] bg-white rounded-t-lg px-2 py-1.5 text-center">
                                        <span className="text-gray-900 text-[10px] font-medium line-clamp-1 leading-tight">{v.entityTitle}</span>
                                    </div>
                                    {!isActive && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-90 transition-opacity">
                                            <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-[#239ddb] ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

        </section>
    );
}
