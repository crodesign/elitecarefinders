import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
        return NextResponse.json({ error: "UNSPLASH_ACCESS_KEY not configured" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const page = searchParams.get("page") || "1";

    if (!q.trim()) {
        return NextResponse.json({ results: [], total: 0, totalPages: 0 });
    }

    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=20&orientation=landscape`;
    const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Unsplash API error: ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
        results: data.results.map((photo: any) => ({
            id: photo.id,
            thumbUrl: photo.urls.small,
            downloadUrl: photo.urls.regular,
            downloadLocation: photo.links.download_location,
            description: photo.alt_description || photo.description || "",
            photographer: photo.user.name,
            photographerUrl: photo.user.links.html,
        })),
        total: data.total,
        totalPages: data.total_pages,
    });
}
