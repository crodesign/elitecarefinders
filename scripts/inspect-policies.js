
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPolicies() {
    const { data, error } = await supabase
        .rpc('get_policies', { table_name: 'media_items' });

    if (error) {
        // If rpc fails, try querying pg_policies
        const { data: policies, error: polError } = await supabase
            .from('pg_policies')
            .select('*')
            .eq('tablename', 'media_items');

        if (polError) {
            // Try raw SQL if possible, or just list names via a different method
            console.error("Could not fetch policies via traditional means.");
            // We'll just try to insert as anon and see if it fails to confirm.
            return;
        }
        console.log("Policies for media_items:");
        console.table(policies);
    } else {
        console.log("Policies for media_items:");
        console.table(data);
    }
}

inspectPolicies();
