'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: cats } = await s.from('room_field_categories').select('id,name,section').order('section').order('name');
    const { data: defs } = await s.from('room_field_definitions').select('id,name,slug,type,category_id,target_type').order('category_id').order('name');

    const catMap = new Map();
    for (const c of cats || []) catMap.set(c.id, c);

    console.log('=== All room_field_definitions ===');
    let lastCat = null;
    for (const d of defs || []) {
        const cat = catMap.get(d.category_id);
        const catLabel = cat ? `${cat.section} / ${cat.name}` : d.category_id;
        if (catLabel !== lastCat) { console.log(`\n  [${catLabel}]`); lastCat = catLabel; }
        console.log(`    ${d.id}  [${d.type.padEnd(10)}]  ${d.slug.padEnd(35)} "${d.name}"  target=${d.target_type}`);
    }
}
main().catch(e => { console.error(e.message); process.exit(1); });
