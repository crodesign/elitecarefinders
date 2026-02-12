// Script to backfill display_order for taxonomy entries
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

async function backfillDisplayOrder() {
    console.log('Fetching all taxonomies...\n');

    // Get all taxonomies
    const { data: taxonomies, error: taxError } = await supabase
        .from('taxonomies')
        .select('id, name');

    if (taxError) {
        console.error('Error fetching taxonomies:', taxError);
        return;
    }

    for (const taxonomy of taxonomies) {
        console.log(`Processing taxonomy: ${taxonomy.name || taxonomy.id}`);

        // Get top-level entries for this taxonomy, ordered alphabetically
        const { data: entries, error } = await supabase
            .from('taxonomy_entries')
            .select('id, name')
            .eq('taxonomy_id', taxonomy.id)
            .is('parent_id', null)
            .order('name', { ascending: true });

        if (error) {
            console.error(`  Error fetching entries:`, error);
            continue;
        }

        console.log(`  Found ${entries.length} top-level entries`);

        // Update each entry with sequential display_order
        for (let i = 0; i < entries.length; i++) {
            const { error: updateError } = await supabase
                .from('taxonomy_entries')
                .update({ display_order: i })
                .eq('id', entries[i].id);

            if (updateError) {
                console.error(`  Error updating ${entries[i].name}:`, updateError);
            }
        }

        console.log(`  ✅ Updated display_order for ${entries.length} entries`);
    }

    console.log('\nDone!');
}

backfillDisplayOrder().catch(console.error);
