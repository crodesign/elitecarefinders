const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // Check what columns exist on posts table
    const { data: row } = await s.from('posts').select('*').limit(1).single();
    if (row) {
        console.log('posts table columns:', Object.keys(row));
    }

    // Check media_items for all posts-related folders
    const { data: postRoot } = await s.from('media_folders').select('id, name').is('parent_id', null).eq('name', 'Post Images').maybeSingle();
    if (postRoot) {
        // Get all media_items under Post Images (direct children folders)
        const { data: catFolders } = await s.from('media_folders').select('id, name').eq('parent_id', postRoot.id);
        console.log('\nCategory folders under Post Images:', (catFolders || []).map(f => f.name));

        for (const cat of (catFolders || [])) {
            const { data: subFolders } = await s.from('media_folders').select('id, name').eq('parent_id', cat.id);
            for (const sub of (subFolders || [])) {
                const { data: items, count } = await s.from('media_items').select('id', { count: 'exact' }).eq('folder_id', sub.id);
                console.log(`  ${cat.name}/${sub.name}: ${count} items`);
            }
            const { count: catDirectCount } = await s.from('media_items').select('id', { count: 'exact' }).eq('folder_id', cat.id);
            if (catDirectCount > 0) console.log(`  ${cat.name} (direct): ${catDirectCount} items`);
        }

        const { count: rootDirectCount } = await s.from('media_items').select('id', { count: 'exact' }).eq('folder_id', postRoot.id);
        if (rootDirectCount > 0) console.log(`Post Images (direct): ${rootDirectCount} items`);
    }
}
main().catch(console.error);
