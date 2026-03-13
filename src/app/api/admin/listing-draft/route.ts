import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// POST /api/admin/listing-draft — approve or reject a pending local user draft
export async function POST(request: Request) {
    const supabase = createServerSupabase();
    const supabaseAdmin = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify caller is at least system_admin
    const { data: role } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

    const adminRoles = ['super_admin', 'system_admin', 'regional_manager', 'location_manager'];
    if (!role || !adminRoles.includes(role.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { entityId, entityType, action } = await request.json();
    if (!entityId || !entityType || !['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const table = entityType === 'home' ? 'homes' : 'facilities';

    if (action === 'reject') {
        const { error } = await supabaseAdmin
            .from(table)
            .update({
                local_user_draft: null,
                local_user_draft_status: 'none',
                updated_at: new Date().toISOString(),
            })
            .eq('id', entityId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    // Approve: fetch draft and apply to live fields
    const { data: entity } = await supabaseAdmin
        .from(table)
        .select('local_user_draft')
        .eq('id', entityId)
        .single();

    if (!entity?.local_user_draft) {
        return NextResponse.json({ error: 'No draft to approve' }, { status: 400 });
    }

    const draft: Record<string, any> = entity.local_user_draft;

    // Map draft keys → DB column names
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (draft.description !== undefined) updates.description = draft.description;
    if (draft.excerpt !== undefined) updates.excerpt = draft.excerpt;
    if (draft.phone !== undefined) updates.phone = draft.phone;
    if (draft.email !== undefined) updates.email = draft.email;
    if (draft.images !== undefined) updates.images = draft.images;
    if (draft.teamImages !== undefined) updates.team_images = draft.teamImages;
    if (draft.cuisineImages !== undefined) updates.cuisine_images = draft.cuisineImages;
    if (draft.videos !== undefined) updates.videos = draft.videos;

    // Care/room_details fields — merge into room_details JSONB
    const careKeys = ['levelOfCare', 'bedroomTypes', 'bathroomType', 'showerType', 'roomTypes', 'roomPrice'];
    const roomDetailUpdates: Record<string, any> = {};
    for (const k of careKeys) {
        if (draft[k] !== undefined) roomDetailUpdates[k] = draft[k];
    }
    if (draft.customFields !== undefined) roomDetailUpdates.customFields = draft.customFields;

    if (Object.keys(roomDetailUpdates).length > 0) {
        // Fetch existing room_details to merge
        const { data: current } = await supabaseAdmin
            .from(table)
            .select('room_details')
            .eq('id', entityId)
            .single();
        updates.room_details = { ...(current?.room_details ?? {}), ...roomDetailUpdates };
    }

    // Clear draft after applying
    updates.local_user_draft = null;
    updates.local_user_draft_status = 'none';

    const { error } = await supabaseAdmin.from(table).update(updates).eq('id', entityId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
