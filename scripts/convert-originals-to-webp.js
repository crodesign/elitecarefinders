/**
 * convert-originals-to-webp.js
 *
 * For every original image in /images/media/ (non-variant, non-webp):
 *   1. Resize to fit within 1940x1940 if oversized (proportional, no crop)
 *   2. Convert to WebP (quality 90)
 *   3. Save as same-stem.webp, delete old file
 *   4. Update media_items: filename, url, storage_path
 *   5. Update homes/facilities/posts images[] arrays with new URLs
 *
 * Usage:
 *   node scripts/convert-originals-to-webp.js           # live
 *   node scripts/convert-originals-to-webp.js --dry-run # preview only
 */

require('dotenv').config({ path: '.env.local' });
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');
const MEDIA_DIR = path.join(process.cwd(), 'public', 'images', 'media');
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.avif', '.tiff', '.bmp'];

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log(DRY_RUN ? '[DRY RUN] No changes will be made.\n' : '[LIVE] Converting originals to WebP...\n');

    // Fetch all original media items (not already webp, in /images/media/)
    const { data: items, error } = await supabase
        .from('media_items')
        .select('id, filename, url, storage_path')
        .like('url', '/images/media/%')
        .not('url', 'like', '%.webp')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch media_items:', error.message);
        process.exit(1);
    }

    console.log(`Found ${items.length} original images to convert.\n`);

    const urlMap = {}; // old url -> new url (for entity updates)
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of items) {
        const filename = item.filename;
        const ext = path.extname(filename).toLowerCase();

        // Only process known image extensions
        if (!IMAGE_EXTS.includes(ext)) {
            console.log(`  [SKIP] Not a convertible image: ${filename}`);
            skipped++;
            continue;
        }

        const filePath = path.join(MEDIA_DIR, filename);

        if (!fs.existsSync(filePath)) {
            console.log(`  [SKIP] File not on disk: ${filename}`);
            skipped++;
            continue;
        }

        const stem = path.basename(filename, ext);
        const newFilename = stem + '.webp';
        const newFilePath = path.join(MEDIA_DIR, newFilename);
        const newUrl = '/images/media/' + newFilename;

        try {
            if (DRY_RUN) {
                const meta = await sharp(filePath).metadata();
                const oversized = (meta.width > 1940 || meta.height > 1940);
                console.log(`  [DRY] ${filename} (${meta.width}x${meta.height}${oversized ? ' -> resize' : ''}) -> ${newFilename}`);
            } else {
                const img = sharp(filePath);
                const meta = await img.metadata();
                const needsResize = (meta.width ?? 0) > 1940 || (meta.height ?? 0) > 1940;
                const base = needsResize
                    ? img.resize(1940, 1940, { fit: 'inside', withoutEnlargement: true })
                    : img;

                await base.webp({ quality: 90 }).toFile(newFilePath);

                // Delete original
                fs.unlinkSync(filePath);

                // Update media_items record
                const { error: updateErr } = await supabase
                    .from('media_items')
                    .update({
                        filename: newFilename,
                        url: newUrl,
                        storage_path: newUrl,
                    })
                    .eq('id', item.id);

                if (updateErr) {
                    console.error(`  [FAIL] DB update for ${filename}:`, updateErr.message);
                    failed++;
                    continue;
                }

                console.log(`  [OK] ${filename} -> ${newFilename}`);
            }

            urlMap[item.url] = newUrl;
            success++;
        } catch (err) {
            console.error(`  [FAIL] ${filename}:`, err.message);
            failed++;
        }
    }

    if (DRY_RUN) {
        console.log(`\n[DRY RUN] Would convert: ${success} | Would skip: ${skipped} | Would fail: ${failed}`);
        return;
    }

    console.log(`\nConverted: ${success} | Skipped: ${skipped} | Failed: ${failed}`);

    if (Object.keys(urlMap).length === 0) {
        console.log('No URL mappings to apply to entities.');
        return;
    }

    // ── Update entity image arrays ──
    console.log('\nUpdating entity image references...');
    await updateEntityImages('homes', 'images', urlMap);
    await updateEntityImages('facilities', 'images', urlMap);
    await updateEntityImages('homes', 'team_images', urlMap);
    await updateEntityImages('facilities', 'team_images', urlMap);
    await updateEntityImages('posts', 'images', urlMap);
    console.log('Entity updates complete.');
}

async function updateEntityImages(table, column, urlMap) {
    const { data: rows, error } = await supabase
        .from(table)
        .select('id, ' + column)
        .not(column, 'is', null);

    if (error) {
        console.error(`  [WARN] Could not fetch ${table}.${column}:`, error.message);
        return;
    }

    let updated = 0;
    for (const row of rows || []) {
        const oldUrls = row[column];
        if (!Array.isArray(oldUrls) || oldUrls.length === 0) continue;

        const newUrls = oldUrls.map(function(u) { return urlMap[u] || u; });
        const changed = newUrls.some(function(u, i) { return u !== oldUrls[i]; });

        if (!changed) continue;

        const patch = {};
        patch[column] = newUrls;
        const { error: updateErr } = await supabase
            .from(table)
            .update(patch)
            .eq('id', row.id);

        if (updateErr) {
            console.error(`  [WARN] ${table}[${row.id}].${column} update failed:`, updateErr.message);
        } else {
            updated++;
        }
    }

    if (updated > 0) {
        console.log(`  Updated ${updated} ${table} records (${column})`);
    }
}

run();
