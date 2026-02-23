// scripts/check-base64-content.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkContent() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        const { data, error } = await supabase.from('contacts').select('id, resident_full_name, personal_care_assistance');

        if (error) {
            console.error('Error:', error);
            return;
        }

        for (const row of data) {
            const content = typeof row.personal_care_assistance === 'string' ? row.personal_care_assistance : '';
            if (!content) continue;

            const sizeInKb = Buffer.byteLength(content) / 1024;

            if (sizeInKb > 50) {
                console.log(`\nContact: ${row.resident_full_name || row.id} (Size: ${(sizeInKb / 1024).toFixed(2)} MB)`);
                console.log(`First 250 characters of content: `);
                console.log(content.substring(0, 250) + "...\n");
            }
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
checkContent();
