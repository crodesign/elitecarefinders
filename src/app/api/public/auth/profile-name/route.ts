import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase-server';

export async function GET() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user.id) return NextResponse.json({ name: null });

    const admin = createAdminClient();
    const { data } = await admin
        .from('user_profiles')
        .select('nickname, full_name')
        .eq('user_id', session.user.id)
        .maybeSingle();

    const name = data?.nickname || data?.full_name || null;
    return NextResponse.json({ name });
}
