import { NextResponse } from 'next/server';

function extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}

// Parse ISO 8601 duration e.g. PT1H2M3S → "1:02:03", PT3M45S → "3:45"
function parseDuration(iso: string): string {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const h = parseInt(match[1] || '0');
    const m = parseInt(match[2] || '0');
    const s = parseInt(match[3] || '0');
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const videoId = extractYouTubeId(url);
    if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    const apiKey = process.env.YOUTUBE_API_KEY;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    if (!apiKey) {
        return NextResponse.json({ videoId, thumbnailUrl, duration: null, title: null });
    }

    try {
        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
        );
        const data = await res.json();

        const item = data.items?.[0];
        if (!item) return NextResponse.json({ videoId, thumbnailUrl, duration: null, title: null });

        const title = item.snippet?.title || null;
        const duration = item.contentDetails?.duration ? parseDuration(item.contentDetails.duration) : null;
        const apiThumb = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || thumbnailUrl;

        return NextResponse.json({ videoId, thumbnailUrl: apiThumb, duration, title });
    } catch {
        return NextResponse.json({ videoId, thumbnailUrl, duration: null, title: null });
    }
}
