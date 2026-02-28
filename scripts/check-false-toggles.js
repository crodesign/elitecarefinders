'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data: homes } = await supabase.from('homes').select('id, room_details');
    let homesWithFalse = 0, totalFalseKeys = 0;
    for (const h of homes || []) {
        const cf = h.room_details?.customFields || {};
        const falseKeys = Object.entries(cf).filter(([, v]) => v === false);
        if (falseKeys.length) { homesWithFalse++; totalFalseKeys += falseKeys.length; }
    }
    console.log('Homes with false toggles:', homesWithFalse);
    console.log('Total false keys to remove:', totalFalseKeys);
    console.log('Total homes:', (homes || []).length);
}
main().catch(e => { console.error(e.message); process.exit(1); });
