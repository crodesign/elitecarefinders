'use strict';

/**
 * migrate-post-media-folders.js
 *
 * Migrates media_items from the shared root "posts" folder into per-post
 * subfolders (posts/{post-slug}), matching images to posts via URL references
 * in posts.images[] and posts.metadata.instructions[].image.
 *
 * Usage:
 *   node scripts/migrate-post-media-folders.js
 *   node scripts/migrate-post-media-folders.js --dry-run
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function slugify(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
}

async function findOrCreateFolder(name, parentId) {
    let query = supabase.from('media_folders').select('*').eq('name', name);
    if (parentId) {
        query = query.eq('parent_id', parentId);
    } else {
        query = query.is('parent_id', null);
    }
    const { data: existing } = await query.limit(1).maybeSingle();
    if (existing) return existing;

    if (DRY_RUN) {
        console.log(`  [dry-run] Would create folder: "${name}" (parent: ${parentId || 'root'})`);
        return { id: `dry-run-${name}`, name, parent_id: parentId, slug: slugify(name) };
    }

    // Derive path for new folder
    let folderPath = name;
    if (parentId) {
        const { data: parent } = await supabase
            .from('media_folders')
            .select('path')
            .eq('id', parentId)
            .single();
        if (parent?.path) folderPath = `${parent.path}/${name}`;
    }

    const { data, error } = await supabase
        .from('media_folders')
        .insert({ name, slug: slugify(name), parent_id: parentId, path: folderPath })
        .select()
        .single();

    if (error) throw new Error(`Failed to create folder "${name}": ${error.message}`);
    return data;
}

async function main() {
    console.log(`\nPost media folder migration${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

    // 1. Find the root "posts" folder
    const { data: postsRoot } = await supabase
        .from('media_folders')
        .select('*')
        .eq('name', 'posts')
        .is('parent_id', null)
        .limit(1)
        .maybeSingle();

    if (!postsRoot) {
        console.log('No root "posts" folder found — nothing to migrate.');
        return;
    }
    console.log(`Found root posts folder: ${postsRoot.id}\n`);

    // 2. Get all media_items directly in the root posts folder
    const { data: sharedItems, error: itemsErr } = await supabase
        .from('media_items')
        .select('id, filename, url, url_large, url_medium, url_thumb, folder_id')
        .eq('folder_id', postsRoot.id);

    if (itemsErr) throw new Error(`Failed to fetch media items: ${itemsErr.message}`);
    if (!sharedItems || sharedItems.length === 0) {
        console.log('No media items in shared posts folder — nothing to migrate.');
        return;
    }
    console.log(`Found ${sharedItems.length} media items in shared posts folder.\n`);

    // Build URL → media_item map
    const urlToItem = {};
    for (const item of sharedItems) {
        urlToItem[item.url] = item;
    }

    // 3. Fetch all posts with images
    const { data: posts, error: postsErr } = await supabase
        .from('posts')
        .select('id, title, slug, images, metadata');

    if (postsErr) throw new Error(`Failed to fetch posts: ${postsErr.message}`);
    console.log(`Found ${posts.length} posts to process.\n`);

    // 4. Build item → post mapping
    const itemToPost = {}; // mediaItem.id → post

    for (const post of posts) {
        const urls = [];

        if (Array.isArray(post.images)) urls.push(...post.images);

        // Recipe step images in metadata.instructions
        if (post.metadata?.instructions && Array.isArray(post.metadata.instructions)) {
            for (const step of post.metadata.instructions) {
                if (step.image) urls.push(step.image);
            }
        }

        for (const url of urls) {
            const item = urlToItem[url];
            if (item) {
                if (itemToPost[item.id] && itemToPost[item.id].id !== post.id) {
                    console.warn(`  WARNING: item ${item.filename} matched multiple posts (${itemToPost[item.id].slug}, ${post.slug})`);
                }
                itemToPost[item.id] = post;
            }
        }
    }

    const matched = Object.keys(itemToPost).length;
    const unmatched = sharedItems.filter(i => !itemToPost[i.id]);
    console.log(`Matched: ${matched} items → posts`);
    console.log(`Unmatched: ${unmatched.length} items (not referenced by any post)\n`);

    // 6. Group by post and migrate
    const postGroups = {};
    for (const [itemId, post] of Object.entries(itemToPost)) {
        if (!postGroups[post.id]) postGroups[post.id] = { post, itemIds: [] };
        postGroups[post.id].itemIds.push(itemId);
    }

    let movedCount = 0;
    let errorCount = 0;

    for (const { post, itemIds } of Object.values(postGroups)) {
        const subfolderName = slugify(post.title);
        console.log(`Post: "${post.title}" (${itemIds.length} items → posts/${subfolderName})`);

        let subfolder;
        try {
            subfolder = await findOrCreateFolder(subfolderName, postsRoot.id);
        } catch (err) {
            console.error(`  ERROR creating subfolder: ${err.message}`);
            errorCount++;
            continue;
        }

        for (const itemId of itemIds) {
            const item = sharedItems.find(i => i.id === itemId);
            console.log(`  Moving: ${item.filename}`);

            if (!DRY_RUN) {
                const { error: updateErr } = await supabase
                    .from('media_items')
                    .update({ folder_id: subfolder.id })
                    .eq('id', itemId);

                if (updateErr) {
                    console.error(`  ERROR updating item ${itemId}: ${updateErr.message}`);
                    errorCount++;
                } else {
                    movedCount++;
                }
            } else {
                movedCount++;
            }
        }
    }

    // 7. Report unmatched items
    if (unmatched.length > 0) {
        console.log('\nUnmatched items (left in shared folder):');
        for (const item of unmatched) {
            console.log(`  - ${item.filename} (${item.url})`);
        }
    }

    console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Done. Moved: ${movedCount}, Errors: ${errorCount}`);
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
