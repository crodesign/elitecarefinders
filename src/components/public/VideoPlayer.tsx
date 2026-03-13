'use client';

import { useState } from 'react';

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

function toAutoplayEmbed(url: string): string {
    try {
        const u = new URL(url);
        if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
            return `https://www.youtube.com/embed/${u.searchParams.get('v')}?autoplay=1`;
        }
        if (u.hostname === 'youtu.be') {
            return `https://www.youtube.com/embed${u.pathname}?autoplay=1`;
        }
        if (u.hostname.includes('youtube.com')) {
            const shorts = u.pathname.match(/\/shorts\/([^/?#]+)/);
            if (shorts) return `https://www.youtube.com/embed/${shorts[1]}?autoplay=1`;
        }
        if (u.hostname.includes('vimeo.com')) {
            const id = u.pathname.split('/').filter(Boolean).pop();
            return `https://player.vimeo.com/video/${id}?autoplay=1`;
        }
    } catch {}
    return url;
}

export function VideoPlayer({ url, title, className = '' }: { url: string; title: string; className?: string }) {
    const [playing, setPlaying] = useState(false);

    const videoId = getYouTubeId(url);
    const thumbSrc = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

    if (playing) {
        return (
            <iframe
                src={toAutoplayEmbed(url)}
                allow="autoplay; fullscreen"
                allowFullScreen
                className={`absolute inset-0 w-full h-full border-0 ${className}`}
                title={title}
            />
        );
    }

    return (
        <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full group"
            aria-label={`Play video: ${title}`}
        >
            {thumbSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbSrc} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
            ) : (
                <div className="w-full h-full bg-gray-900" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                <div className="w-[106px] h-[106px] rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                    <svg className="w-[88px] h-[88px] text-[#239ddb] ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>
        </button>
    );
}
