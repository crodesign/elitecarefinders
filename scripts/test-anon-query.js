// scripts/test-anon-query.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testAnonQuery() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

        // This simulates a browser connection
        const supabase = createClient(urlMatch[1].trim(), anonKeyMatch[1].trim());

        console.log('--- Timing Anonymous Fetch (RLS Active) ---');
        let start = Date.now();
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        console.log(`Anonymous Fetch Time: ${Date.now() - start}ms`);
        if (error) {
            console.error("Error:", error);
        } else {
            console.log(`Fetched ${data ? data.length : 0} contacts.`);
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
testAnonQuery();
