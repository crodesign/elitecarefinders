// scripts/dump-all-triggers.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function dumpTriggers() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        // This RPC gets all triggers on contacts securely
        const { data, error } = await supabase.rpc('debug_get_all_triggers');

        if (error) {
            console.log("Could not fetch triggers:", error.message);
        } else {
            fs.writeFileSync('all_triggers_dump.json', JSON.stringify(data, null, 2));
            console.log('Saved to all_triggers_dump.json');
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
dumpTriggers();
