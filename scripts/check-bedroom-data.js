'use strict';
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data } = await sb.from('facilities').select('title,room_details').not('room_details','is',null);
    for (const f of (data || [])) {
        const rd = f.room_details;
        if (rd && (rd.bedroomType !== undefined || rd.roomTypes !== undefined)) {
            console.log(f.title, '| bedroomType:', rd.bedroomType, '| roomTypes:', JSON.stringify(rd.roomTypes));
        }
    }
}
run().catch(console.error);
