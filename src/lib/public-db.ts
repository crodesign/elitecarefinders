import { createClient } from '@supabase/supabase-js';
import type { Home, Facility, RoomFieldCategory, RoomFieldDefinition, SeoFields } from '@/types';

function getClient() {
    // Use service role key on the server to bypass RLS for public page reads.
    // SUPABASE_SERVICE_ROLE_KEY is server-only (no NEXT_PUBLIC_ prefix).
    // Falls back to anon key if not set.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
        auth: { persistSession: false },
    });
}

function mapSeoFromDb(row: any): SeoFields {
    return {
        metaTitle: row.meta_title ?? null,
        metaDescription: row.meta_description ?? null,
        canonicalUrl: row.canonical_url ?? null,
        indexable: row.indexable ?? true,
        ogTitle: row.og_title ?? null,
        ogDescription: row.og_description ?? null,
        ogImageUrl: row.og_image_url ?? null,
        schemaJson: row.schema_json ?? null,
    };
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
        seo: mapSeoFromDb(data),
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
        seo: mapSeoFromDb(data),
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
        publicColumnNumber: row.public_column_number ?? null,
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

export async function getAdjacentPost(postType: string, currentTitle: string): Promise<{
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
}> {
    const db = getClient();
    const [prevRes, nextRes] = await Promise.all([
        db.from('posts').select('slug, title').eq('status', 'published').eq('post_type', postType).lt('title', currentTitle).order('title', { ascending: false }).limit(1),
        db.from('posts').select('slug, title').eq('status', 'published').eq('post_type', postType).gt('title', currentTitle).order('title', { ascending: true }).limit(1),
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
    taxonomyEntryIds: string[];
}

export async function getFeaturedHomes(excludeSlug?: string): Promise<FeaturedCard[]> {
    const db = getClient();
    let query = db.from('homes').select('slug, title, images, featured_label, taxonomy_entry_ids').eq('status', 'published').eq('is_featured', true).limit(20);
    if (excludeSlug) query = query.neq('slug', excludeSlug);
    const { data } = await query;
    return (data || []).map((row: any) => ({
        slug: row.slug,
        title: row.title,
        image: row.images?.[0] || null,
        featuredLabel: row.featured_label || null,
        taxonomyEntryIds: row.taxonomy_entry_ids || [],
    }));
}

export async function getFeaturedFacilities(excludeSlug?: string): Promise<FeaturedCard[]> {
    const db = getClient();
    let query = db.from('facilities').select('slug, title, images, featured_label, taxonomy_ids').eq('status', 'published').eq('is_featured', true).limit(20);
    if (excludeSlug) query = query.neq('slug', excludeSlug);
    const { data } = await query;
    return (data || []).map((row: any) => ({
        slug: row.slug,
        title: row.title,
        image: row.images?.[0] || null,
        featuredLabel: row.featured_label || null,
        taxonomyEntryIds: row.taxonomy_ids || [],
    }));
}

export interface HomeListingCard {
    id: string;
    slug: string;
    title: string;
    image: string | null;
    description: string;
    taxonomyEntryIds: string[];
    isFeatured: boolean;
    isHomeOfMonth: boolean;
}

export interface FacilityListingCard {
    id: string;
    slug: string;
    title: string;
    image: string | null;
    description: string;
    taxonomyIds: string[];
    capacity: number | null;
    isFeatured: boolean;
    isFacilityOfMonth: boolean;
}

export async function getHomeListings(opts: { typeEntryId?: string; locationEntryIds?: string[]; page?: number; limit?: number } = {}): Promise<{ items: HomeListingCard[]; total: number }> {
    const db = getClient();
    const { typeEntryId, locationEntryIds, page = 1, limit = 24 } = opts;
    const offset = (page - 1) * limit;
    let query = db
        .from('homes')
        .select('id, slug, title, images, description, taxonomy_entry_ids, is_featured, is_home_of_month', { count: 'exact' })
        .eq('status', 'published')
        .order('is_home_of_month', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('title')
        .range(offset, offset + limit - 1);
    if (locationEntryIds?.length) query = (query as any).overlaps('taxonomy_entry_ids', locationEntryIds);
    else if (typeEntryId) query = query.contains('taxonomy_entry_ids', [typeEntryId]);
    const { data, count, error } = await query;
    if (error || !data) return { items: [], total: 0 };
    return {
        items: data.map((row: any) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            image: row.images?.[0] || null,
            description: row.description || '',
            taxonomyEntryIds: row.taxonomy_entry_ids || [],
            isFeatured: row.is_featured || false,
            isHomeOfMonth: row.is_home_of_month || false,
        })),
        total: count ?? 0,
    };
}

export interface HomeOfMonth {
    id: string;
    slug: string;
    title: string;
    images: string[];
    description: string;
    homeOfMonthDescription: string | null;
    taxonomyEntryIds: string[];
}

export async function getHomeOfMonth(): Promise<HomeOfMonth | null> {
    const db = getClient();
    const { data } = await db
        .from('homes')
        .select('id, slug, title, images, description, home_of_month_description, taxonomy_entry_ids')
        .eq('status', 'published')
        .eq('is_home_of_month', true)
        .limit(1)
        .maybeSingle();
    if (!data) return null;
    return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        images: data.images || [],
        description: data.description || '',
        homeOfMonthDescription: data.home_of_month_description || null,
        taxonomyEntryIds: data.taxonomy_entry_ids || [],
    };
}

export async function getFacilityListings(opts: { typeEntryId?: string; locationEntryIds?: string[]; page?: number; limit?: number } = {}): Promise<{ items: FacilityListingCard[]; total: number }> {
    const db = getClient();
    const { typeEntryId, locationEntryIds, page = 1, limit = 24 } = opts;
    const offset = (page - 1) * limit;
    let query = db
        .from('facilities')
        .select('id, slug, title, images, description, taxonomy_ids, capacity, is_featured, is_facility_of_month', { count: 'exact' })
        .eq('status', 'published')
        .order('is_facility_of_month', { ascending: false })
        .order('is_featured', { ascending: false })
        .order('title')
        .range(offset, offset + limit - 1);
    if (locationEntryIds?.length) {
        const orFilters = locationEntryIds.map(id => `taxonomy_ids.cs.${JSON.stringify([id])}`).join(',');
        query = (query as any).or(orFilters);
    } else if (typeEntryId) query = (query as any).filter('taxonomy_ids', 'cs', JSON.stringify([typeEntryId]));
    const { data, count, error } = await query;
    if (error || !data) return { items: [], total: 0 };
    return {
        items: data.map((row: any) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            image: row.images?.[0] || null,
            description: row.description || '',
            taxonomyIds: row.taxonomy_ids || [],
            capacity: row.capacity ?? null,
            isFeatured: row.is_featured || false,
            isFacilityOfMonth: row.is_facility_of_month || false,
        })),
        total: count ?? 0,
    };
}

// Fetch the given entry ID plus all descendant entry IDs (BFS, up to 4 levels).
// Used for location filtering so that "Hawaii" also matches homes tagged with "Honolulu".
export async function getLocationDescendantIds(rootId: string): Promise<string[]> {
    const db = getClient();
    const ids = [rootId];
    let toFetch = [rootId];
    for (let depth = 0; depth < 4 && toFetch.length; depth++) {
        const { data } = await db.from('taxonomy_entries').select('id').in('parent_id', toFetch);
        if (!data?.length) break;
        const newIds = data.map((r: any) => r.id);
        ids.push(...newIds);
        toFetch = newIds;
    }
    return ids;
}

// When a short path (state + city) skips an intermediary level (e.g. island),
// find the full path by searching direct children of the state for the city slug.
export async function findFullLocationPath(stateSlug: string, citySlug: string): Promise<string[] | null> {
    const db = getClient();
    const { data: stateData } = await db.from('taxonomy_entries').select('id').eq('slug', stateSlug).maybeSingle();
    if (!stateData) return null;
    const { data: islands } = await db.from('taxonomy_entries').select('id, slug').eq('parent_id', stateData.id);
    if (!islands?.length) return null;
    for (const island of islands) {
        const { data: city } = await db.from('taxonomy_entries').select('id').eq('slug', citySlug).eq('parent_id', island.id).maybeSingle();
        if (city) return [stateSlug, island.slug, citySlug];
    }
    return null;
}

// Walk a hierarchy of slugs (e.g. ['hawaii', 'oahu', 'honolulu']) and return
// the deepest matching taxonomy entry plus its ancestor names (root → parent).
export async function getLocationEntryByPath(slugs: string[]): Promise<{
    id: string;
    name: string;
    ancestors: string[]; // ordered root → direct parent, e.g. ['Hawaii', 'Oahu']
} | null> {
    if (!slugs.length) return null;
    const db = getClient();
    let parentId: string | null = null;
    const names: string[] = [];
    for (const slug of slugs) {
        let query = db.from('taxonomy_entries').select('id, name').eq('slug', slug);
        if (parentId) query = query.eq('parent_id', parentId);
        const { data } = await query.maybeSingle();
        if (!data) return null;
        names.push(data.name);
        parentId = data.id;
    }
    return {
        id: parentId!,
        name: names[names.length - 1],
        ancestors: names.slice(0, -1),
    };
}

export interface FeaturedVideoItem {
    videoUrl: string;
    thumbnailUrl: string | null;
    entityImage: string | null;
    caption: string | null;
    entityTitle: string;
    entitySlug: string;
    entityType: 'home' | 'facility';
}

export async function getFeaturedVideoItems(): Promise<FeaturedVideoItem[]> {
    const db = getClient();
    const [homesRes, facilitiesRes] = await Promise.all([
        db.from('homes').select('title, slug, videos, images').eq('status', 'published').eq('has_featured_video', true),
        db.from('facilities').select('title, slug, videos, images').eq('status', 'published').eq('has_featured_video', true),
    ]);
    const items: FeaturedVideoItem[] = [];
    (homesRes.data || []).forEach((row: any) => {
        const v = (row.videos || [])[0];
        if (v?.url) items.push({ videoUrl: v.url, thumbnailUrl: v.thumbnailUrl || null, entityImage: row.images?.[0] || null, caption: v.caption || null, entityTitle: row.title, entitySlug: row.slug, entityType: 'home' });
    });
    (facilitiesRes.data || []).forEach((row: any) => {
        const v = (row.videos || [])[0];
        if (v?.url) items.push({ videoUrl: v.url, thumbnailUrl: v.thumbnailUrl || null, entityImage: row.images?.[0] || null, caption: v.caption || null, entityTitle: row.title, entitySlug: row.slug, entityType: 'facility' });
    });
    return items;
}

export async function getTaxonomyEntryBySlug(slug: string): Promise<{ id: string; name: string; taxonomySlug: string } | null> {
    const db = getClient();
    const { data } = await db
        .from('taxonomy_entries')
        .select('id, name, taxonomies(slug)')
        .eq('slug', slug)
        .maybeSingle();
    if (!data) return null;
    return {
        id: data.id,
        name: data.name,
        taxonomySlug: (data as any).taxonomies?.slug || '',
    };
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

export async function getMediaTitlesByUrls(urls: string[]): Promise<Record<string, string>> {
    if (!urls?.length) return {};
    const db = getClient();
    const uniqueUrls = Array.from(new Set(urls));
    const { data, error } = await db
        .from('media_items')
        .select('url, title')
        .in('url', uniqueUrls);
    if (error || !data) return {};
    const titles: Record<string, string> = {};
    data.forEach((row: any) => {
        if (row.title) titles[row.url] = row.title;
    });
    return titles;
}

const HOME_TYPE_TAX_ID = '286967ff-a897-4529-9c25-6f452f77f0d7';
const FACILITY_TYPE_TAX_ID = 'aaff7539-60ec-448d-ae56-5ee8763917f6';

export interface BrowseNavEntry { id: string; name: string; slug: string; }

export interface PublicPost {
    id: string;
    title: string;
    slug: string;
    postType: string;
    excerpt: string | null;
    image: string | null;
    publishedAt: string | null;
    createdAt: string;
}

export interface RecipeIngredient {
    amount: string;
    name: string;
}

export interface RecipeInstruction {
    text: string;
    image?: string;
}

export interface RecipeMetadata {
    prepTime?: number;
    cookTime?: number;
    yield?: string;
    ingredients?: RecipeIngredient[];
    instructions?: RecipeInstruction[];
    sourceUrl?: string;
    sourceName?: string;
}

export interface PublicPostDetail extends PublicPost {
    images: string[];
    content: string | null;
    videoUrl: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    metadata: RecipeMetadata | null;
}

export async function getPublicPosts(opts: { postType?: string; page?: number; limit?: number } = {}): Promise<{ items: PublicPost[]; total: number }> {
    const db = getClient();
    const { postType, page = 1, limit = 12 } = opts;
    const offset = (page - 1) * limit;
    let query = db
        .from('posts')
        .select('id, title, slug, post_type, excerpt, meta_description, images, published_at, created_at', { count: 'exact' })
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (postType) query = query.eq('post_type', postType);
    try {
        const { data, count, error } = await query;
        if (error || !data) return { items: [], total: 0 };
        return {
            items: data.map((row: any) => ({
                id: row.id,
                title: row.title,
                slug: row.slug,
                postType: row.post_type,
                excerpt: row.excerpt || row.meta_description || null,
                image: row.images?.[0] || null,
                publishedAt: row.published_at || null,
                createdAt: row.created_at,
            })),
            total: count ?? 0,
        };
    } catch {
        return { items: [], total: 0 };
    }
}

export async function getPublicPost(postType: string, slug: string): Promise<PublicPostDetail | null> {
    const db = getClient();
    let data: any, error: any;
    try {
        ({ data, error } = await db
            .from('posts')
            .select('id, title, slug, post_type, content, meta_description, images, video_url, published_at, created_at, meta_title, meta_description, metadata')
            .eq('status', 'published')
            .eq('post_type', postType)
            .eq('slug', slug)
            .maybeSingle());
    } catch {
        return null;
    }
    if (error || !data) return null;
    return {
        id: data.id,
        title: data.title,
        slug: data.slug,
        postType: data.post_type,
        excerpt: data.meta_description || null,
        image: data.images?.[0] || null,
        images: data.images || [],
        publishedAt: data.published_at || null,
        createdAt: data.created_at,
        content: data.content || null,
        videoUrl: data.video_url || null,
        metaTitle: data.meta_title || null,
        metaDescription: data.meta_description || null,
        metadata: data.metadata || null,
    };
}

export interface LocationEntryWithCounts {
    id: string;
    name: string;
    slug: string;
    homes: number;
    facilities: number;
}

export async function getLocationTopLevelEntries(): Promise<{ id: string; name: string; slug: string }[]> {
    const db = getClient();
    const { data: tax } = await db.from('taxonomies').select('id').eq('slug', 'location').maybeSingle();
    if (!tax) return [];
    const { data } = await db.from('taxonomy_entries').select('id, name, slug').eq('taxonomy_id', tax.id).is('parent_id', null).order('name');
    return (data || []).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug }));
}

export async function getLocationChildEntries(parentSlug: string): Promise<{ id: string; name: string; slug: string }[]> {
    const db = getClient();
    const { data: parent } = await db.from('taxonomy_entries').select('id').eq('slug', parentSlug).maybeSingle();
    if (!parent) return [];
    const { data } = await db.from('taxonomy_entries').select('id, name, slug').eq('parent_id', parent.id).order('name');
    return (data || []).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug }));
}

// Returns children of a location entry with listing counts (homes + facilities).
// Uses a single BFS over all children combined, then 2 queries total for counts.
export async function getLocationChildEntriesWithCounts(
    parentSlug: string,
): Promise<LocationEntryWithCounts[]> {
    const db = getClient();
    const { data: parent } = await db.from('taxonomy_entries').select('id').eq('slug', parentSlug).maybeSingle();
    if (!parent) return [];
    const { data: children } = await db.from('taxonomy_entries').select('id, name, slug').eq('parent_id', parent.id).order('name');
    if (!children?.length) return [];

    // BFS: collect all descendant IDs grouped by child (island)
    const childDescendants = new Map<string, string[]>(); // childId → [id, ...descendants]
    for (const child of children) childDescendants.set(child.id, [child.id]);

    let frontier = children.map((c: any) => c.id);
    for (let depth = 0; depth < 4 && frontier.length; depth++) {
        const { data: next } = await db.from('taxonomy_entries').select('id, parent_id').in('parent_id', frontier);
        if (!next?.length) break;
        const newFrontier: string[] = [];
        for (const row of next) {
            // find which top-level child this belongs to
            for (const [childId, ids] of childDescendants) {
                if (ids.includes(row.parent_id)) {
                    ids.push(row.id);
                    newFrontier.push(row.id);
                    break;
                }
            }
        }
        frontier = newFrontier;
    }

    // All descendant IDs across all children
    const allIds = [...new Set([...childDescendants.values()].flat())];

    // 2 queries: fetch all listings under any of these IDs
    const [homesRes, facilitiesRes] = await Promise.all([
        (db.from('homes').select('taxonomy_entry_ids').eq('status', 'published') as any).overlaps('taxonomy_entry_ids', allIds),
        (db.from('facilities').select('taxonomy_ids').eq('status', 'published') as any).or(allIds.map((id: string) => `taxonomy_ids.cs.${JSON.stringify([id])}`).join(',')),
    ]);

    // Count per child island
    return children.map((child: any) => {
        const ids = new Set(childDescendants.get(child.id) || []);
        const homes = (homesRes.data || []).filter((h: any) => (h.taxonomy_entry_ids || []).some((id: string) => ids.has(id))).length;
        const facilities = (facilitiesRes.data || []).filter((f: any) => (f.taxonomy_ids || []).some((id: string) => ids.has(id))).length;
        return { id: child.id, name: child.name, slug: child.slug, homes, facilities };
    });
}

export interface IslandWithNeighborhoods {
    id: string;
    name: string;
    slug: string;
    neighborhoods: { id: string; name: string; slug: string }[];
}

export async function getHawaiiNeighborhoodsGrouped(): Promise<IslandWithNeighborhoods[]> {
    const db = getClient();
    const { data: hawaii } = await db.from('taxonomy_entries').select('id').eq('slug', 'hawaii').maybeSingle();
    if (!hawaii) return [];
    const { data: islands } = await db.from('taxonomy_entries').select('id, name, slug').eq('parent_id', hawaii.id).order('name');
    if (!islands?.length) return [];
    const islandIds = islands.map((i: any) => i.id);
    const { data: neighborhoods } = await db.from('taxonomy_entries').select('id, name, slug, parent_id').in('parent_id', islandIds).order('name');
    return islands.map((island: any) => ({
        id: island.id,
        name: island.name,
        slug: island.slug,
        neighborhoods: (neighborhoods || [])
            .filter((n: any) => n.parent_id === island.id)
            .map((n: any) => ({ id: n.id, name: n.name, slug: n.slug })),
    }));
}

export async function getPostTypeCounts(): Promise<Record<string, number>> {
    const db = getClient();
    try {
        const { data, error } = await db
            .from('posts')
            .select('post_type')
            .eq('status', 'published');
        if (error || !data) return {};
        const counts: Record<string, number> = {};
        for (const row of data) {
            counts[row.post_type] = (counts[row.post_type] || 0) + 1;
        }
        return counts;
    } catch {
        return {};
    }
}

export async function getBrowseNavTypes(): Promise<{ homeTypes: BrowseNavEntry[]; facilityTypes: BrowseNavEntry[] }> {
    const db = getClient();
    const { data } = await db
        .from('taxonomy_entries')
        .select('id, name, slug, taxonomy_id')
        .in('taxonomy_id', [HOME_TYPE_TAX_ID, FACILITY_TYPE_TAX_ID])
        .order('name');
    if (!data) return { homeTypes: [], facilityTypes: [] };
    return {
        homeTypes: data.filter((e: any) => e.taxonomy_id === HOME_TYPE_TAX_ID).map((e: any) => ({ id: e.id, name: e.name, slug: e.slug })),
        facilityTypes: data.filter((e: any) => e.taxonomy_id === FACILITY_TYPE_TAX_ID).map((e: any) => ({ id: e.id, name: e.name, slug: e.slug })),
    };
}
