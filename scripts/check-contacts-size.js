// scripts/check-contacts-size.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkSize() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        // Fetch contacts using service role
        console.time('Fetch Contacts');
        const { data, error } = await supabase.from('contacts').select('*');
        console.timeEnd('Fetch Contacts');

        if (error) {
            console.error('Error:', error);
            return;
        }

        const sizeInBytes = Buffer.byteLength(JSON.stringify(data));
        console.log(`Payload size: ${(sizeInBytes / 1024 / 1024).toFixed(2)} MB`);

        // Find largest column
        if (data.length > 0) {
            const first = data[0];
            let largestField = null;
            let largestSize = 0;

            for (const key in first) {
                const len = first[key] ? Buffer.byteLength(String(first[key])) : 0;
                if (len > largestSize) {
                    largestSize = len;
                    largestField = key;
                }
            }
            console.log(`Largest field: ${largestField} (${(largestSize / 1024).toFixed(2)} KB)`);
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
checkSize();
