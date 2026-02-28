'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: cats } = await s.from('room_field_categories').select('id,name,section').order('section').order('name');
    const { data: defs } = await s.from('room_field_definitions').select('id,name,slug,field_type,category_id').order('name');

    const catMap = new Map();
    for (const c of cats || []) catMap.set(c.id, c);

    console.log('=== All room_field_definitions ===');
    for (const d of defs || []) {
        const cat = catMap.get(d.category_id);
        console.log(`  [${d.field_type.padEnd(12)}] ${d.slug.padEnd(40)} id=${d.id}`);
        console.log(`               name="${d.name}"  cat="${cat?.name}" (${cat?.section})`);
    }
}
main().catch(e => { console.error(e.message); process.exit(1); });
