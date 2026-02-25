
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectMediaItems() {
    console.log('Inspecting media_items table...');

    const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching row:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found in media_items:');
        Object.keys(data[0]).forEach(col => console.log(`- ${col}`));
        console.log('\nSample data:', data[0]);
    } else {
        console.log('Table is empty.');
    }
}

inspectMediaItems();
