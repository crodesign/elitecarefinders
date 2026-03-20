import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { generateSeoWithGemini, type AiSeoInput } from '@/lib/ai-seo';

type ContentType = 'home' | 'facility' | 'post';

async function getTaxonomyNames(supabase: ReturnType<typeof createAdminClient>, ids: string[]): Promise<string[]> {
    if (!ids || ids.length === 0) return [];
    const { data } = await supabase
        .from('taxonomy_entries')
        .select('name')
        .in('id', ids);
    return data ? data.map((r: { name: string }) => r.name).filter(Boolean) : [];
}

async function getRecordForSeo(recordId: string, contentType: ContentType): Promise<AiSeoInput | null> {
    const supabase = createAdminClient();

    if (contentType === 'home') {
        const { data, error } = await supabase
            .from('homes')
            .select('title, description, excerpt, address, taxonomy_entry_ids')
            .eq('id', recordId)
            .single();
        if (error || !data) return null;
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
        const { data, error } = await supabase
            .from('facilities')
            .select('title, description, excerpt, address, taxonomy_ids')
            .eq('id', recordId)
            .single();
        if (error || !data) return null;
        const addr = data.address as Record<string, string> | null;
        const careTypes = await getTaxonomyNames(supabase, data.taxonomy_ids || []);
        return {
            contentType: 'facility',
            title: data.title ?? '',
            body: [data.description, data.excerpt].filter(Boolean).join('\n\n'),
            location: [addr?.city, addr?.state].filter(Boolean).join(', ') || undefined,
            careTypes,
        };
    }

    if (contentType === 'post') {
        const { data, error } = await supabase
            .from('posts')
            .select('title, content, excerpt')
            .eq('id', recordId)
            .single();
        if (error || !data) return null;
        return {
            contentType: 'post',
            title: data.title ?? '',
            body: [data.content, data.excerpt].filter(Boolean).join('\n\n'),
        };
    }

    return null;
}

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { recordId, contentType } = body as Record<string, unknown>;

    if (!recordId || typeof recordId !== 'string') {
        return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
    }
    if (!['home', 'facility', 'post'].includes(contentType as string)) {
        return NextResponse.json({ error: 'contentType must be home, facility, or post' }, { status: 400 });
    }

    let input: AiSeoInput | null;
    try {
        input = await getRecordForSeo(recordId, contentType as ContentType);
    } catch (err) {
        console.error('[generate-seo] Supabase fetch error:', err);
        return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 });
    }

    if (!input) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    try {
        const output = await generateSeoWithGemini(input);
        return NextResponse.json(output);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[generate-seo] Gemini error:', err);
        return NextResponse.json({ error: 'AI generation failed', detail: msg }, { status: 500 });
    }
}
