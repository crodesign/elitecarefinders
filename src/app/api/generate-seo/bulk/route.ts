import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { generateSeoWithGemini, type AiSeoInput } from '@/lib/ai-seo';

export const maxDuration = 300;

type ContentType = 'home' | 'facility' | 'post';

const DELAY_MS = 300;

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getMissingIds(supabase: ReturnType<typeof createAdminClient>, contentType: ContentType): Promise<{ id: string; title: string }[]> {
    const table = contentType === 'post' ? 'posts' : contentType === 'facility' ? 'facilities' : 'homes';
    const { data, error } = await supabase
        .from(table)
        .select('id, title')
        .or('meta_title.is.null,meta_title.eq.')
        .neq('status', 'draft')
        .order('title');
    if (error) throw new Error(error.message);
    return data ?? [];
}

async function getInputForEntity(supabase: ReturnType<typeof createAdminClient>, id: string, contentType: ContentType): Promise<AiSeoInput | null> {
    if (contentType === 'home') {
        const { data } = await supabase.from('homes').select('title, description, excerpt, address, taxonomy_entry_ids').eq('id', id).single();
        if (!data) return null;
        const addr = data.address as Record<string, string> | null;
        const careTypes = await getTaxonomyNames(supabase, data.taxonomy_entry_ids || []);
        return {
            contentType: 'home',
            title: data.title ?? '',
            body: [data.description, data.excerpt].filter(Boolean).join('\n\n'),
            location: [addr?.city, addr?.state].filter(Boolean).join(', ') || undefined,
            careTypes,
        };
    }
    if (contentType === 'facility') {
        const { data } = await supabase.from('facilities').select('title, description, excerpt, address, taxonomy_entry_ids').eq('id', id).single();
        if (!data) return null;
        const addr = data.address as Record<string, string> | null;
        const careTypes = await getTaxonomyNames(supabase, data.taxonomy_entry_ids || []);
        return {
            contentType: 'facility',
            title: data.title ?? '',
            body: [data.description, data.excerpt].filter(Boolean).join('\n\n'),
            location: [addr?.city, addr?.state].filter(Boolean).join(', ') || undefined,
            careTypes,
        };
    }
    if (contentType === 'post') {
        const { data } = await supabase.from('posts').select('title, content, excerpt').eq('id', id).single();
        if (!data) return null;
        return {
            contentType: 'post',
            title: data.title ?? '',
            body: [data.content, data.excerpt].filter(Boolean).join('\n\n'),
        };
    }
    return null;
}

async function getTaxonomyNames(supabase: ReturnType<typeof createAdminClient>, ids: string[]): Promise<string[]> {
    if (!ids || ids.length === 0) return [];
    const { data } = await supabase.from('taxonomy_entries').select('name').in('id', ids);
    return data ? data.map((r: { name: string }) => r.name).filter(Boolean) : [];
}

async function saveSeo(supabase: ReturnType<typeof createAdminClient>, id: string, contentType: ContentType, seo: Record<string, unknown>) {
    const table = contentType === 'post' ? 'posts' : contentType === 'facility' ? 'facilities' : 'homes';
    const { error } = await supabase.from(table).update({
        meta_title: seo.metaTitle ?? null,
        meta_description: seo.metaDescription ?? null,
        og_title: seo.ogTitle ?? null,
        og_description: seo.ogDescription ?? null,
    }).eq('id', id);
    if (error) throw new Error(error.message);
}

export async function POST(request: Request) {
    let body: unknown;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { contentType } = body as Record<string, unknown>;
    if (!['home', 'facility', 'post'].includes(contentType as string)) {
        return NextResponse.json({ error: 'contentType must be home, facility, or post' }, { status: 400 });
    }

    const supabase = createAdminClient();
    let entities: { id: string; title: string }[];
    try {
        entities = await getMissingIds(supabase, contentType as ContentType);
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch entities' }, { status: 500 });
    }

    let generated = 0;
    let failed = 0;

    for (const entity of entities) {
        try {
            const input = await getInputForEntity(supabase, entity.id, contentType as ContentType);
            if (!input) { failed++; continue; }

            const seo = await generateSeoWithGemini(input);
            await saveSeo(supabase, entity.id, contentType as ContentType, seo as Record<string, unknown>);
            generated++;
        } catch (err) {
            console.error(`[bulk-seo] Failed for ${entity.id}:`, err);
            failed++;
        }
        if (entities.indexOf(entity) < entities.length - 1) {
            await delay(DELAY_MS);
        }
    }

    return NextResponse.json({ generated, failed, total: entities.length });
}
