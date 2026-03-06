import { createAdminClient } from '@/lib/supabase-server';
import type { Favorite } from '@/types';

function toFavorite(row: Record<string, any>): Favorite {
    return {
        id: row.id,
        type: row.entity_type,
        entityId: row.entity_id,
        entitySlug: row.entity_slug,
        entityTitle: row.entity_title ?? undefined,
        entityImage: row.entity_image ?? undefined,
        createdAt: row.created_at,
    };
}

export async function getFavoritesByUser(userId: string): Promise<Favorite[]> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toFavorite);
}

export async function addFavorite(userId: string, item: Omit<Favorite, 'id' | 'createdAt'>): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('user_favorites')
        .upsert({
            user_id: userId,
            entity_type: item.type,
            entity_id: item.entityId,
            entity_slug: item.entitySlug,
            entity_title: item.entityTitle ?? null,
            entity_image: item.entityImage ?? null,
        }, { onConflict: 'user_id,entity_type,entity_id' });
    if (error) throw new Error(error.message);
}

export async function removeFavorite(userId: string, type: string, entityId: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('entity_type', type)
        .eq('entity_id', entityId);
    if (error) throw new Error(error.message);
}

export async function mergeFavorites(userId: string, items: Omit<Favorite, 'id' | 'createdAt'>[]): Promise<void> {
    if (items.length === 0) return;
    const supabase = createAdminClient();
    const rows = items.map(item => ({
        user_id: userId,
        entity_type: item.type,
        entity_id: item.entityId,
        entity_slug: item.entitySlug,
        entity_title: item.entityTitle ?? null,
        entity_image: item.entityImage ?? null,
    }));
    const { error } = await supabase
        .from('user_favorites')
        .upsert(rows, { onConflict: 'user_id,entity_type,entity_id' });
    if (error) throw new Error(error.message);
}
