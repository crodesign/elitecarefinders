const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('Connecting to Supabase at:', supabaseUrl);

    // Try to query information_schema (might fail with anon key depending on permissions)
    // Note: Standard Supabase REST API doesn't expose information_schema by default to anon.
    // We'll try a different approach: just check if we can connect.
    // But user specifically asked to LIST tables.

    // If we can't query schema, we'll try to get data from a probable table if it existed,
    // but since we don't know them, we can only try the schema query.

    // Note: direct SQL isn't possible with client-js without an RPC.
    // We'll try:
    const { data, error } = await supabase
        .from('information_schema.tables') // This usually requires extra setup or won't work via REST
        .select('*')
        .eq('table_schema', 'public');

    // NOTE: Querying system tables via the JS client usually fails unless expressly allowed.
    // However, let's try. If it fails, we will be honest.

    if (error) {
        console.error('Error querying tables:', error.message);
        if (error.code === 'PGRST200') {
            console.log("Hint: The REST API might not have permission to access 'information_schema'. This is normal for the anon key.");
        }
    } else {
        if (data.length === 0) {
            console.log('Connection successful. No public tables found (or none visible to anon role).');
        } else {
            console.log('found tables:', data.map(t => t.table_name).join(', '));
        }
    }
}

listTables();
