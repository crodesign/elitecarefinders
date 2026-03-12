const { createClient } = require('@supabase/supabase-js');
const fs = require('fs'), path = require('path');
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

Promise.all([
    sb.from('taxonomy_entries').select('name, display_order').eq('taxonomy_id', 'aaff7539-60ec-448d-ae56-5ee8763917f6').order('display_order', { ascending: true, nullsFirst: false }),
    sb.from('taxonomy_entries').select('name, display_order').eq('taxonomy_id', '286967ff-a897-4529-9c25-6f452f77f0d7').order('display_order', { ascending: true, nullsFirst: false }),
]).then(([fac, home]) => {
    console.log('Facility types:', JSON.stringify(fac.data));
    console.log('Home types:', JSON.stringify(home.data));
});
