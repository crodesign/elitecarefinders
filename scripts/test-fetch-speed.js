// scripts/test-fetch-speed.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testFetchSpeed() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
        const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), serviceKeyMatch[1].trim());

        console.log('--- Timing Service Role Fetch (Bypasses RLS) ---');
        let start = Date.now();
        await supabase.from('contacts').select('*');
        console.log(`Service Role Time: ${Date.now() - start}ms`);

        // To test authenticated fetch, we need a user token. 
        // We can just use the Service Role to test if the query itself is fundamentally slow. 
        // Wait, the issue is likely RLS. Let's just create a generic test for Auth by creating a user.

        console.log('\nIf Service Role is fast but app is slow, it is RLS or Frontend.');
    } catch (err) {
        console.error("Script error:", err);
    }
}
testFetchSpeed();
