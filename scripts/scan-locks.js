// scripts/scan-locks.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function scanLocks() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        console.log('--- Checking for Blocking Locks ---');
        const { data: blockingData, error: blockingErr } = await supabase.rpc('debug_get_blocking_locks');
        if (blockingErr) console.error("Error:", blockingErr.message);
        else console.log(blockingData.length ? blockingData : "No active blocking locks found.");

        console.log('\n--- Checking for Stuck/Active Queries ---');
        const { data: stuckData, error: stuckErr } = await supabase.rpc('debug_get_stuck_activity');
        if (stuckErr) console.error("Error:", stuckErr.message);
        else console.log(stuckData.length ? stuckData : "No active non-idle queries found.");

    } catch (err) {
        console.error("Script error:", err);
    }
}
scanLocks();
