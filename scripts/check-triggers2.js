const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await s.rpc('pg_temp_check', {}).catch(() => null) || {};
    
    // Query pg_trigger via raw SQL through supabase
    const r = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/pg_temp_check', {
        method: 'POST',
        headers: { 
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
        },
        body: '{}'
    });
    console.log('RPC attempt:', r.status);
}
run().catch(console.error);
