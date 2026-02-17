
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
    console.log('Checking media_items columns...');
    const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching media_items:', error.message);
    } else if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
    } else {
        console.log('media_items exists but is empty, cannot infer columns from data.');
        // If empty, I can't guess columns easily without information_schema or inserting dummy data.
        // But count was 11, so it should be fine.
    }
}

inspectSchema();
