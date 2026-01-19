const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        envVars[key] = value;
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function verifySchema() {
    console.log('=== Verifying Taxonomies Table ===\n');

    // 1. Check schema
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
        }
    });
    const schema = await response.json();

    if (schema.definitions && schema.definitions.taxonomies) {
        console.log('✓ Table exists! Columns:');
        const props = schema.definitions.taxonomies.properties;
        Object.keys(props).forEach(col => {
            console.log(`  - ${col}: ${props[col].type || props[col].format || 'unknown'}`);
        });
    } else {
        console.log('✗ Table not found in schema');
        return;
    }

    // 2. Test insert
    console.log('\n--- Testing INSERT ---');
    const { data: insertData, error: insertError } = await supabase
        .from('taxonomies')
        .insert({
            type: 'neighborhood',
            name: 'Downtown',
            slug: 'downtown',
            description: 'City center area'
        })
        .select()
        .single();

    if (insertError) {
        console.log('✗ Insert failed:', insertError.message);
    } else {
        console.log('✓ Insert successful:', insertData);
    }

    // 3. Test select
    console.log('\n--- Testing SELECT ---');
    const { data: selectData, error: selectError } = await supabase
        .from('taxonomies')
        .select('*');

    if (selectError) {
        console.log('✗ Select failed:', selectError.message);
    } else {
        console.log('✓ Select successful:', selectData.length, 'rows');
        selectData.forEach(row => console.log('  ', row));
    }

    console.log('\n=== Verification Complete ===');
}

verifySchema();
