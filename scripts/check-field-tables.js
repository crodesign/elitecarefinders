'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: defs, error: e1 } = await s.from('room_field_definitions').select('id,name,field_type').limit(5);
    console.log('room_field_definitions:', defs?.length ?? 'error', e1?.message ?? '');
    if (defs) for (const d of defs) console.log(' ', d.id, d.field_type, d.name);

    const { data: cats, error: e2 } = await s.from('room_field_categories').select('id,name').limit(5);
    console.log('room_field_categories:', cats?.length ?? 'error', e2?.message ?? '');
    if (cats) for (const c of cats) console.log(' ', c.id, c.name);
}
main().catch(e => { console.error(e.message); process.exit(1); });
