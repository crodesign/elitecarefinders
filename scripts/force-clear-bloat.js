// scripts/force-clear-bloat.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function forceClear() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        const { data: contacts, error } = await supabase.from('contacts').select('*');
        if (error) throw error;

        let updatedCount = 0;

        for (const contact of contacts) {
            let wasModified = false;
            const updatePayload = {};

            for (const key of Object.keys(contact)) {
                if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;

                const val = contact[key];
                if (val !== null && val !== undefined) {
                    const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                    const len = Buffer.byteLength(strVal);

                    if (len > 25000) {
                        console.log(`Found massive property in ${contact.id}, field ${key}, size ${len} bytes. Wiping...`);

                        // Overwrite correctly based on original type
                        if (Array.isArray(val)) {
                            updatePayload[key] = [];
                        } else if (typeof val === 'object') {
                            updatePayload[key] = null;
                        } else {
                            updatePayload[key] = '[Heavy data removed for performance]';
                        }
                        wasModified = true;
                    }
                }
            }

            if (wasModified) {
                console.log(`Updating contact ${contact.id}...`);
                const { error: updateError } = await supabase
                    .from('contacts')
                    .update(updatePayload)
                    .eq('id', contact.id);

                if (updateError) {
                    console.error('Failed to update:', updateError);
                } else {
                    updatedCount++;
                }
            }
        }

        console.log(`Successfully cleared bloat from ${updatedCount} contacts.`);

        // Re-check size
        const { data: checkData } = await supabase.from('contacts').select('*');
        console.log(`New DB Payload size: ${(Buffer.byteLength(JSON.stringify(checkData)) / 1024 / 1024).toFixed(2)} MB`);

    } catch (err) {
        console.error("Script error:", err);
    }
}
forceClear();
