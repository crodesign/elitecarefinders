const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // Search by filename (the base name without variant suffix)
    const { data: items } = await supabase
        .from('media_items')
        .select('*')
        .ilike('filename', 'The-Plaza-at-Waikiki-25%');

    if (!items || items.length === 0) {
        console.log('No DB records found for The-Plaza-at-Waikiki-25*');

        // Try case-insensitive broader search
        const { data: items2 } = await supabase
            .from('media_items')
            .select('*')
            .ilike('filename', '%plaza-at-waikiki%');
        console.log('Broader search results:', items2?.length || 0);
        items2?.forEach(i => console.log(' ', JSON.stringify({ filename: i.filename, url: i.url, url_thumb: i.url_thumb })));
        return;
    }

    items.forEach(i => {
        console.log('--- DB Record ---');
        console.log('id:        ', i.id);
        console.log('filename:  ', i.filename);
        console.log('url:       ', i.url);
        console.log('url_large: ', i.url_large);
        console.log('url_medium:', i.url_medium);
        console.log('url_thumb: ', i.url_thumb);
        console.log('storage_path:', i.storage_path);
        console.log('folder_id: ', i.folder_id);
        console.log('alt_text:  ', i.alt_text);
        console.log();
    });
}
main().catch(console.error);
