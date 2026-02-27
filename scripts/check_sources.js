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

async function checkSources() {
    console.log('Checking review sources...');

    const { data, error } = await supabase
        .from('reviews')
        .select('source');

    if (error) {
        console.error('Fetch failed:', error);
    } else {
        const counts = {};
        data.forEach(r => {
            counts[r.source] = (counts[r.source] || 0) + 1;
        });
        console.log('Source counts:', counts);
    }
}

checkSources();
