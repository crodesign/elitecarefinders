'use strict';
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // All room_fixed_field_options field types
    const { data: opts } = await s.from('room_fixed_field_options')
        .select('field_type, value').order('field_type').order('value');
    const byType = {};
    for (const o of opts || []) {
        if (!byType[o.field_type]) byType[o.field_type] = [];
        byType[o.field_type].push(o.value);
    }
    console.log('=== room_fixed_field_options field types ===');
    for (const [t, vals] of Object.entries(byType)) console.log(`  ${t.padEnd(20)} ${vals.join(', ')}`);

    // All top-level keys used in homes.room_details (not in customFields)
    const { data: homes } = await s.from('homes').select('room_details').limit(500);
    const topKeys = new Set();
    for (const h of homes || []) {
        const rd = h.room_details || {};
        for (const k of Object.keys(rd)) if (k !== 'customFields') topKeys.add(k);
    }
    console.log('\n=== Top-level room_details keys in use (DB) ===');
    for (const k of [...topKeys].sort()) console.log(`  ${k}`);

    // bed_size values in XML
    console.log('\n=== bed_size / bed_options values in XML ===');
    const xml = fs.readFileSync(path.resolve(process.cwd(), 'wp-homes-export.xml'), 'utf8');
    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);
    function unwrap(raw) {
        const s2 = raw.trim();
        return s2.startsWith('<![CDATA[') ? s2.slice(9, s2.lastIndexOf(']]>')).trim() : s2;
    }
    const bedSizeVals = new Map(), bedOptVals = new Map();
    for (const item of items) {
        const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
        let bm;
        while ((bm = blockRe.exec(item)) !== null) {
            const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(bm[1]);
            const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(bm[1]);
            if (!keyM || !valM) continue;
            const key = unwrap(keyM[1]);
            const val = unwrap(valM[1]);
            if (key === 'bed_size' && val) bedSizeVals.set(val, (bedSizeVals.get(val) || 0) + 1);
            if (key === 'bed_options' && val) bedOptVals.set(val, (bedOptVals.get(val) || 0) + 1);
        }
    }
    console.log('  bed_size values:');
    for (const [v, c] of bedSizeVals) console.log(`    [${c}x] ${v}`);
    console.log('  bed_options values:');
    for (const [v, c] of bedOptVals) console.log(`    [${c}x] ${v.slice(0, 100)}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
