
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTable() {
    console.log('Inspecting user_profiles table...');

    // Fetch one row to see the keys (columns)
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching row:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found in user_profiles:');
        const columns = Object.keys(data[0]);
        columns.forEach(col => console.log(`- ${col}`));

        if (columns.includes('manager_id')) {
            console.log('\n✅ manager_id column EXISTS.');
        } else {
            console.log('\n❌ manager_id column MISSING.');
        }
    } else {
        console.log('Table is empty, cannot infer columns from data.');
        // Fallback: try to select just manager_id to see if it errors
        const { error: colError } = await supabase.from('user_profiles').select('manager_id').limit(1);
        if (colError) {
            console.log('❌ Verified: manager_id column does not exist (select failed).');
        } else {
            console.log('✅ Verified: manager_id column exists (select succeeded).');
        }
    }
}

inspectTable();
