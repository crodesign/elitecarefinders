import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/admin/sort-order — return all three sortable lists
export async function GET() {
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

    const [homesRes, facilitiesRes, videoHomesRes, videoFacilitiesRes, settingsRes] = await Promise.all([
        supabaseAdmin
            .from('homes')
            .select('slug, title, images, featured_label, sort_order')
            .eq('status', 'published')
            .eq('is_featured', true)
            .eq('is_home_of_month', false)
            .order('sort_order', { ascending: true, nullsFirst: false }),
        supabaseAdmin
            .from('facilities')
            .select('slug, title, images, featured_label, sort_order')
            .eq('status', 'published')
            .eq('is_featured', true)
            .order('sort_order', { ascending: true, nullsFirst: false }),
        supabaseAdmin
            .from('homes')
            .select('slug, title, images, videos')
            .eq('status', 'published')
            .eq('has_featured_video', true),
        supabaseAdmin
            .from('facilities')
            .select('slug, title, images, videos')
            .eq('status', 'published')
            .eq('has_featured_video', true),
        supabaseAdmin
            .from('site_settings')
            .select('value')
            .eq('key', 'featured_video_order')
            .maybeSingle(),
    ]);

    const homes = (homesRes.data || []).map((r: any) => ({
        slug: r.slug,
        title: r.title,
        image: r.images?.[0] || null,
        featuredLabel: r.featured_label || null,
        sortOrder: r.sort_order ?? null,
    }));

    const facilities = (facilitiesRes.data || []).map((r: any) => ({
        slug: r.slug,
        title: r.title,
        image: r.images?.[0] || null,
        featuredLabel: r.featured_label || null,
        sortOrder: r.sort_order ?? null,
    }));

    // Build raw video items
    const rawVideos: any[] = [];
    (videoHomesRes.data || []).forEach((r: any) => {
        const v = (r.videos || [])[0];
        if (v?.url) rawVideos.push({ entityType: 'home', entitySlug: r.slug, entityTitle: r.title, entityImage: r.images?.[0] || null, thumbnailUrl: v.thumbnailUrl || null, videoUrl: v.url });
    });
    (videoFacilitiesRes.data || []).forEach((r: any) => {
        const v = (r.videos || [])[0];
        if (v?.url) rawVideos.push({ entityType: 'facility', entitySlug: r.slug, entityTitle: r.title, entityImage: r.images?.[0] || null, thumbnailUrl: v.thumbnailUrl || null, videoUrl: v.url });
    });

    // Apply saved video order
    const savedOrder: { entityType: string; entitySlug: string }[] = settingsRes.data?.value || [];
    const orderedVideos: any[] = [];
    for (const entry of savedOrder) {
        const found = rawVideos.find(v => v.entityType === entry.entityType && v.entitySlug === entry.entitySlug);
        if (found) orderedVideos.push(found);
    }
    // Append any not yet in the saved order
    for (const v of rawVideos) {
        if (!orderedVideos.find(o => o.entityType === v.entityType && o.entitySlug === v.entitySlug)) {
            orderedVideos.push(v);
        }
    }

    return NextResponse.json({ homes, facilities, videos: orderedVideos });
}
