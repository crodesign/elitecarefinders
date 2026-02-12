import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (can access auth.users)
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

export async function POST(request: NextRequest) {
    try {
        const { nickname } = await request.json();

        if (!nickname) {
            return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
        }

        // Query user_profiles to get user_id
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('user_id')
            .eq('nickname', nickname.toLowerCase())
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Nickname not found' }, { status: 404 });
        }

        // Get email from auth.users using admin client
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);

        if (userError || !user?.email) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ email: user.email });
    } catch (error) {
        console.error('Error in nickname-to-email:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
