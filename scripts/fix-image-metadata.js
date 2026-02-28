/**
 * fix-image-metadata.js
 *
 * Fixes two issues left by the WebP conversion:
 *   1. mime_type still says image/jpeg for converted .webp files → set to image/webp
 *   2. width/height are NULL for migrated images → read from disk with sharp and populate
 *
 * Scope: only media_items with url LIKE '/images/media/%'
 *
 * Usage:
 *   node scripts/fix-image-metadata.js           # live
 *   node scripts/fix-image-metadata.js --dry-run # preview only
 */

require('dotenv').config({ path: '.env.local' });
const sharp = require('sharp');
const path = require('path');
const { existsSync } = require('fs');
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');
const MEDIA_DIR = path.join(process.cwd(), 'public', 'images', 'media');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BATCH_SIZE = 500;
const VARIANT_PATTERN = /-\d+x\d+\.webp$/;

async function fetchAllItems() {
    const all = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabase
            .from('media_items')
            .select('id, filename, mime_type, width, height')
            .like('url', '/images/media/%')
            .order('created_at', { ascending: true })
            .range(offset, offset + BATCH_SIZE - 1);
        if (error) { console.error('Fetch error:', error.message); process.exit(1); }
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < BATCH_SIZE) break;
        offset += BATCH_SIZE;
    }
    return all;
}

async function run() {
    console.log(DRY_RUN ? '[DRY RUN] No changes will be made.\n' : '[LIVE] Fixing image metadata...\n');

    const items = await fetchAllItems();

    // Exclude variant files (they have dimension suffixes like -500x500)
    const originals = items.filter(item => !VARIANT_PATTERN.test(item.filename));

    console.log(`Found ${originals.length} original items to check.\n`);

    let mimeFixed = 0;
    let dimsFixed = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of originals) {
        const filePath = path.join(MEDIA_DIR, item.filename);
        const ext = path.extname(item.filename).toLowerCase();

        if (!existsSync(filePath)) {
            console.log(`  [SKIP] Not on disk: ${item.filename}`);
            skipped++;
            continue;
        }

        const updates = {};

        // Fix mime_type for .webp files still marked as non-webp
        if (ext === '.webp' && item.mime_type !== 'image/webp') {
            updates.mime_type = 'image/webp';
            console.log(`  [MIME] ${item.filename}: ${item.mime_type} → image/webp`);
            mimeFixed++;
        }

        // Populate width/height if missing
        if (!item.width || !item.height) {
            try {
                const meta = await sharp(filePath).metadata();
                if (meta.width && meta.height) {
                    updates.width = meta.width;
                    updates.height = meta.height;
                    console.log(`  [DIMS] ${item.filename}: ${meta.width}×${meta.height}`);
                    dimsFixed++;
                }
            } catch (err) {
                console.error(`  [FAIL] Could not read dimensions for ${item.filename}:`, err.message);
                failed++;
                continue;
            }
        }

        if (Object.keys(updates).length === 0) continue;

        if (!DRY_RUN) {
            const { error: updateErr } = await supabase
                .from('media_items')
                .update(updates)
                .eq('id', item.id);

            if (updateErr) {
                console.error(`  [FAIL] DB update for ${item.filename}:`, updateErr.message);
                failed++;
            }
        }
    }

    console.log(`\nMime type fixes: ${mimeFixed} | Dimension fixes: ${dimsFixed} | Skipped: ${skipped} | Failed: ${failed}`);
}

run();
