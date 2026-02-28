const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);
const wpData = require('./wp_homes.json');

async function checkDeepFields() {
    console.log(`Checking deep fields for matched WP homes against Supabase...`);

    // We'll just look closely at WPHU-1124 and Hale Ku’ike
    const targetSlugs = ['wphu-1124', 'hale-kuike'];

    for (const slug of targetSlugs) {
        const { data, error } = await supabase
            .from('homes')
            .select('*')
            .eq('slug', slug);

        if (error) {
            console.error('Error fetching', slug, error.message);
            continue;
        }

        if (data && data.length > 0) {
            const home = data[0];
            console.log(`\n\n--- Deep Check for ${home.title} ---`);
            console.log(`Capacity: ${home.capacity}`);

            // Print out all boolean taxonomies / facility tags
            console.log('Taxonomy IDs:', home.taxonomy_entry_ids);

            // Let's dig into the fields JSON for Room and Provider details
            const fields = home.fields;
            if (fields) {
                console.log('\nExtracted Fields Payload:');
                console.log(JSON.stringify(fields, null, 2));
            } else {
                console.log('No fields JSON object found on this home.');
            }

        }
    }
}

checkDeepFields();
