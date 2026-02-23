// scripts/check-db-locks.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function debugTimeouts() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        console.log('--- Checking for Active Locks on `contacts` ---');
        const { data: locks, error: lockErr } = await supabase.rpc('debug_get_active_locks');
        if (lockErr) console.error("Lock error:", lockErr.message);
        else console.log(locks);

        console.log('\n--- Checking Triggers on `contacts` ---');
        const { data: triggers, error: trigErr } = await supabase.rpc('debug_get_contacts_triggers');
        if (trigErr) console.error("Trigger error:", trigErr.message);
        else {
            triggers.forEach(t => {
                console.log(`\nTrigger: ${t.trigger_name}`);
                console.log(`Definition: ${t.trigger_def}`);
            });
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
debugTimeouts();
