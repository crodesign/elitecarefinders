require('dotenv').config({ path: '.env.local' });

async function run() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/exec_sql';
    // Try querying triggers via a custom RPC (won't work unless it exists)
    // Instead, let's use the Supabase REST API to check the pg_catalog
    const url2 = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/pg_catalog_pg_trigger?select=tgname,tgrelid&limit=20';
    const r = await fetch(url2, {
        headers: { 
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
    });
    console.log('Status:', r.status, await r.text());
}
run().catch(console.error);
