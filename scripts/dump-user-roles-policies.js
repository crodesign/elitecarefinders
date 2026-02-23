// scripts/dump-user-roles-policies.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function dumpPolicies() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        const { data: policies, error: polErr } = await supabase.rpc('debug_get_policies', { table_name: 'user_roles' });

        if (polErr) {
            console.error("Error:", polErr.message);
        } else {
            console.log(JSON.stringify(policies, null, 2));
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
dumpPolicies();
