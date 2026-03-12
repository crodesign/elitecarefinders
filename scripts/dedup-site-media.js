'use strict';

/**
 * dedup-site-media.js
 *
 * Finds duplicate media_items rows in the "site" folder (same filename,
 * multiple rows). Keeps the row with an R2 URL; deletes the rest.
 * Falls back to keeping the most-recently-created row if none has an R2 URL.
 *
 * Usage:
 *   node scripts/dedup-site-media.js           # live
 *   node scripts/dedup-site-media.js --dry-run # preview only
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');
const R2_HOST = 'pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log(DRY_RUN ? '[DRY RUN]\n' : '[LIVE]\n');

    // Get the site folder id
    const { data: folder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('slug', 'site')
        .is('parent_id', null)
        .single();

    if (!folder) {
        console.error('Site folder not found');
        process.exit(1);
    }

    // Fetch all items in the site folder
    const { data: items, error } = await supabase
        .from('media_items')
        .select('id, filename, url, created_at')
        .eq('folder_id', folder.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Query failed:', error.message);
        process.exit(1);
    }

    console.log(`Total items in site folder: ${items.length}\n`);

    // Group by filename
    const byFilename = {};
    for (const item of items) {
        if (!byFilename[item.filename]) byFilename[item.filename] = [];
        byFilename[item.filename].push(item);
    }

    const dupes = Object.entries(byFilename).filter(([, rows]) => rows.length > 1);

    if (dupes.length === 0) {
        console.log('No duplicates found.');
        return;
    }

    console.log(`Found ${dupes.length} filenames with duplicates:\n`);

    const toDelete = [];

    for (const [filename, rows] of dupes) {
        console.log(`  ${filename} — ${rows.length} rows`);

        // Prefer the row with an R2 URL; otherwise the most recent (first, already sorted desc)
        const keeper = rows.find(r => r.url.includes(R2_HOST)) ?? rows[0];

        for (const row of rows) {
            if (row.id !== keeper.id) {
                console.log(`    DELETE id=${row.id}  url=${row.url}`);
                toDelete.push(row.id);
            } else {
                console.log(`    KEEP   id=${row.id}  url=${row.url}`);
            }
        }
    }

    console.log(`\nRows to delete: ${toDelete.length}`);

    if (DRY_RUN || toDelete.length === 0) {
        console.log('\nDry run — no changes made.');
        return;
    }

    const { error: delError } = await supabase
        .from('media_items')
        .delete()
        .in('id', toDelete);

    if (delError) {
        console.error('Delete failed:', delError.message);
        process.exit(1);
    }

    console.log(`\nDeleted ${toDelete.length} duplicate rows.`);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
