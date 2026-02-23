// scripts/test-react-query.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testQuery() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        // USE ANON KEY to trigger PostgREST RLS parsing just like the browser
        const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), anonKeyMatch[1].trim());

        // We can't actually bypass RLS auth with the anon key without a token,
        // but we CAN test if the Service Role encounters the same delay when executing 
        // the EXACT SAME supabase-js query structure as the app.

        const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
        const supabaseAdmin = createClient(urlMatch[1].trim(), serviceKeyMatch[1].trim());

        console.log('--- Timing React App Exact Query Structure ---');
        let start = Date.now();
        // This exactly mirrors lines 131-134 of useContacts.tsx
        const { data, error } = await supabaseAdmin
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        console.log(`React Fetch Time: ${Date.now() - start}ms`);
        if (error) console.error("Error:", error);

        // Test the exact App Update query structure
        console.log('\n--- Timing React App Exact Update Structure ---');
        if (data && data.length > 0) {
            const testId = data[0].id;
            let startUpdate = Date.now();

            // This mirrors lines 303-308 of useContacts.tsx
            const { data: updateData, error: updateError } = await supabaseAdmin
                .from('contacts')
                .update({ first_name: 'Test ' + Date.now() })
                .eq('id', testId)
                .select()
                .single();

            console.log(`React Update Time: ${Date.now() - startUpdate}ms`);
            if (updateError) console.error("Update Error:", updateError);
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
testQuery();
