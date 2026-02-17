import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize admin client for fetching manager details (bypassing RLS)
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

// GET /api/profile - Get current user's profile
export async function GET() {
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
            .select('full_name') // Using admin client to bypass RLS
            .eq('user_id', profile.manager_id)
            .single();
        if (managerProfile) {
            managerName = managerProfile.full_name;
        }
    }

    return NextResponse.json({
        ...profile,
        manager_name: managerName,
        email: session.user.email,
        role: role?.role,
        display_name: role?.display_name,
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
    const allowedFields = ['full_name', 'nickname', 'photo_url', 'phone', 'address'];
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
