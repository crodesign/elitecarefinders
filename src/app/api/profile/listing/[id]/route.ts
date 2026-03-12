import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/profile/listing/[id] — fetch editable fields for the assigned entity
export async function GET(_request: Request, { params }: { params: { id: string } }) {
    const supabase = createServerSupabase();
    const supabaseAdmin = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entityId = params.id;
    const userId = session.user.id;

    const { data: assignment } = await supabaseAdmin
        .from('user_entity_assignments')
        .select('entity_type')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .single();

    if (!assignment) return NextResponse.json({ error: 'Not assigned' }, { status: 403 });

    const table = assignment.entity_type === 'home' ? 'homes' : 'facilities';
    const { data, error } = await supabaseAdmin
        .from(table)
        .select('description, phone, email')
        .eq('id', entityId)
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// PATCH /api/profile/listing/[id] — local user updates their assigned entity
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const supabase = createServerSupabase();
    const supabaseAdmin = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entityId = params.id;
    const userId = session.user.id;

    // Verify the user actually has an assignment to this entity
    const { data: assignment } = await supabaseAdmin
        .from('user_entity_assignments')
        .select('id, entity_type')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .single();

    if (!assignment) {
        return NextResponse.json({ error: 'Not assigned to this entity' }, { status: 403 });
    }

    const body = await request.json();
    const { description, phone, email } = body;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (description !== undefined) updates.description = description;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;

    const table = assignment.entity_type === 'home' ? 'homes' : 'facilities';
    const { error } = await supabaseAdmin.from(table).update(updates).eq('id', entityId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
