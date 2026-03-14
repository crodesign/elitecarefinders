import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase-server';

async function getAuthUserId(): Promise<string | null> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user.id ?? null;
}

// GET /api/chat/history
export async function GET() {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data } = await supabase
        .from('user_chat_history')
        .select('messages')
        .eq('user_id', userId)
        .maybeSingle();

    return NextResponse.json({ messages: data?.messages ?? [] });
}

// POST /api/chat/history
export async function POST(request: Request) {
    const userId = await getAuthUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages } = await request.json();
    if (!Array.isArray(messages)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
        .from('user_chat_history')
        .upsert({ user_id: userId, messages: messages.slice(-40), updated_at: new Date().toISOString() });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
