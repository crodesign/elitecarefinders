'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // Get actual columns on room_field_definitions
    const { data: sample, error } = await s.from('room_field_definitions').select('*').limit(3);
    if (error) { console.log('room_field_definitions error:', error.message); }
    else {
        console.log('room_field_definitions columns:', sample?.length ? Object.keys(sample[0]).join(', ') : 'empty');
        for (const r of sample || []) console.log(' ', JSON.stringify(r));
    }

    // All categories
    const { data: cats } = await s.from('room_field_categories').select('*').order('name');
    console.log('\nAll room_field_categories:');
    for (const c of cats || []) console.log(' ', c.id, JSON.stringify(c));
}
main().catch(e => { console.error(e.message); process.exit(1); });
