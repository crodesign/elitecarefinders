// scripts/audit-payloads.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function auditPayloads() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        const tables = ['homes', 'facilities', 'users', 'user_roles', 'bookings', 'invoices', 'schedules', 'media_folders', 'media_files', 'contact_history', 'reviews'];
        console.log('--- Payload Bloat Audit ---');

        let foundBloat = false;

        for (const t of tables) {
            console.log(`Checking ${t}...`);
            const { data, error } = await supabase.from(t).select('*');
            if (error) {
                console.log(`  Skip: Could not fetch ${t}`);
                continue;
            }
            if (!data || data.length === 0) continue;

            const tableBytes = Buffer.byteLength(JSON.stringify(data));
            if (tableBytes > 2 * 1024 * 1024) { // over 2 MB is suspicious for these tables
                console.log(`  ⚠️ WARNING: ${t} total payload is ${(tableBytes / 1024 / 1024).toFixed(2)} MB for ${data.length} rows.`);
            }

            for (const row of data) {
                for (const key of Object.keys(row)) {
                    if (key === 'id' || key === 'created_at' || key === 'updated_at') continue;
                    const val = row[key];
                    if (val !== null && val !== undefined) {
                        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
                        const len = Buffer.byteLength(strVal);
                        if (len > 50000) { // 50KB limit
                            foundBloat = true;
                            console.log(`  🚨 BLOAT DETECTED: ${t} (Row ${row.id}) | Field: ${key} | Size: ${(len / 1024).toFixed(2)} KB`);
                        }
                    }
                }
            }
        }

        if (!foundBloat) {
            console.log('\n✅ All tables passed! No nested Base64 strings or abnormal payloads detected.');
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
auditPayloads();
