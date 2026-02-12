
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function GET(request: Request, { params }: { params: { id: string } }) {
    const supabase = createServerSupabase();
    const { id } = params;

    // 1. Check auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch user details (Admin or Owner)
    const { data: callerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

    const isAdmin = callerRole && ['super_admin', 'system_admin'].includes(callerRole.role);
    const isOwner = session.user.id === id;

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch data
    const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', id)
        .single();

    const { data: role } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', id)
        .single();

    const { data: locations } = await supabaseAdmin
        .from('user_location_assignments')
        .select('location_id')
        .eq('user_id', id);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);

    if (authError || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fallback for missing profile/role
    const safeProfile = profile || {
        full_name: user.email?.split('@')[0] || 'Unknown User',
        phone: '',
        photo_url: '',
        address: { street: '', city: '', state: '', zip: '' }
    };

    const safeRole = role || { role: 'local_user' };

    return NextResponse.json({
        id: user.id,
        email: user.email,
        role: safeRole,
        profile: safeProfile,
        location_ids: locations?.map(l => l.location_id) || []
    });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const supabase = createServerSupabase();
    const { id } = params;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

    if (!callerRole || !['super_admin', 'system_admin'].includes(callerRole.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role, profile, location_ids } = body;

    try {
        if (role) {
            // Handle both update and insert (upsert)
            const { error: roleError } = await supabaseAdmin
                .from('user_roles')
                .upsert({ user_id: id, role })
                .select();
            if (roleError) throw roleError;
        }

        if (profile) {
            // Handle both update and insert (upsert)
            const { error: profileError } = await supabaseAdmin
                .from('user_profiles')
                .upsert({
                    user_id: id,
                    ...profile
                })
                .select();
            if (profileError) throw profileError;
        }

        if (location_ids !== undefined) {
            // Delete existing
            await supabaseAdmin
                .from('user_location_assignments')
                .delete()
                .eq('user_id', id);

            if (location_ids.length > 0) {
                const inserts = location_ids.map((lid: string) => ({
                    user_id: id,
                    location_id: lid
                }));
                const { error: locError } = await supabaseAdmin
                    .from('user_location_assignments')
                    .insert(inserts);
                if (locError) throw locError;
            }
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const supabase = createServerSupabase();
    const { id } = params;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

    if (!callerRole || !['super_admin', 'system_admin'].includes(callerRole.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
