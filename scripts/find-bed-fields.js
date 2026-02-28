'use strict';
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // Find all bed-related field definitions
    const { data: fields } = await s.from('room_field_definitions')
        .select('id, name, slug, field_type')
        .or('name.ilike.%bed%,slug.ilike.%bed%');
    console.log('=== DB field definitions matching "bed" ===');
    for (const f of fields || []) console.log(` ${f.id}  [${f.field_type}]  ${f.slug}  —  ${f.name}`);

    // Find all meta keys in XML containing "bed"
    console.log('\n=== XML meta keys containing "bed" (with sample values) ===');
    const xml = fs.readFileSync(path.resolve(process.cwd(), 'wp-homes-export.xml'), 'utf8');
    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);
    const seen = new Map();
    for (const item of items) {
        const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
        let bm;
        while ((bm = blockRe.exec(item)) !== null) {
            const keyM = /<wp:meta_key><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_key>/.exec(bm[1]);
            const valM = /<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>/.exec(bm[1]);
            if (!keyM) continue;
            const key = keyM[1].trim();
            if (!key.toLowerCase().includes('bed')) continue;
            if (!seen.has(key) && valM) seen.set(key, valM[1].trim().slice(0, 80));
        }
    }
    for (const [k, v] of seen) console.log(`  ${k.padEnd(40)} = ${v}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
