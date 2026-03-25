import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// PUT /api/admin/sort-order/videos — save featured video order
// Body: { order: { entityType: 'home' | 'facility'; entitySlug: string }[] }
export async function PUT(request: Request) {
    const supabase = createServerSupabase();
    const supabaseAdmin = createAdminClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: role } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

    if (!role || !['super_admin', 'system_admin'].includes(role.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { order } = await request.json();
    if (!Array.isArray(order)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const { error } = await supabaseAdmin
        .from('site_settings')
        .upsert({ key: 'featured_video_order', value: JSON.stringify(order), updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
