import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const DEFAULT_SECTIONS = [
    { id: 'hero', label: 'Hero Section', visible: true },
    { id: 'page-title', label: 'Page Title', visible: true },
    { id: 'videos', label: 'Featured Video Walkthrough Tours', visible: true },
    { id: 'featured-homes', label: 'Featured Care Homes & Foster Homes', visible: true },
    { id: 'featured-facilities', label: 'Featured Senior Living Communities', visible: true },
    { id: 'home-of-month', label: 'Home of the Month', visible: true },
    { id: 'search', label: 'Search & Map Section', visible: true },
    { id: 'about', label: 'About Elite CareFinders', visible: true },
    { id: 'content', label: 'Body Content', visible: true },
    { id: 'testimonials', label: 'Testimonials — What Our Clients Say', visible: true },
    { id: 'video-testimonials', label: 'Video Testimonials', visible: true },
    { id: 'cta', label: 'Call to Action', visible: true },
    { id: 'elite-standard', label: 'The Elite Standard', visible: true },
    { id: 'join-network', label: 'Join the Provider Network', visible: false },
];

async function checkAuth() {
    const supabase = createServerSupabase();
    const supabaseAdmin = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data: role } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
    if (!role || !['super_admin', 'system_admin'].includes(role.role)) return null;
    return { supabaseAdmin };
}

export async function GET() {
    const auth = await checkAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await auth.supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'homepage_sections')
        .maybeSingle();

    const saved: { id: string; visible: boolean }[] = Array.isArray(data?.value) ? data.value : [];

    let sections;
    if (saved.length > 0) {
        sections = saved
            .map(s => {
                const def = DEFAULT_SECTIONS.find(d => d.id === s.id);
                return def ? { ...def, visible: s.visible } : null;
            })
            .filter(Boolean);
        for (const def of DEFAULT_SECTIONS) {
            if (!sections.find((s: any) => s.id === def.id)) {
                sections.push({ ...def });
            }
        }
    } else {
        sections = DEFAULT_SECTIONS.map(s => ({ ...s }));
    }

    return NextResponse.json({ sections });
}

export async function PUT(request: Request) {
    const auth = await checkAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!Array.isArray(body.sections)) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const toStore = body.sections.map(({ id, visible }: { id: string; visible: boolean }) => ({ id, visible }));

    console.log('[sections PUT] writing', toStore.length, 'sections to DB');
    const { error } = await auth.supabaseAdmin
        .from('site_settings')
        .upsert({ key: 'homepage_sections', value: toStore, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    console.log('[sections PUT] upsert error:', error?.message ?? 'none');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
