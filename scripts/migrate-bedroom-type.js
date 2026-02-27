'use strict';
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Old single-select value → new multi-select canonical value
const VALUE_MAP = {
    'Private Bedroom': 'Private',
    'Shared Bedroom': 'Semi-private',
};

async function run() {
    const { data } = await sb.from('facilities').select('id,title,room_details').not('room_details','is',null);
    let count = 0;
    for (const f of (data || [])) {
        const rd = f.room_details;
        if (!rd || rd.bedroomType === undefined) continue;
        const mapped = VALUE_MAP[rd.bedroomType] || rd.bedroomType;
        const newRd = { ...rd };
        delete newRd.bedroomType;
        newRd.bedroomTypes = [mapped];
        const { error } = await sb.from('facilities').update({ room_details: newRd }).eq('id', f.id);
        if (error) { console.error('Error:', f.title, error.message); continue; }
        console.log('Migrated:', f.title, '|', rd.bedroomType, '->', JSON.stringify(newRd.bedroomTypes));
        count++;
    }
    console.log('Done. Migrated', count, 'facilities.');
}
run().catch(console.error);
