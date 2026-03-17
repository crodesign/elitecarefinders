import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// PUT /api/admin/sort-order/facilities — save featured facilities order
// Body: { slugs: string[] }
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

    const { slugs } = await request.json();
    if (!Array.isArray(slugs)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const updates = slugs.map((slug, index) =>
        supabaseAdmin.from('facilities').update({ sort_order: index }).eq('slug', slug)
    );
    await Promise.all(updates);

    return NextResponse.json({ success: true });
}
