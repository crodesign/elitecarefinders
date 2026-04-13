import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { BASE_URL } from '@/lib/seo';

export const revalidate = 86400;

function db() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
    { path: '/homes', changeFrequency: 'daily', priority: 0.9 },
    { path: '/facilities', changeFrequency: 'daily', priority: 0.9 },
    { path: '/resources', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/reviews', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = db();
    const now = new Date();

    const [homesRes, facilitiesRes, postsRes, locationsRes] = await Promise.all([
        supabase.from('homes').select('slug, updated_at, indexable').eq('status', 'published'),
        supabase.from('facilities').select('slug, updated_at, indexable').eq('status', 'published'),
        supabase.from('posts').select('slug, post_type, updated_at, published_at').eq('status', 'published'),
        (async () => {
            const { data: tax } = await supabase.from('taxonomies').select('id').eq('slug', 'location').maybeSingle();
            if (!tax) return { data: [] as { slug: string; updated_at: string | null }[] };
            return supabase.from('taxonomy_entries').select('slug, updated_at').eq('taxonomy_id', tax.id);
        })(),
    ]);

    const entries: MetadataRoute.Sitemap = [];

    for (const r of STATIC_ROUTES) {
        entries.push({ url: `${BASE_URL}${r.path}`, lastModified: now, changeFrequency: r.changeFrequency, priority: r.priority });
    }

    for (const row of homesRes.data ?? []) {
        if (row.indexable === false) continue;
        entries.push({
            url: `${BASE_URL}/homes/${row.slug}`,
            lastModified: row.updated_at ? new Date(row.updated_at) : now,
            changeFrequency: 'weekly',
            priority: 0.8,
        });
    }

    for (const row of facilitiesRes.data ?? []) {
        if (row.indexable === false) continue;
        entries.push({
            url: `${BASE_URL}/facilities/${row.slug}`,
            lastModified: row.updated_at ? new Date(row.updated_at) : now,
            changeFrequency: 'weekly',
            priority: 0.8,
        });
    }

    for (const row of postsRes.data ?? []) {
        entries.push({
            url: `${BASE_URL}/resources/${row.post_type}/${row.slug}`,
            lastModified: new Date(row.updated_at ?? row.published_at ?? now),
            changeFrequency: 'monthly',
            priority: 0.6,
        });
    }

    for (const row of locationsRes.data ?? []) {
        entries.push({
            url: `${BASE_URL}/location/${row.slug}`,
            lastModified: row.updated_at ? new Date(row.updated_at) : now,
            changeFrequency: 'weekly',
            priority: 0.5,
        });
    }

    return entries;
}
