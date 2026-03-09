const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Check homes updated_at
    const { data: home, error: he } = await s.from('homes').select('id, updated_at').limit(1).single();
    console.log('homes updated_at sample:', home?.updated_at, he?.message);

    // Try to detect if updated_at changes on update
    if (home?.id) {
        const before = home.updated_at;
        await s.from('homes').update({ meta_title: 'trigger-test-' + Date.now() }).eq('id', home.id);
        const { data: after } = await s.from('homes').select('id, updated_at, meta_title').eq('id', home.id).single();
        console.log('Before updated_at:', before);
        console.log('After updated_at: ', after?.updated_at);
        console.log('Changed?', before !== after?.updated_at);
        // restore
        await s.from('homes').update({ meta_title: null }).eq('id', home.id);
    }
}
run().catch(console.error);
