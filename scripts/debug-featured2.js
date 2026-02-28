'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function unwrap(raw) {
    const s = raw.trim();
    return s.startsWith('<![CDATA[') ? s.slice(9, s.lastIndexOf(']]>')).trim() : s;
}
function getTag(xml, tag) {
    const m = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
    return m ? unwrap(m[1]) : '';
}
function getMeta(xml, key) {
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(xml)) !== null) {
        const kM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(bm[1]);
        const vM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(bm[1]);
        if (kM && vM && unwrap(kM[1]) === key) return unwrap(vM[1]);
    }
    return '';
}

async function main() {
    const slug = process.argv[2] || 'aiea-1001';
    const xml = fs.readFileSync('wp-homes-export.xml', 'utf8');
    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);

    const attachMap = new Map();
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'attachment') continue;
        const id = getTag(item, 'wp:post_id');
        const url = getTag(item, 'wp:attachment_url');
        if (id && url) attachMap.set(id, url);
    }

    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'homes') continue;
        if (getTag(item, 'wp:post_name').trim() !== slug) continue;
        const thumbId = getMeta(item, '_thumbnail_id');
        const thumbUrl = attachMap.get(thumbId);
        console.log(`Featured: id=${thumbId} url=${thumbUrl}`);
        console.log(`Featured basename: ${thumbUrl?.split('/').pop()}`);
    }

    // Find Home Images root folder
    const { data: root } = await supabase.from('media_folders').select('id').eq('slug','home-images').is('parent_id',null).maybeSingle();
    console.log(`Root folder id: ${root?.id}`);

    const { data: folder } = await supabase.from('media_folders').select('id,slug,path').eq('slug',slug).eq('parent_id',root.id).maybeSingle();
    console.log(`Home folder: id=${folder?.id} path=${folder?.path}`);

    if (folder) {
        const { data: items2 } = await supabase.from('media_items').select('filename,original_filename,url').eq('folder_id',folder.id).order('filename');
        console.log(`\nMedia items (${items2?.length}):`);
        for (const m of items2 || []) console.log(`  ${m.filename}  orig="${m.original_filename}"`);
    }
}
main().catch(e => { console.error(e.message); process.exit(1); });
