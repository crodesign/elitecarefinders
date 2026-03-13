import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

async function getAssignment(supabaseAdmin: ReturnType<typeof createAdminClient>, userId: string, entityId: string) {
    const { data } = await supabaseAdmin
        .from('user_entity_assignments')
        .select('id, entity_type')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .single();
    return data;
}

// GET /api/profile/listing/[id] — full wizard data for assigned entity
export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const supabase = createServerSupabase();
    const supabaseAdmin = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entityId = params.id;
    const userId = session.user.id;

    const assignment = await getAssignment(supabaseAdmin, userId, entityId);
    if (!assignment) return NextResponse.json({ error: 'Not assigned' }, { status: 403 });

    const table = assignment.entity_type === 'home' ? 'homes' : 'facilities';
    const { data, error } = await supabaseAdmin
        .from(table)
        .select('title, slug, status, description, excerpt, phone, email, address, images, team_images, cuisine_images, videos, room_details, taxonomy_entry_ids, local_user_draft, local_user_draft_status, local_user_locked_fields')
        .eq('id', entityId)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Resolve taxonomy entry names for identity display
    let taxonomyEntries: { id: string; name: string; parentName?: string }[] = [];
    const entryIds: string[] = data.taxonomy_entry_ids ?? [];
    if (entryIds.length > 0) {
        const { data: entries } = await supabaseAdmin
            .from('taxonomy_entries')
            .select('id, name, parent_id')
            .in('id', entryIds);
        if (entries && entries.length > 0) {
            const parentIds = (entries as any[]).map((e: any) => e.parent_id).filter(Boolean);
            let parentsMap: Record<string, string> = {};
            if (parentIds.length > 0) {
                const { data: parents } = await supabaseAdmin
                    .from('taxonomy_entries')
                    .select('id, name')
                    .in('id', parentIds);
                if (parents) {
                    parentsMap = Object.fromEntries((parents as any[]).map((p: any) => [p.id, p.name]));
                }
            }
            taxonomyEntries = (entries as any[]).map((e: any) => ({
                id: e.id,
                name: e.name,
                parentName: e.parent_id ? parentsMap[e.parent_id] : undefined,
            }));
        }
    }

    return NextResponse.json({
        ...data,
        entityType: assignment.entity_type,
        taxonomyEntries,
    });
}

// PATCH /api/profile/listing/[id] — save wizard step as draft
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const supabase = createServerSupabase();
    const supabaseAdmin = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entityId = params.id;
    const userId = session.user.id;

    const assignment = await getAssignment(supabaseAdmin, userId, entityId);
    if (!assignment) return NextResponse.json({ error: 'Not assigned to this entity' }, { status: 403 });

    const body = await request.json();
    const { step, data: stepData } = body;

    const table = assignment.entity_type === 'home' ? 'homes' : 'facilities';

    // Fetch current draft
    const { data: current } = await supabaseAdmin
        .from(table)
        .select('local_user_draft, local_user_draft_status')
        .eq('id', entityId)
        .single();

    const existingDraft: Record<string, any> = current?.local_user_draft ?? {};

    const ALLOWED_STEP_FIELDS: Record<string, string[]> = {
        information: ['description', 'excerpt', 'phone', 'email'],
        description: ['description', 'excerpt'],
        contact: ['phone', 'email'],
        care: ['levelOfCare', 'bedroomTypes', 'bathroomType', 'showerType', 'roomTypes', 'roomPrice'],
        amenities: ['customFields'],
        room_details: ['roomPrice', 'bedroomType', 'bathroomType', 'showerType', 'levelOfCare', 'roomTypes', 'languages', 'customFields'],
        photos: ['images', 'teamImages', 'cuisineImages'],
        videos: ['videos'],
    };

    const mergedDraft: Record<string, any> = { ...existingDraft };
    if (stepData) {
        const allowed = ALLOWED_STEP_FIELDS[step] ?? [];
        for (const field of allowed) {
            if (field in stepData) mergedDraft[field] = stepData[field];
        }
    }

    const { error } = await supabaseAdmin
        .from(table)
        .update({
            local_user_draft: mergedDraft,
            local_user_draft_status: current?.local_user_draft_status === 'pending_review' ? 'pending_review' : 'draft',
            updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, draft: mergedDraft });
}
