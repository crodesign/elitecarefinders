import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocode';

export async function GET(req: NextRequest) {
    const query = req.nextUrl.searchParams.get('q');
    if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    const result = await geocodeAddress(query);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ lat: result[0], lng: result[1] });
}
