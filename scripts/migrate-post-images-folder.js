/**
 * Migrates all media_items from the old "Post Images" subfolder structure
 * into a single flat "posts" folder at the root level.
 *
 * Old: Post Images -> [Category] -> [Post Title] -> images
 * New: posts -> images
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const DRY_RUN = process.argv.includes('--dry-run');
    if (DRY_RUN) console.log('[DRY RUN] No changes will be made.\n');

    // 1. Find or create the "posts" root folder
    let { data: postsFolder } = await s.from('media_folders').select('id, name').is('parent_id', null).eq('name', 'posts').maybeSingle();
    if (!postsFolder) {
        if (!DRY_RUN) {
            const { data } = await s.from('media_folders').insert({ name: 'posts', slug: 'posts', path: '/posts' }).select().single();
            postsFolder = data;
            console.log('Created "posts" folder:', postsFolder.id);
        } else {
            console.log('[DRY RUN] Would create "posts" folder');
            postsFolder = { id: 'dry-run-id' };
        }
    } else {
        console.log('"posts" folder exists:', postsFolder.id);
    }

    // 2. Find the old "Post Images" root folder
    const { data: oldRoot } = await s.from('media_folders').select('id').is('parent_id', null).eq('name', 'Post Images').maybeSingle();
    if (!oldRoot) {
        console.log('No "Post Images" folder found — nothing to migrate.');
        return;
    }

    // 3. Collect all descendant folder IDs under "Post Images"
    const allFolderIds = [];
    const queue = [oldRoot.id];
    while (queue.length > 0) {
        const parentId = queue.shift();
        allFolderIds.push(parentId);
        const { data: children } = await s.from('media_folders').select('id').eq('parent_id', parentId);
        (children || []).forEach(c => queue.push(c.id));
    }
    console.log(`Found ${allFolderIds.length} folders under "Post Images"`);

    // 4. Find all media_items in those folders
    const { data: items } = await s.from('media_items').select('id, filename, folder_id').in('folder_id', allFolderIds);
    console.log(`Found ${(items || []).length} media_items to migrate`);

    if ((items || []).length === 0) {
        console.log('Nothing to migrate.');
        return;
    }

    for (const item of (items || [])) {
        console.log(`  ${DRY_RUN ? '[DRY RUN] ' : ''}Moving: ${item.filename} (folder: ${item.folder_id} -> ${postsFolder.id})`);
    }

    if (!DRY_RUN) {
        const ids = items.map(i => i.id);
        const { error } = await s.from('media_items').update({ folder_id: postsFolder.id }).in('id', ids);
        if (error) {
            console.error('Error updating media_items:', error.message);
        } else {
            console.log(`\nMoved ${ids.length} items to "posts" folder.`);
        }
    }
}
main().catch(console.error);
