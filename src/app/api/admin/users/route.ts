
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

export async function GET(request: Request) {
    const supabase = createServerSupabase();

    // Debug logging
    const cookieStore = cookies();
    const cookieNames = cookieStore.getAll().map(c => c.name);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    // Extract project ref from URL (e.g., https://xyz.supabase.co -> xyz)
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\./)?.[1] || 'unknown';
    const expectedCookieName = `sb-${projectRef}-auth-token`;
    const actualAuthCookie = cookieStore.get(expectedCookieName);

    console.log('[API Debug] Setup:', {
        url: supabaseUrl,
        projectRef,
        expectedCookieName,
        hasExpectedCookie: !!actualAuthCookie,
        allCookies: cookieNames
    });

    // 1. Try getUser first
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.error('[API Debug] getUser failed:', authError?.message);

        // 2. Fallback to getSession (less strict validation)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (session?.user) {
            console.log('[API Debug] getSession succeeded! Using session user.');
            user = session.user;
        } else {
            console.error('[API Debug] getSession also failed:', sessionError?.message);

            // Construct detailed debug info
            const debugInfo = {
                cookies: cookieNames,
                projectRef,
                expectedCookieName,
                hasExpectedCookie: !!actualAuthCookie,
                getUserError: authError?.message,
                getSessionError: sessionError?.message
            };

            return NextResponse.json({
                error: 'Unauthorized',
                details: authError?.message || 'Auth session missing!',
                debug: debugInfo
            }, { status: 401 });
        }
    }

    console.log('[API Debug] Authenticated user:', user.email);

    // 2. Check permission (must be admin)
    const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    console.log('[API Debug] User role:', userRole?.role);

    if (!userRole || !['super_admin', 'system_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Fetch users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
        console.error('[API Debug] List users failed:', listError.message);
        return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const { data: roles } = await supabaseAdmin.from('user_roles').select('*');
    const { data: profiles } = await supabaseAdmin.from('user_profiles').select('*');
    const { data: locations } = await supabaseAdmin.from('user_location_assignments').select('*');

    const combinedUsers = users.map(u => {
        const role = roles?.find(r => r.user_id === u.id);
        const profile = profiles?.find(p => p.user_id === u.id);
        const userLocations = locations?.filter(l => l.user_id === u.id) || [];

        return {
            id: u.id,
            email: u.email,
            role: role || { role: 'local_user' },
            profile: profile || {
                full_name: u.email?.split('@')[0] || 'Unknown User',
                phone: '',
                photo_url: '',
                address: { street: '', city: '', state: '', zip: '' }
            },
            location_ids: userLocations.map(l => l.location_id),
            location_count: userLocations.length
        };
    });

    console.log('[API Debug] Returning', combinedUsers.length, 'users');
    return NextResponse.json(combinedUsers);
}

export async function POST(request: Request) {
    const supabase = createServerSupabase();

    // 1. Check auth & permissions
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

    if (!callerRole || !['super_admin', 'system_admin'].includes(callerRole.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, role, profile, location_ids, manager_id } = body;

    // Determine manager_id:
    // 1. If explicitly provided (by Admin), use it.
    // 2. If not provided, default to the creator (Admin or RM).
    const finalManagerId = manager_id || session.user.id;

    console.log('[POST /api/admin/users] Creating user:', { email, role, hasPassword: !!password, hasProfile: !!profile?.full_name, locationCount: location_ids?.length });

    // Validate input
    if (!email || !password || !role || !profile?.full_name) {
        console.error('[POST /api/admin/users] Validation failed:', { email: !!email, password: !!password, role: !!role, full_name: !!profile?.full_name });
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Create Auth User
    console.log('[POST /api/admin/users] Calling auth.admin.createUser for:', email);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (authError) {
        console.error('[POST /api/admin/users] Auth error:', JSON.stringify({ message: authError.message, status: authError.status, name: authError.name }));
        return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    console.log('[POST /api/admin/users] Auth user created:', authData.user.id);
    const userId = authData.user.id;

    try {
        // 3. Insert specific data
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: userId,
                role,
                display_name: profile.full_name
            });

        if (roleError) throw roleError;

        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                user_id: userId,
                full_name: profile.full_name,
                phone: profile.phone,
                photo_url: profile.photo_url,
                address: profile.address,
                manager_id: finalManagerId
            });

        if (profileError) throw profileError;

        if (location_ids && location_ids.length > 0) {
            const locationInserts = location_ids.map((locId: string) => ({
                user_id: userId,
                location_id: locId
            }));

            const { error: locError } = await supabaseAdmin
                .from('user_location_assignments')
                .insert(locationInserts);

            if (locError) throw locError;
        }

        return NextResponse.json({
            id: userId,
            email,
            role: { role },
            profile,
            location_count: location_ids?.length || 0
        });

    } catch (error: any) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json({ error: error.message || 'Failed to create user data' }, { status: 500 });
    }
}
