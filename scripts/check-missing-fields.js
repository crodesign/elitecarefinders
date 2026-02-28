'use strict';
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function unwrap(raw) {
    const s2 = raw.trim();
    return s2.startsWith('<![CDATA[') ? s2.slice(9, s2.lastIndexOf(']]>')).trim() : s2;
}

async function main() {
    // Get field details for bed-size and floor-level
    const { data: fields } = await s.from('room_field_definitions')
        .select('id,name,slug,type,options')
        .in('slug', ['bed-size', 'floor-level']);
    console.log('=== Missing field definitions ===');
    for (const f of fields || []) console.log(` ${f.id}  [${f.type}]  ${f.slug}  options=${JSON.stringify(f.options)}`);

    // Scan XML for bed_size and floor-related meta keys
    console.log('\n=== XML: bed_size, floor_level, number_of_bedrooms, total_beds values ===');
    const xml = fs.readFileSync(path.resolve(process.cwd(), 'wp-homes-export.xml'), 'utf8');
    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);

    const keysToCheck = ['bed_size', 'floor_level', 'number_of_bedrooms', 'total_beds',
                         'number_of_private_pay_beds', 'number_of_medicaid_beds'];
    const seen = {};
    for (const k of keysToCheck) seen[k] = new Map();

    for (const item of items) {
        const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
        let bm;
        while ((bm = blockRe.exec(item)) !== null) {
            const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(bm[1]);
            const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(bm[1]);
            if (!keyM || !valM) continue;
            const key = unwrap(keyM[1]);
            const val = unwrap(valM[1]).trim();
            if (seen[key] !== undefined && val) seen[key].set(val, (seen[key].get(val) || 0) + 1);
        }
    }
    for (const [key, vals] of Object.entries(seen)) {
        if (!vals.size) { console.log(`  ${key}: (no values found)`); continue; }
        console.log(`  ${key}:`);
        for (const [v, c] of [...vals.entries()].sort((a,b) => b[1]-a[1])) {
            console.log(`    [${c}x] ${v.slice(0, 100)}`);
        }
    }
}
main().catch(e => { console.error(e.message); process.exit(1); });
