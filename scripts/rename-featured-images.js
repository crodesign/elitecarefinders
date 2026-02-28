'use strict';
/**
 * rename-featured-images.js
 *
 * Renames all media_items with "-featured" in the filename to a numeric suffix
 * (next available number in that folder), keeps the image first in homes.images[].
 *
 * Usage:
 *   node scripts/rename-featured-images.js           # live run
 *   node scripts/rename-featured-images.js --dry-run # preview only
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const MEDIA_DIR = path.join(process.cwd(), 'public', 'images', 'media');
const VARIANT_SUFFIXES = ['-500x500.webp', '-200x200.webp', '-100x100.webp'];

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Rename Featured Images${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get all featured media items
    const { data: featuredItems, error } = await supabase
        .from('media_items')
        .select('id, filename, url, url_large, url_medium, url_thumb, folder_id')
        .like('filename', '%-featured.%');

    if (error) throw new Error(`Failed to fetch featured items: ${error.message}`);
    console.log(`Featured items to rename: ${featuredItems.length}\n`);

    // Get all homes to find/update image references
    const { data: homes } = await supabase
        .from('homes')
        .select('id, images');

    // Build a map of url → [home ids] for quick lookup
    const urlToHomes = new Map();
    for (const home of homes || []) {
        for (const url of home.images || []) {
            if (!urlToHomes.has(url)) urlToHomes.set(url, []);
            urlToHomes.get(url).push(home.id);
        }
    }

    // Group featured items by folder_id, then get siblings to determine next number
    const folderIds = [...new Set(featuredItems.map(f => f.folder_id))];

    // Load all siblings for affected folders
    const { data: allSiblings } = await supabase
        .from('media_items')
        .select('folder_id, filename')
        .in('folder_id', folderIds);

    // Build map: folder_id → max numeric suffix used
    const folderMaxNum = new Map();
    for (const item of allSiblings || []) {
        if (item.filename.includes('-featured')) continue;
        // Extract trailing number: slug-N.ext → N
        const m = /-(\d+)\.webp$/.exec(item.filename);
        if (!m) continue;
        const n = parseInt(m[1], 10);
        const cur = folderMaxNum.get(item.folder_id) || 0;
        if (n > cur) folderMaxNum.set(item.folder_id, n);
    }

    let renamed = 0, skipped = 0, errors = 0;

    for (const item of featuredItems) {
        const stem = item.filename.replace('-featured.webp', '');
        const nextNum = (folderMaxNum.get(item.folder_id) || 0) + 1;

        const newFilename = `${stem}-${nextNum}.webp`;
        const newUrl = `/images/media/${newFilename}`;
        const newUrlLarge  = `/images/media/${stem}-${nextNum}-500x500.webp`;
        const newUrlMedium = `/images/media/${stem}-${nextNum}-200x200.webp`;
        const newUrlThumb  = `/images/media/${stem}-${nextNum}-100x100.webp`;

        console.log(`  ${item.filename} → ${newFilename}`);

        if (DRY_RUN) {
            folderMaxNum.set(item.folder_id, nextNum);
            renamed++;
            continue;
        }

        // Rename main file on disk
        const oldPath = path.join(MEDIA_DIR, item.filename);
        const newPath = path.join(MEDIA_DIR, newFilename);

        if (!fs.existsSync(oldPath)) {
            console.log(`    WARN: file not found on disk: ${item.filename}`);
        } else {
            try {
                fs.renameSync(oldPath, newPath);
            } catch (err) {
                console.error(`    ERROR renaming file: ${err.message}`);
                errors++;
                continue;
            }
        }

        // Rename variant files on disk
        for (const suffix of VARIANT_SUFFIXES) {
            const oldVariant = path.join(MEDIA_DIR, item.filename.replace('.webp', suffix));
            const newVariant = path.join(MEDIA_DIR, newFilename.replace('.webp', suffix));
            if (fs.existsSync(oldVariant)) {
                try { fs.renameSync(oldVariant, newVariant); } catch {}
            }
        }

        // Update DB record
        const { error: dbErr } = await supabase.from('media_items')
            .update({
                filename:   newFilename,
                url:        newUrl,
                url_large:  newUrlLarge,
                url_medium: newUrlMedium,
                url_thumb:  newUrlThumb,
            })
            .eq('id', item.id);

        if (dbErr) {
            console.error(`    ERROR updating DB: ${dbErr.message}`);
            errors++;
            continue;
        }

        // Update homes.images[] references
        const affectedHomeIds = urlToHomes.get(item.url) || [];
        for (const homeId of affectedHomeIds) {
            const home = homes.find(h => h.id === homeId);
            if (!home) continue;
            const newImages = home.images.map(u => u === item.url ? newUrl : u);
            home.images = newImages; // update in-memory for consistency
            const { error: homeErr } = await supabase
                .from('homes')
                .update({ images: newImages })
                .eq('id', homeId);
            if (homeErr) console.error(`    ERROR updating home ${homeId}: ${homeErr.message}`);
        }

        folderMaxNum.set(item.folder_id, nextNum);
        renamed++;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Done`);
    console.log(`  Renamed: ${renamed}`);
    console.log(`  Errors:  ${errors}`);
    console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('\nFATAL:', err.message); process.exit(1); });
