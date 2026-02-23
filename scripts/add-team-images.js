require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    try {
        const { error: e1 } = await supabase.rpc('execute_sql', { sql_query: `ALTER TABLE homes ADD COLUMN IF NOT EXISTS team_images TEXT[] DEFAULT '{}'::text[];` });
        if (e1 && !e1.message.includes('execute_sql')) console.error('Homes Error:', e1);

        const { error: e2 } = await supabase.rpc('execute_sql', { sql_query: `ALTER TABLE facilities ADD COLUMN IF NOT EXISTS team_images TEXT[] DEFAULT '{}'::text[];` });
        if (e2 && !e2.message.includes('execute_sql')) console.error('Facilities Error:', e2);

        console.log('Done migrating tables.');
    } catch (e) {
        console.error(e);
    }
}
run();
