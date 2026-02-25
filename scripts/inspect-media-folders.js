
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFolders() {
    const { data, error } = await supabase
        .from('media_folders')
        .select('id, name, slug, parent_id, path')
        .order('path');

    if (error) {
        console.error("Error fetching folders:", error);
        return;
    }

    const filtered = data.filter(f => f.name.toLowerCase().includes('site'));
    console.log("Filtered Media Folders (Site):");
    console.log(JSON.stringify(filtered, null, 2));
}

inspectFolders();
