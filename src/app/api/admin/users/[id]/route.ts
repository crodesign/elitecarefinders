
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

    const { data: entityAssignments } = await supabaseAdmin
        .from('user_entity_assignments')
        .select('id, entity_id, entity_type')
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
        address: { street: '', city: '', state: '', zip: '' },
        manager_id: undefined
    };

    let managerName = undefined;
    if (safeProfile.manager_id) {
        const { data: managerProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('full_name')
            .eq('user_id', safeProfile.manager_id)
            .single();
        if (managerProfile) {
            managerName = managerProfile.full_name;
        }
    }

    const safeRole = role || { role: 'local_user' };

    return NextResponse.json({
        id: user.id,
        email: user.email,
        role: safeRole,
        profile: safeProfile,
        location_ids: locations?.map(l => l.location_id) || [],
        entity_assignments: entityAssignments || [],
        manager_id: safeProfile.manager_id,
        manager_name: managerName
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
    const { role, profile, location_ids, entity_assignments, password, manager_id } = body;

    try {
        // Update password if provided
        if (password) {
            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
                id,
                { password }
            );
            if (passwordError) throw passwordError;
        }

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

        if (manager_id !== undefined) {
            const { error: managerError } = await supabaseAdmin
                .from('user_profiles')
                .update({ manager_id })
                .eq('user_id', id);
            if (managerError) throw managerError;
        }

        if (location_ids !== undefined) {
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

        if (entity_assignments !== undefined) {
            await supabaseAdmin
                .from('user_entity_assignments')
                .delete()
                .eq('user_id', id);

            if (entity_assignments.length > 0) {
                const inserts = entity_assignments.map((ea: { entity_id: string; entity_type: string }) => ({
                    user_id: id,
                    entity_id: ea.entity_id,
                    entity_type: ea.entity_type
                }));
                const { error: entityError } = await supabaseAdmin
                    .from('user_entity_assignments')
                    .insert(inserts);
                if (entityError) throw entityError;
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
