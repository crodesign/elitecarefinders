// scripts/check-db.js
// This script connects directly to your Supabase project using the Service Role Key.
// The Service Role Key bypasses all Row Level Security (RLS) policies, allowing us
// to query the database directly to see if the contact is actually saving, and if not,
// what exactly is occurring.

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkDatabase() {
    try {
        // 1. Read the environment variables from .env.local
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');

        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

        if (!urlMatch || !keyMatch) {
            console.error("❌ Could not find the necessary keys in .env.local");
            return;
        }

        // 2. Initialize the Supabase admin client
        const supabaseUrl = urlMatch[1].trim();
        const serviceRoleKey = keyMatch[1].trim();
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        console.log("✅ Authenticated with Supabase Service Role (RLS bypassed)");

        // 3. Query the contacts table to get the 3 most recently modified contacts
        console.log("\n🔍 Fetching latest 3 contacts from the database...");
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select(`
                id,
                first_name,
                last_name,
                updated_at,
                email,
                emergency_contact_name,
                housing_type
            `)
            .order('updated_at', { ascending: false })
            .limit(3);

        if (error) {
            console.error("❌ Failed to query database:", error.message);
            return;
        }

        if (contacts && contacts.length > 0) {
            console.log("\n✅ Recent Contacts (Direct Database Pull):");
            console.log(JSON.stringify(contacts, null, 2));
        } else {
            console.log("\n⚠️ Table is empty or no contacts found.");
        }
    } catch (err) {
        console.error("❌ Script error:", err);
    }
}

checkDatabase();
