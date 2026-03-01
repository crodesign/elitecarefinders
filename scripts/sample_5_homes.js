const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function sampleRandomHomes() {
    console.log(`Sampling another 5 different homes from Supabase...`);

    const { data, error } = await supabase
        .from('homes')
        .select('*')
        .neq('slug', 'wphu-1124')
        .neq('slug', 'hale-kuike')
        // Order by updated_at or id to get consistent random ones
        .order('id', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching', error.message);
        return;
    }

    if (data && data.length > 0) {
        for (const home of data) {
            console.log(`\n\n======================================================`);
            console.log(`--- Deep Check for ${home.title} (${home.slug}) ---`);
            console.log(`Status: ${home.status}`);
            console.log(`Capacity: ${home.capacity}`);
            console.log('Taxonomy IDs:', home.taxonomy_entry_ids);

            const fields = home.fields;
            if (fields && Object.keys(fields).length > 0) {
                console.log('\nExtracted Fields Payload:');
                console.log(JSON.stringify(fields, null, 2));
            } else {
                console.log('\nNo fields JSON object found on this home (or it is empty).');
            }
        }
    }
}

sampleRandomHomes();
