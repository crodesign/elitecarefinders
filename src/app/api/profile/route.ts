import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/profile - Get current user's profile
export async function GET() {
    const supabaseAdmin = createAdminClient();
    const supabase = createServerSupabase();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch profile
    const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch role
    const { data: role } = await supabase
        .from('user_roles')
        .select('role, display_name')
        .eq('user_id', userId)
        .single();

    let managerName = undefined;
    if (profile?.manager_id) {
        const { data: managerProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', profile.manager_id)
            .single();
        if (managerProfile) {
            managerName = managerProfile.full_name;
        }
    }

    // Fetch location assignments (use admin client to bypass RLS)
    const { data: locationAssignments } = await supabaseAdmin
        .from('user_location_assignments')
        .select('id, location_id')
        .eq('user_id', userId);

    // Fetch entity assignments with title/slug (use admin client to bypass RLS)
    const { data: entityAssignments } = await supabaseAdmin
        .from('user_entity_assignments')
        .select('id, entity_id, entity_type')
        .eq('user_id', userId);

    let entities: { id: string; entityId: string; entityType: 'home' | 'facility'; title: string; slug: string }[] = [];
    if (entityAssignments && entityAssignments.length > 0) {
        const homeIds = entityAssignments.filter((a: any) => a.entity_type === 'home').map((a: any) => a.entity_id);
        const facilityIds = entityAssignments.filter((a: any) => a.entity_type === 'facility').map((a: any) => a.entity_id);
        const [homesResult, facilitiesResult] = await Promise.all([
            homeIds.length > 0 ? supabaseAdmin.from('homes').select('id, title, slug').in('id', homeIds) : Promise.resolve({ data: [] }),
            facilityIds.length > 0 ? supabaseAdmin.from('facilities').select('id, title, slug').in('id', facilityIds) : Promise.resolve({ data: [] }),
        ]);
        const homesMap = new Map(((homesResult.data as any[]) || []).map(h => [h.id, h]));
        const facilitiesMap = new Map(((facilitiesResult.data as any[]) || []).map(f => [f.id, f]));
        entities = entityAssignments
            .map((a: any) => {
                const entity = a.entity_type === 'home' ? homesMap.get(a.entity_id) : facilitiesMap.get(a.entity_id);
                if (!entity) return null;
                return { id: a.id, entityId: a.entity_id, entityType: a.entity_type, title: entity.title, slug: entity.slug };
            })
            .filter(Boolean) as typeof entities;
    }

    return NextResponse.json({
        ...profile,
        manager_name: managerName,
        email: session.user.email,
        role: role?.role,
        display_name: role?.display_name,
        entities,
        locationAssignments: locationAssignments || [],
    });
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: Request) {
    const supabase = createServerSupabase();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Only allow updating specific profile fields (not role, not email)
    const allowedFields = ['full_name', 'nickname', 'photo_url', 'phone', 'address', 'default_media_folder_id'];
    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
        if (key in body) {
            updates[key] = body[key];
        }
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
