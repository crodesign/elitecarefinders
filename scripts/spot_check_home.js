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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHome() {
    console.log('Querying local DB for Hookano address...');

    const { data: addressData } = await supabase
        .from('homes')
        .select('*')
        .ilike('address', '%Hookano%');

    if (addressData && addressData.length > 0) {
        console.log('Found by address Hookano:', JSON.stringify(addressData, null, 2));
    } else {
        console.log('Not found by address either.');

        // Let's just print a random home to see its fields.
        const { data: randomHome } = await supabase
            .from('homes')
            .select('*')
            .limit(1);
        console.log('Here is what a home looks like:', JSON.stringify(randomHome[0], null, 2));
    }
}

checkHome();
