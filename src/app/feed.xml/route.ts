import { createClient } from '@supabase/supabase-js';
import { BASE_URL, SITE_NAME } from '@/lib/seo';

export const revalidate = 86400;

function db() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

function escapeCdata(s: string) {
    return s.replace(/]]>/g, ']]]]><![CDATA[>');
}

export async function GET() {
    const supabase = db();
    const { data } = await supabase
        .from('posts')
        .select('title, slug, post_type, excerpt, meta_description, published_at, created_at, updated_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50);

    const items = (data ?? []).map(row => {
        const link = `${BASE_URL}/resources/${row.post_type}/${row.slug}`;
        const pubDate = new Date(row.published_at ?? row.created_at).toUTCString();
        const description = row.excerpt ?? row.meta_description ?? '';
        return `    <item>
      <title><![CDATA[${escapeCdata(row.title ?? '')}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeCdata(description)}]]></description>
    </item>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} — Resources</title>
    <link>${BASE_URL}/resources</link>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Latest articles and resources from ${SITE_NAME}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
