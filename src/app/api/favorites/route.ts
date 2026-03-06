import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getFavoritesByUser, addFavorite, removeFavorite, mergeFavorites } from '@/lib/services/favoritesService';

async function getAuthUserId(): Promise<string | null> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user.id ?? null;
}

// GET /api/favorites
export async function GET() {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const favorites = await getFavoritesByUser(userId);
        return NextResponse.json(favorites);
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// POST /api/favorites — add one, or merge batch if body has `items` array
export async function POST(request: Request) {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();

        // Batch merge (called after login to sync cookie favorites)
        if (Array.isArray(body.items)) {
            await mergeFavorites(userId, body.items);
            return NextResponse.json({ ok: true });
        }

        // Single add
        await addFavorite(userId, {
            type: body.type,
            entityId: body.entityId,
            entitySlug: body.entitySlug,
            entityTitle: body.entityTitle,
            entityImage: body.entityImage,
        });
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}

// DELETE /api/favorites?type=home&entityId=uuid
export async function DELETE(request: Request) {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const entityId = searchParams.get('entityId');

    if (!type || !entityId) {
        return NextResponse.json({ error: 'Missing type or entityId' }, { status: 400 });
    }

    try {
        await removeFavorite(userId, type, entityId);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
