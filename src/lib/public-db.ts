import { createClient } from '@supabase/supabase-js';
import type { Home, Facility, RoomFieldCategory, RoomFieldDefinition } from '@/types';

function getClient() {
    // Use service role key on the server to bypass RLS for public page reads.
    // SUPABASE_SERVICE_ROLE_KEY is server-only (no NEXT_PUBLIC_ prefix).
    // Falls back to anon key if not set.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { persistSession: false },
    });
}

function transformHome(data: any): Home {
    return {
        ...data,
        address: data.address || { street: '', city: '', state: '', zip: '' },
        displayReferenceNumber: data.display_reference_number,
        showAddress: data.show_address,
        taxonomyEntryIds: data.taxonomy_entry_ids || [],
        isFeatured: data.is_featured,
        hasFeaturedVideo: data.has_featured_video,
        isHomeOfMonth: data.is_home_of_month,
        featuredLabel: data.featured_label,
        homeOfMonthDescription: data.home_of_month_description,
        images: data.images || [],
        teamImages: data.team_images || [],
        cuisineImages: data.cuisine_images || [],
        videos: data.videos || [],
        roomDetails: { customFields: {}, ...(data.room_details || {}) },
        updatedAt: data.updated_at,
    };
}

function transformFacility(data: any): Facility {
    return {
        ...data,
        address: data.address || { street: '', city: '', state: '', zip: '' },
        licenseNumber: data.license_number,
        taxonomyIds: data.taxonomy_ids || [],
        images: data.images || [],
        teamImages: data.team_images || [],
        cuisineImages: data.cuisine_images || [],
        videos: data.videos || [],
        roomDetails: data.room_details || { customFields: {} },
        updatedAt: data.updated_at,
    };
}

export async function getHomeBySlug(slug: string): Promise<Home | null> {
    const db = getClient();
    const { data, error } = await db
        .from('homes')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
    if (error || !data) return null;
    return transformHome(data);
}

export async function getFacilityBySlug(slug: string): Promise<Facility | null> {
    const db = getClient();
    const { data, error } = await db
        .from('facilities')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
    if (error || !data) return null;
    return transformFacility(data);
}

export interface TaxonomyEntryPublic {
    id: string;
    name: string;
    slug: string;
    taxonomyId: string;
    taxonomyName: string;
    taxonomySlug: string;
    ancestorNames?: string[]; // ordered from root to self, location entries only
}

export async function getTaxonomyEntriesByIds(ids: string[]): Promise<TaxonomyEntryPublic[]> {
    if (!ids.length) return [];
    const db = getClient();
    const { data, error } = await db
        .from('taxonomy_entries')
        .select('id, name, slug, taxonomy_id, parent_id, taxonomies(name, slug)')
        .in('id', ids);
    if (error || !data) return [];

    const entries = data.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        taxonomyId: row.taxonomy_id,
        taxonomyName: row.taxonomies?.name || '',
        taxonomySlug: row.taxonomies?.slug || '',
        parentId: row.parent_id as string | null,
    }));

    // Resolve ancestor chains for location entries
    const locationEntries = entries.filter(e => e.taxonomySlug === 'location' && e.parentId);
    if (locationEntries.length > 0) {
        // Fetch ancestors in up to 3 rounds (state → island → city)
        const ancestorMap = new Map<string, { id: string; name: string; parent_id: string | null }>();
        let toFetch = locationEntries.map(e => e.parentId!);
        for (let depth = 0; depth < 3 && toFetch.length; depth++) {
            const { data: ancestors } = await db
                .from('taxonomy_entries')
                .select('id, name, parent_id')
                .in('id', toFetch);
            if (!ancestors) break;
            ancestors.forEach((a: any) => ancestorMap.set(a.id, a));
            toFetch = ancestors.filter((a: any) => a.parent_id && !ancestorMap.has(a.parent_id)).map((a: any) => a.parent_id);
        }

        return entries.map(e => {
            if (e.taxonomySlug !== 'location') return e;
            const chain: string[] = [e.name];
            let pid = e.parentId;
            while (pid) {
                const ancestor = ancestorMap.get(pid);
                if (!ancestor) break;
                chain.unshift(ancestor.name);
                pid = ancestor.parent_id;
            }
            return { ...e, ancestorNames: chain };
        });
    }

    return entries;
}

export async function getRoomFieldData(): Promise<{
    categories: RoomFieldCategory[];
    definitions: RoomFieldDefinition[];
}> {
    const db = getClient();
    const [catRes, defRes] = await Promise.all([
        db.from('room_field_categories').select('*').order('display_order'),
        db.from('room_field_definitions').select('*').eq('is_active', true).eq('is_public', true).order('display_order'),
    ]);
    const categories: RoomFieldCategory[] = (catRes.data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        displayOrder: row.display_order,
        section: row.section || 'room_details',
        columnNumber: row.column_number || 1,
        icon: row.icon || undefined,
        createdAt: row.created_at,
    }));
    const definitions: RoomFieldDefinition[] = (defRes.data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        type: row.type,
        targetType: row.target_type,
        options: row.options || undefined,
        categoryId: row.category_id,
        displayOrder: row.display_order,
        isActive: row.is_active,
        isPublic: row.is_public ?? true,
        createdAt: row.created_at,
    }));
    return { categories, definitions };
}

export async function getAdjacentHome(currentTitle: string): Promise<{
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
}> {
    const db = getClient();
    const [prevRes, nextRes] = await Promise.all([
        db.from('homes').select('slug, title').eq('status', 'published').lt('title', currentTitle).order('title', { ascending: false }).limit(1),
        db.from('homes').select('slug, title').eq('status', 'published').gt('title', currentTitle).order('title', { ascending: true }).limit(1),
    ]);
    return {
        prev: prevRes.data?.[0] ? { slug: prevRes.data[0].slug, title: prevRes.data[0].title } : null,
        next: nextRes.data?.[0] ? { slug: nextRes.data[0].slug, title: nextRes.data[0].title } : null,
    };
}

export async function getAdjacentFacility(currentTitle: string): Promise<{
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
}> {
    const db = getClient();
    const [prevRes, nextRes] = await Promise.all([
        db.from('facilities').select('slug, title').eq('status', 'published').lt('title', currentTitle).order('title', { ascending: false }).limit(1),
        db.from('facilities').select('slug, title').eq('status', 'published').gt('title', currentTitle).order('title', { ascending: true }).limit(1),
    ]);
    return {
        prev: prevRes.data?.[0] ? { slug: prevRes.data[0].slug, title: prevRes.data[0].title } : null,
        next: nextRes.data?.[0] ? { slug: nextRes.data[0].slug, title: nextRes.data[0].title } : null,
    };
}

export interface FeaturedCard {
    slug: string;
    title: string;
    image: string | null;
    featuredLabel: string | null;
}

export async function getFeaturedHomes(excludeSlug?: string): Promise<FeaturedCard[]> {
    const db = getClient();
    let query = db.from('homes').select('slug, title, images, featured_label').eq('status', 'published').eq('is_featured', true).limit(20);
    if (excludeSlug) query = query.neq('slug', excludeSlug);
    const { data } = await query;
    return (data || []).map((row: any) => ({
        slug: row.slug,
        title: row.title,
        image: row.images?.[0] || null,
        featuredLabel: row.featured_label || null,
    }));
}

export async function getFeaturedFacilities(excludeSlug?: string): Promise<FeaturedCard[]> {
    const db = getClient();
    let query = db.from('facilities').select('slug, title, images, featured_label').eq('status', 'published').eq('is_featured', true).limit(20);
    if (excludeSlug) query = query.neq('slug', excludeSlug);
    const { data } = await query;
    return (data || []).map((row: any) => ({
        slug: row.slug,
        title: row.title,
        image: row.images?.[0] || null,
        featuredLabel: row.featured_label || null,
    }));
}

export async function getMediaCaptionsByUrls(urls: string[]): Promise<Record<string, string>> {
    if (!urls?.length) return {};
    const db = getClient();

    // Remove potential duplicates when querying
    const uniqueUrls = Array.from(new Set(urls));

    const { data, error } = await db
        .from('media_items')
        .select('url, caption, alt_text')
        .in('url', uniqueUrls);

    if (error || !data) return {};

    const captions: Record<string, string> = {};
    data.forEach((row: any) => {
        const text = row.caption || row.alt_text;
        if (text) captions[row.url] = text;
    });
    return captions;
}
