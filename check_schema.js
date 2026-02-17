
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking schema for user_profiles...');

    // We can't easily select information_schema via JS client without a function (usually),
    // but we can try to select the column and see if it errors.
    const { data, error } = await supabase
        .from('user_profiles')
        .select('manager_id')
        .limit(1);

    if (error) {
        console.error('Error selecting manager_id:', error.message);
        if (error.message.includes('column "manager_id" does not exist')) {
            console.log('\n❌ CRITICAL: The manager_id column does not exist in the user_profiles table.');
            console.log('The migration "migrations/add_manager_id_to_profiles.sql" likely needs to be run.');
        }
    } else {
        console.log('✅ Success: manager_id column exists.');
    }
}

checkSchema();
