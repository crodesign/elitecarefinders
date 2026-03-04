const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // Posts that have images
    const { data: posts } = await s.from('posts').select('id, title, slug, post_type, images').not('images', 'is', null);
    const postsWithImages = (posts || []).filter(p => p.images && p.images.length > 0);
    console.log(`Posts with images: ${postsWithImages.length} of ${(posts || []).length} total`);

    // Collect all URLs from posts.images
    const allUrls = postsWithImages.flatMap(p => p.images);
    console.log(`Total image URLs across all posts: ${allUrls.length}`);
    if (allUrls.length > 0) {
        const sample = allUrls.slice(0, 3);
        console.log('Sample URLs:', sample);
    }

    // Check how many of those URLs have media_items records
    if (allUrls.length > 0) {
        const { data: found } = await s.from('media_items').select('url').in('url', allUrls);
        const foundUrls = new Set((found || []).map(r => r.url));
        const missing = allUrls.filter(u => !foundUrls.has(u));
        console.log(`\nmedia_items records found for post URLs: ${foundUrls.size} of ${allUrls.length}`);
        if (missing.length > 0) {
            console.log(`Missing from media_items (${missing.length}):`, missing.slice(0, 5));
        }
    }

    // Check what folders exist for posts
    const { data: postRoot } = await s.from('media_folders').select('id, name').is('parent_id', null).eq('name', 'Post Images').maybeSingle();
    console.log('\nPost Images root folder:', postRoot ? `id=${postRoot.id}` : 'NOT FOUND');

    if (postRoot) {
        const { data: subfolders } = await s.from('media_folders').select('id, name').eq('parent_id', postRoot.id);
        console.log('Subfolders under Post Images:', (subfolders || []).map(f => f.name));
    }

    // Check media_items for posts (look at folder structure)
    if (allUrls.length > 0) {
        const { data: items } = await s.from('media_items').select('id, folder_id, url').in('url', allUrls);
        const folderIds = [...new Set((items || []).map(i => i.folder_id).filter(Boolean))];
        console.log('\nFolder IDs for post media_items:', folderIds);
        if (folderIds.length > 0) {
            const { data: folders } = await s.from('media_folders').select('id, name, path').in('id', folderIds);
            console.log('Folder names:', (folders || []).map(f => `${f.name} (${f.path || 'no-path'})`));
        }
        const nullFolderCount = (items || []).filter(i => !i.folder_id).length;
        if (nullFolderCount > 0) console.log(`Items with no folder: ${nullFolderCount}`);
    }
}
main().catch(console.error);
