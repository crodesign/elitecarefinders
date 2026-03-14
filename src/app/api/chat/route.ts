import { NextResponse } from 'next/server';
import { chatModel } from '@/lib/vertex';
import { createAdminClient } from '@/lib/supabase-server';
import { postTypeToSlug, POST_TYPE_CONFIG } from '@/lib/post-type-config';

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
    type: 'home' | 'facility' | 'post';
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
    const [homes, facilities, fieldDefs, posts] = await Promise.all([
        supabase.from('homes').select('title, slug, address, excerpt, room_details').eq('status', 'published').limit(30),
        supabase.from('facilities').select('title, slug, address, excerpt, room_details').eq('status', 'published').limit(15),
        supabase.from('room_field_definitions').select('id, name').eq('is_active', true),
        supabase.from('posts').select('title, slug, post_type, excerpt, images').eq('status', 'published').order('published_at', { ascending: false }).limit(30),
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
        posts: (posts.data || []).map((p: any) => ({
            title: p.title, slug: p.slug, postType: p.post_type,
            excerpt: (p.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120),
            image: (p.images || [])[0] || null,
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
    const refs = [...text.matchAll(/\[\[(home|facility|post):([^\]]+)\]\]/g)].map(m => ({ type: m[1], slug: m[2] }));
    if (refs.length === 0) return [];

    const supabase = createAdminClient();
    const homeSlugs = refs.filter(r => r.type === 'home').map(r => r.slug);
    const facilitySlugs = refs.filter(r => r.type === 'facility').map(r => r.slug);
    const postSlugs = refs.filter(r => r.type === 'post').map(r => r.slug);
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
    if (postSlugs.length > 0) {
        const { data } = await supabase.from('posts').select('title, slug, post_type, images').in('slug', postSlugs).eq('status', 'published');
        for (const p of data || []) {
            const typeLabel = POST_TYPE_CONFIG.find(c => c.postType === p.post_type)?.label ?? p.post_type;
            const typeSlug = postTypeToSlug(p.post_type);
            const thumb = gridThumbUrl((p.images || [])[0]);
            cards.push({ type: 'post', slug: p.slug, name: p.title, city: typeLabel, images: thumb ? [thumb] : [], url: `/resources/${typeSlug}/${p.slug}` });
        }
    }
    return cards;
}

export async function POST(request: Request) {
    try {
        const { messages, userContext, pageContext, welcomeMode, savedCount, mentionSaved }: {
            messages: ChatMessage[];
            userContext?: { name?: string; email?: string };
            pageContext?: { path: string; entityType?: string; entitySlug?: string };
            welcomeMode?: boolean;
            savedCount?: number;
            mentionSaved?: boolean;
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
            const firstName = userContext.name.split(' ')[0];
            systemText += `\n\nThe user's name is ${firstName}. You may use their first name in the opening message of a new session — after that, do not use their name again unless it arises very naturally (e.g. wrapping up a long conversation). Most replies should not include their name at all. This is how natural conversation works — overusing someone's name sounds robotic.`;
            if (!welcomeMode && messages.length > 3) {
                systemText += ` You are continuing a previous conversation with them — pick up naturally where you left off without re-introducing yourself.`;
            }
        }

        if (welcomeMode) {
            // Fetch new listing count (published in last 14 days)
            const supabase = createAdminClient();
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
            const [{ count: newHomes }, { count: newFacilities }] = await Promise.all([
                supabase.from('homes').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', twoWeeksAgo),
                supabase.from('facilities').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', twoWeeksAgo),
            ]);
            const newListingCount = (newHomes ?? 0) + (newFacilities ?? 0);

            systemText += `\n\nThis is a returning session start. The last message "[new_session]" is a system trigger — respond to the USER with a natural, brief welcome back (1–2 sentences). Vary your tone and angle each time — don't always open with "Welcome back!".`;

            if (mentionSaved && (savedCount ?? 0) > 0) {
                systemText += ` In this session, mention that they have ${savedCount} saved listing${(savedCount ?? 0) !== 1 ? 's' : ''} and offer to pull them up — work it in naturally, not as a sales pitch.`;
            } else if (newListingCount > 0) {
                systemText += ` Mention there ${newListingCount === 1 ? 'is 1 new listing' : `are ${newListingCount} new listings`} added recently that might be worth a look.`;
            } else {
                systemText += ` Options: reference something from your previous conversation, ask how their search is going, or just a warm brief check-in. Pick what feels most natural.`;
            }

            systemText += ` Keep it short and conversational.`;
        }

        if (pageContext?.path) {
            systemText += `\n\nThe visitor is currently on page: ${pageContext.path}.`;
        }

        if (currentEntity) {
            const typeLabel = pageContext?.entityType === 'home' ? 'Adult Foster Home' : 'Assisted Living Facility';
            systemText += ` They are viewing "${currentEntity.title}" (${typeLabel})`;
            if (currentEntity.address?.city) systemText += ` in ${currentEntity.address.city}`;
            if (currentEntity.excerpt) systemText += `. Description: ${currentEntity.excerpt.slice(0, 300)}`;
            systemText += `. Do NOT use a [[marker]] for this listing — the visitor is already on this page.`;
        }

        // Inject available listings with amenity descriptions so AI can match feature queries
        if (listings.homes.length > 0 || listings.facilities.length > 0 || listings.posts.length > 0) {
            systemText += `\n\nWhen recommending specific listings or articles, use [[home:slug]], [[facility:slug]], or [[post:slug]] markers — this automatically shows the visitor a card with a photo and link. When a visitor asks to see listings, articles, or asks about features, show up to 3 matching results. If you're showing fewer than 3 results (or if there are more you're not showing), mention it naturally — e.g. "Here's one that might be a good fit" or "I found a few that could work — here are the top ones". Only use slugs from this list:\n`;
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
            if (listings.posts.length > 0) {
                systemText += `\n\nRESOURCES & ARTICLES:\n` + listings.posts.map(p => {
                    const typeLabel = POST_TYPE_CONFIG.find(c => c.postType === p.postType)?.label ?? p.postType;
                    return `- [[post:${p.slug}]] ${p.title} [${typeLabel}]${p.excerpt ? ` | ${p.excerpt}` : ''}`;
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
