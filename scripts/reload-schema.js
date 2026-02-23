require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reloadSchema() {
    console.log("Reloading Supabase schema cache...");
    try {
        const { data, error } = await supabase.rpc('execute_sql', {
            sql_query: "NOTIFY pgrst, 'reload schema';"
        });

        if (error && !error.message.includes('execute_sql')) {
            console.error("Error reloading schema:", error);
        } else {
            console.log("Successfully sent reload schema notification to PostgREST.");
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

reloadSchema();
