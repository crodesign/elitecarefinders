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

async function testUpdate() {
    console.log('Fetching taxonomies...');

    // First get the taxonomy
    const { data: taxonomies, error: fetchError } = await supabase
        .from('taxonomies')
        .select('*');

    if (fetchError) {
        console.error('Fetch error:', fetchError);
        return;
    }

    console.log('Taxonomies:', taxonomies);

    if (taxonomies.length > 0) {
        const tax = taxonomies[0];
        console.log('\\nTrying to update type column for id:', tax.id);

        const { data, error } = await supabase
            .from('taxonomies')
            .update({ type: 'test_type', updated_at: new Date().toISOString() })
            .eq('id', tax.id)
            .select();

        if (error) {
            console.error('Update error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', error.details);
            console.error('Error hint:', error.hint);
        } else {
            console.log('Update succeeded:', data);

            // Restore original
            await supabase
                .from('taxonomies')
                .update({ type: tax.type, updated_at: new Date().toISOString() })
                .eq('id', tax.id);
            console.log('Restored original value');
        }
    }
}

testUpdate();
