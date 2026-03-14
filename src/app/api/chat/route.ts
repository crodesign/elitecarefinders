import { NextResponse } from 'next/server';
import { chatModel } from '@/lib/vertex';
import { createAdminClient } from '@/lib/supabase-server';

const SYSTEM_PROMPT = `You are the Elite CareFinders virtual assistant — a warm, knowledgeable guide helping families and individuals find the right senior living community in Hawaii and beyond.

Elite CareFinders specializes in:
- Adult Foster Homes (small, residential, 1–5 residents, home-like setting)
- Assisted Living Facilities (larger, professional staff, more services)
- Memory Care Homes (specialized for Alzheimer's and dementia)
- Independent Living Communities

Your role:
- Help visitors understand their senior care options
- Answer questions about care types, costs, amenities, and what to look for
- Guide them toward scheduling a free consultation with an Elite CareFinders advisor
- Be empathetic — families are often under stress when seeking care for a loved one

Tone: warm, professional, concise. Keep responses to 2–4 sentences unless more detail is genuinely needed.

Do NOT:
- Make up specific pricing (say "pricing varies — an advisor can give you accurate estimates")
- Promise specific availability
- Provide medical advice

If someone seems ready to move forward, encourage them to schedule a free consultation — it's at no cost and no obligation.`;

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface EntityCard {
    type: 'home' | 'facility';
    slug: string;
    name: string;
    city: string;
    images: string[];
    url: string;
}

function gridThumbUrl(url?: string): string | null {
    if (!url) return null;
    if (url.startsWith('/images/media/')) return url.replace(/(\.[^.]+)$/, '-200x200.webp');
    return url;
}

function buildAmenityString(roomDetails: any, fieldMap: Map<string, string>): string {
    const customFields = roomDetails?.customFields || {};
    const parts: string[] = [];
    for (const [fieldId, value] of Object.entries(customFields)) {
        const name = fieldMap.get(fieldId);
        if (!name) continue;
        if (value === true) {
            parts.push(name);
        } else if (Array.isArray(value) && value.length > 0) {
            parts.push(`${name}: ${(value as string[]).join(', ')}`);
        } else if (typeof value === 'string' && value) {
            parts.push(`${name}: ${value}`);
        }
    }
    return parts.slice(0, 15).join(', ');
}

async function fetchListingContext() {
    const supabase = createAdminClient();
    const [homes, facilities, fieldDefs] = await Promise.all([
        supabase.from('homes').select('title, slug, address, excerpt, room_details').eq('status', 'published').limit(30),
        supabase.from('facilities').select('title, slug, address, excerpt, room_details').eq('status', 'published').limit(15),
        supabase.from('room_field_definitions').select('id, name').eq('is_active', true),
    ]);

    const fieldMap = new Map<string, string>((fieldDefs.data || []).map((f: any) => [f.id, f.name]));

    return {
        homes: (homes.data || []).map((h: any) => ({
            title: h.title, slug: h.slug, address: h.address,
            excerpt: h.excerpt,
            amenities: buildAmenityString(h.room_details, fieldMap),
        })),
        facilities: (facilities.data || []).map((f: any) => ({
            title: f.title, slug: f.slug, address: f.address,
            excerpt: f.excerpt,
            amenities: buildAmenityString(f.room_details, fieldMap),
        })),
    };
}

async function fetchCurrentEntity(type: string, slug: string) {
    const supabase = createAdminClient();
    const table = type === 'home' ? 'homes' : 'facilities';
    const { data } = await supabase
        .from(table)
        .select('title, slug, excerpt, address, images')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();
    return data as { title: string; slug: string; excerpt?: string; address: any; images?: string[] } | null;
}

async function resolveEntityCards(text: string): Promise<EntityCard[]> {
    const refs = [...text.matchAll(/\[\[(home|facility):([^\]]+)\]\]/g)].map(m => ({ type: m[1], slug: m[2] }));
    if (refs.length === 0) return [];

    const supabase = createAdminClient();
    const homeSlugs = refs.filter(r => r.type === 'home').map(r => r.slug);
    const facilitySlugs = refs.filter(r => r.type === 'facility').map(r => r.slug);
    const cards: EntityCard[] = [];

    if (homeSlugs.length > 0) {
        const { data } = await supabase.from('homes').select('title, slug, images, address').in('slug', homeSlugs).eq('status', 'published');
        for (const h of data || []) {
            cards.push({ type: 'home', slug: h.slug, name: h.title, city: h.address?.city || '', images: (h.images || []).slice(0, 4).map(gridThumbUrl).filter(Boolean) as string[], url: `/homes/${h.slug}` });
        }
    }
    if (facilitySlugs.length > 0) {
        const { data } = await supabase.from('facilities').select('title, slug, images, address').in('slug', facilitySlugs).eq('status', 'published');
        for (const f of data || []) {
            cards.push({ type: 'facility', slug: f.slug, name: f.title, city: f.address?.city || '', images: (f.images || []).slice(0, 4).map(gridThumbUrl).filter(Boolean) as string[], url: `/facilities/${f.slug}` });
        }
    }
    return cards;
}

export async function POST(request: Request) {
    try {
        const { messages, userContext, pageContext }: {
            messages: ChatMessage[];
            userContext?: { name?: string; email?: string };
            pageContext?: { path: string; entityType?: string; entitySlug?: string };
        } = await request.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
        }

        const model = chatModel();

        // Fetch context data in parallel
        const [currentEntity, listings] = await Promise.all([
            pageContext?.entitySlug && pageContext?.entityType
                ? fetchCurrentEntity(pageContext.entityType, pageContext.entitySlug)
                : Promise.resolve(null),
            fetchListingContext(),
        ]);

        // Build system prompt
        let systemText = SYSTEM_PROMPT;

        if (userContext?.name) {
            systemText += `\n\nThe user is logged in as ${userContext.name}${userContext.email ? ` (${userContext.email})` : ''}. Address them by first name when appropriate.`;
        }

        if (pageContext?.path) {
            systemText += `\n\nThe visitor is currently on page: ${pageContext.path}.`;
        }

        if (currentEntity) {
            const typeLabel = pageContext?.entityType === 'home' ? 'Adult Foster Home' : 'Assisted Living Facility';
            systemText += ` They are viewing "${currentEntity.title}" (${typeLabel})`;
            if (currentEntity.address?.city) systemText += ` in ${currentEntity.address.city}`;
            if (currentEntity.excerpt) systemText += `. Description: ${currentEntity.excerpt.slice(0, 300)}`;
            systemText += `. Reference this listing as [[${pageContext!.entityType}:${currentEntity.slug}]] when relevant.`;
        }

        // Inject available listings with amenity descriptions so AI can match feature queries
        if (listings.homes.length > 0 || listings.facilities.length > 0) {
            systemText += `\n\nWhen recommending specific listings, use [[home:slug]] or [[facility:slug]] markers — this automatically shows the visitor a photo card with a link. When a visitor asks to see listings or asks about features, include up to 5 matching markers. Only use slugs from this list:\n`;
            if (listings.homes.length > 0) {
                systemText += `\nADULT FOSTER HOMES:\n` + listings.homes.map(h => {
                    const excerptBlurb = (h.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
                    const details = [excerptBlurb, h.amenities].filter(Boolean).join(' | ');
                    return `- [[home:${h.slug}]] ${h.title}${h.address?.city ? ` | ${h.address.city}` : ''}${details ? ` | ${details}` : ''}`;
                }).join('\n');
            }
            if (listings.facilities.length > 0) {
                systemText += `\n\nASSISTED LIVING FACILITIES:\n` + listings.facilities.map(f => {
                    const excerptBlurb = (f.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
                    const details = [excerptBlurb, f.amenities].filter(Boolean).join(' | ');
                    return `- [[facility:${f.slug}]] ${f.title}${f.address?.city ? ` | ${f.address.city}` : ''}${details ? ` | ${details}` : ''}`;
                }).join('\n');
            }
        }

        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const result = await model.generateContentStream({
            systemInstruction: systemText,
            contents,
        });

        // Stream the response, then append entity cards
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let fullText = '';
                try {
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) {
                            fullText += text;
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                    // Resolve entity markers and append cards
                    const cards = await resolveEntityCards(fullText);
                    if (cards.length > 0) {
                        controller.enqueue(encoder.encode(`\n__CARDS__\n${JSON.stringify(cards)}`));
                    }
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache',
            },
        });
    } catch (err: any) {
        console.error('[Chat API] Error:', err);
        return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
    }
}
