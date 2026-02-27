// run-manual-id-update.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env loading
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- EDIT THESE VALUES ---
// Format: "accounts/123456789"
const ACCOUNT_ID = "accounts/14994372770968838215";
// Format: "accounts/123456789/locations/987654321"
const LOCATION_ID = "accounts/14994372770968838215/locations/17480773976184654337";
// -------------------------

async function updateIds() {
    console.log('Fetching integration record...');
    const { data: integration, error: getError } = await supabase
        .from('google_integrations')
        .select('id')
        .single();

    if (getError || !integration) {
        console.error('No integration record found. Please connect Google in the dashboard first.');
        return;
    }

    console.log(`Updating integration ${integration.id}...`);
    const { error: updateError } = await supabase
        .from('google_integrations')
        .update({
            account_id: ACCOUNT_ID,
            location_id: LOCATION_ID
        })
        .eq('id', integration.id);

    if (updateError) {
        console.error('Update failed:', updateError.message);
    } else {
        console.log('Successfully updated Account and Location IDs!');
        console.log('You can now try the Sync button in the dashboard again.');
    }
}

updateIds();
