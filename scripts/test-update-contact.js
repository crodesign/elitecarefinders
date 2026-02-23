// scripts/test-update-contact.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testUpdate() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        console.log('Fetching contact to update...');
        const { data: contacts, error: fetchError } = await supabase
            .from('contacts')
            .select('*')
            .limit(1);

        if (fetchError || !contacts.length) {
            console.error("Could not fetch a contact:", fetchError);
            return;
        }

        const testId = contacts[0].id;
        console.log(`Updating contact ${testId}...`);

        // Test updating specific fields like the React app does
        const testPayload = {
            first_name: 'TestFName ' + Date.now(),
            last_name: 'TestLName',
            status: 'Active',
            email: 'test@example.com'
        };

        const startTime = Date.now();
        const { data, error } = await supabase
            .from('contacts')
            .update(testPayload)
            .eq('id', testId)
            .select()
            .single();
        const duration = Date.now() - startTime;

        console.log(`Update took ${duration}ms`);
        console.log("Response:", { data: data ? "Success" : null, error });

    } catch (err) {
        console.error("Script error:", err);
    }
}
testUpdate();
