require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Use supabase-js with a custom query via the Supabase admin API
async function run() {
    const { data, error } = await s
        .from('information_schema.triggers')
        .select('trigger_name, event_object_table, action_timing, event_manipulation')
        .in('event_object_table', ['homes', 'facilities', 'posts']);
    
    if (error) console.log('Error:', error.message);
    else console.log('Triggers:', JSON.stringify(data, null, 2));
}
run().catch(console.error);
