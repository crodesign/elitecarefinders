
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFolders() {
    const { data: folders, error } = await supabase
        .from('media_folders')
        .select('id, name, path, slug, parent_id');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- ALL FOLDERS ---');
    folders.forEach(f => {
        console.log(`ID: ${f.id} | Name: ${f.name} | Slug: ${f.slug} | Path: ${f.path} | Parent: ${f.parent_id}`);
    });
}

checkFolders();
