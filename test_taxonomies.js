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

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log('Testing full INSERT into taxonomies...');

    const { data, error } = await supabase
        .from('taxonomies')
        .insert({
            type: 'neighborhood',
            name: 'Downtown',
            slug: 'downtown',
            description: 'City center area'
        })
        .select()
        .single();

    if (error) {
        console.error('INSERT Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('INSERT Success! Data:', JSON.stringify(data, null, 2));
    }
}

testInsert();
