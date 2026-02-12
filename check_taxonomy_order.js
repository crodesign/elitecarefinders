// Script to run SQL and check taxonomy_entries order
const fs = require('fs');
const path = require('path');

// Load .env.local manually
function loadEnv() {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=');
            process.env[key] = value;
        }
    }
}

loadEnv();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTaxonomyEntries() {
    // Get top-level entries for Locations taxonomy
    const { data: taxonomies, error: taxError } = await supabase
        .from('taxonomies')
        .select('id, name')
        .ilike('name', '%location%')
        .limit(1);

    if (taxError) {
        console.error('Error fetching taxonomy:', taxError);
        return;
    }

    if (!taxonomies || taxonomies.length === 0) {
        console.log('No Location taxonomy found');
        return;
    }

    const taxonomyId = taxonomies[0].id;
    console.log(`Found taxonomy: ${taxonomies[0].singular_name} (${taxonomyId})\n`);

    // Get top-level entries ordered by display_order
    const { data: entries, error } = await supabase
        .from('taxonomy_entries')
        .select('id, name, display_order')
        .eq('taxonomy_id', taxonomyId)
        .is('parent_id', null)
        .order('display_order')
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Top-level entries (ordered by display_order):');
    console.log('─'.repeat(50));
    entries.forEach((e, i) => {
        console.log(`${i}: display_order=${e.display_order}, name="${e.name}"`);
    });
}

checkTaxonomyEntries().catch(console.error);
