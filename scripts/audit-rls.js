// scripts/audit-rls.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function auditRLS() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

        const { data: policies, error } = await supabase.rpc('run_sql', {
            sql: `
            SELECT 
                schemaname, 
                tablename, 
                policyname, 
                cmd, 
                qual, 
                with_check 
            FROM pg_policies 
            WHERE schemaname = 'public';
            `
        });

        if (error) {
            console.log("Could not fetch policies via run_sql (might not exist):", error.message);
            // Use our existing debug_get_policies RPC but loop over tables
            const tables = ['homes', 'facilities', 'users', 'user_roles', 'bookings', 'invoices', 'schedules', 'media_folders', 'media_files', 'contact_history', 'reviews'];
            let allPol = [];
            for (const t of tables) {
                const { data: polData, error: polErr } = await supabase.rpc('debug_get_policies', { table_name: t });
                if (!polErr && polData) {
                    polData.forEach(p => allPol.push({ tablename: t, ...p }));
                }
            }

            let badPolicies = [];
            allPol.forEach(p => {
                const qual = p.polqual || '';
                const withCheck = p.polwithcheck || '';

                // Look for the exact problematic nested EXISTS query on user_roles
                // we used to have on contacts. This creates cartesian joins on updates.
                if (
                    (qual.includes('EXISTS ( SELECT 1') && qual.includes('user_roles')) ||
                    (withCheck.includes('EXISTS ( SELECT 1') && withCheck.includes('user_roles'))
                ) {
                    badPolicies.push(p);
                }
            });

            console.log('\n--- RLS Policy Audit Results ---');
            if (badPolicies.length > 0) {
                console.log(`⚠️ WARNING: Found ${badPolicies.length} potentially unoptimized RLS policies using EXISTS:\n`);
                badPolicies.forEach(p => {
                    console.log(`Table: ${p.tablename} | Policy: ${p.polname} | Cmd: ${p.polcmd}`);
                });
            } else {
                console.log('✅ No unoptimized EXISTS policies found in standard tables.');
            }
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}
auditRLS();
