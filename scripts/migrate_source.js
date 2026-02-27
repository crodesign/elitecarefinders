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
// Use Service Role key if available for full access
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Migrating reviews from source "wordpress" to "internal"...');

    const { data, error, count } = await supabase
        .from('reviews')
        .update({ source: 'internal' })
        .eq('source', 'wordpress')
        .select('*', { count: 'exact' });

    if (error) {
        console.error('Migration failed:', error);
    } else {
        console.log(`Successfully migrated ${count || 0} reviews.`);
    }
}

migrate();
