import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

// POST /api/public/auth/lookup-nickname
// Body: { nickname: string }
// Returns: { email: string } or 404
export async function POST(request: NextRequest) {
    const { nickname } = await request.json();
    if (!nickname || typeof nickname !== 'string') {
        return NextResponse.json({ error: 'nickname required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('nickname', nickname.trim())
        .single();

    if (!profile) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: { user } } = await admin.auth.admin.getUserById(profile.user_id);
    if (!user?.email) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ email: user.email });
}
