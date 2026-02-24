/**
 * Migration Script: Flat Storage
 * 
 * Moves all images from nested folder hierarchy to a single flat directory
 * (public/images/media/) and updates all DB references:
 * - media_items.url, .storage_path, .filename
 * - homes.images[], homes.team_images[]
 * - facilities.images[], facilities.team_images[]
 * - posts.images[], posts.metadata->instructions[].image
 * 
 * Usage: node scripts/migrate-to-flat-storage.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERROR: SUPABASE_URL or SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');
const MEDIA_ROOT = path.join(__dirname, '..', 'public', 'images', 'media');

async function main() {
    console.log('='.repeat(60));
    console.log(DRY_RUN ? '🔍 DRY RUN MODE — no changes will be made' : '🚀 LIVE MODE — changes will be applied');
    console.log('='.repeat(60));
    console.log(`Media root: ${MEDIA_ROOT}\n`);

    // ── Step 1: Get all media_items ──
    console.log('── Step 1: Scanning media_items ──');
    const { data: mediaItems, error: fetchErr } = await supabase
        .from('media_items')
        .select('id, filename, url, storage_path, folder_id')
        .order('filename');

    if (fetchErr) {
        console.error('Failed to fetch media_items:', fetchErr.message);
        process.exit(1);
    }
    console.log(`Found ${mediaItems.length} media items\n`);

    // ── Step 2: Build URL mapping (old → new) ──
    console.log('── Step 2: Building URL mappings ──');
    const urlMap = {}; // old URL → new URL
    const fileMoves = []; // { oldPath, newPath, itemId, newUrl, newStoragePath, newFilename }
    const usedFilenames = new Set();

    for (const item of mediaItems) {
        let filename = item.filename;
        const oldUrl = item.url;

        // Handle collision: ensure unique filename in flat dir
        if (usedFilenames.has(filename)) {
            const ext = path.extname(filename);
            const base = path.basename(filename, ext);
            filename = `${base}-${item.id.slice(0, 6)}${ext}`;
            console.warn(`  ⚠️  Collision resolved: ${item.filename} → ${filename}`);
        }
        usedFilenames.add(filename);

        const newUrl = `/images/media/${filename}`;
        const newStoragePath = `/images/media/${filename}`;
        urlMap[oldUrl] = newUrl;

        // Only move if URL actually changes
        if (oldUrl !== newUrl) {
            const oldPhysicalPath = path.join(__dirname, '..', 'public', oldUrl);
            const newPhysicalPath = path.join(MEDIA_ROOT, filename);
            fileMoves.push({
                oldPath: oldPhysicalPath,
                newPath: newPhysicalPath,
                itemId: item.id,
                newUrl,
                newStoragePath,
                newFilename: filename
            });
        }
    }

    console.log(`  ${Object.keys(urlMap).length} URL mappings built`);
    console.log(`  ${fileMoves.length} files need moving\n`);

    // ── Step 3: Move physical files ──
    console.log('── Step 3: Moving physical files ──');
    let moved = 0, missing = 0, alreadyFlat = 0;

    for (const move of fileMoves) {
        if (fs.existsSync(move.oldPath)) {
            console.log(`  📦 ${path.basename(move.oldPath)} → ${path.basename(move.newPath)}`);
            if (!DRY_RUN) {
                // Copy first (safe), then delete old in cleanup step
                fs.copyFileSync(move.oldPath, move.newPath);
                moved++;
            }
        } else if (fs.existsSync(move.newPath)) {
            console.log(`  ✅ ${path.basename(move.newPath)} already in flat dir`);
            alreadyFlat++;
        } else {
            console.warn(`  ⚠️  Missing on disk: ${move.oldPath}`);
            missing++;
        }
    }
    console.log(`  ${DRY_RUN ? 'Would move' : 'Moved'}: ${moved}, Already flat: ${alreadyFlat}, Missing: ${missing}\n`);

    // ── Step 4: Update media_items in DB ──
    console.log('── Step 4: Updating media_items ──');
    let dbUpdates = 0;
    if (!DRY_RUN) {
        for (const move of fileMoves) {
            const { error } = await supabase
                .from('media_items')
                .update({
                    url: move.newUrl,
                    storage_path: move.newStoragePath,
                    filename: move.newFilename
                })
                .eq('id', move.itemId);

            if (error) {
                console.error(`  ❌ Failed to update ${move.itemId}:`, error.message);
            } else {
                dbUpdates++;
            }
        }
    }
    console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${fileMoves.length} media_items\n`);

    // ── Step 5: Update entity images[] arrays ──
    console.log('── Step 5: Updating entity image references ──');
    const tables = [
        { table: 'homes', imageFields: ['images', 'team_images'] },
        { table: 'facilities', imageFields: ['images', 'team_images'] },
        { table: 'posts', imageFields: ['images'] },
    ];

    let entityUpdates = 0;
    for (const { table, imageFields } of tables) {
        for (const field of imageFields) {
            const { data: rows, error: qErr } = await supabase
                .from(table)
                .select(`id, ${field}`)
                .not(field, 'is', null);

            if (qErr) {
                console.error(`  Failed to query ${table}.${field}:`, qErr.message);
                continue;
            }

            for (const row of rows || []) {
                const oldImages = row[field];
                if (!Array.isArray(oldImages) || oldImages.length === 0) continue;

                const newImages = oldImages.map(url => urlMap[url] || url);
                const changed = oldImages.some((url, i) => url !== newImages[i]);

                if (changed) {
                    console.log(`  📝 ${table}.${field} [${row.id.slice(0, 8)}…]: ${oldImages.length} URLs`);
                    if (!DRY_RUN) {
                        const { error: uErr } = await supabase
                            .from(table)
                            .update({ [field]: newImages })
                            .eq('id', row.id);
                        if (uErr) console.error(`    ❌ Update failed:`, uErr.message);
                    }
                    entityUpdates++;
                }
            }
        }
    }

    // Handle recipe step images in posts.metadata
    const { data: allPosts } = await supabase
        .from('posts')
        .select('id, metadata')
        .not('metadata', 'is', null);

    for (const post of allPosts || []) {
        let metadata = post.metadata;
        if (!metadata || typeof metadata !== 'object') continue;

        let changed = false;
        if (metadata.instructions && Array.isArray(metadata.instructions)) {
            for (const step of metadata.instructions) {
                if (step.image && urlMap[step.image]) {
                    console.log(`  📝 posts.metadata.instructions [${post.id.slice(0, 8)}…]: recipe step image`);
                    step.image = urlMap[step.image];
                    changed = true;
                }
            }
        }

        if (changed && !DRY_RUN) {
            const { error: uErr } = await supabase
                .from('posts')
                .update({ metadata })
                .eq('id', post.id);
            if (uErr) console.error(`    ❌ Metadata update failed:`, uErr.message);
            entityUpdates++;
        }
    }

    console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'}: ${entityUpdates} entity records\n`);

    // ── Step 6: Clean up old files and empty directories ──
    console.log('── Step 6: Cleaning up ──');
    if (!DRY_RUN) {
        // Delete old files
        let deleted = 0;
        for (const move of fileMoves) {
            if (fs.existsSync(move.oldPath)) {
                fs.unlinkSync(move.oldPath);
                deleted++;
            }
        }
        console.log(`  🗑️  Deleted ${deleted} old files`);

        // Remove empty nested directories (but not the media root)
        const removeEmptyDirs = (dir) => {
            if (!fs.existsSync(dir)) return;
            for (const entry of fs.readdirSync(dir)) {
                const full = path.join(dir, entry);
                if (fs.statSync(full).isDirectory()) {
                    removeEmptyDirs(full);
                }
            }
            if (fs.readdirSync(dir).length === 0) {
                fs.rmdirSync(dir);
                console.log(`  🗂️  Removed empty: ${path.relative(MEDIA_ROOT, dir)}`);
            }
        };
        for (const entry of fs.readdirSync(MEDIA_ROOT)) {
            const full = path.join(MEDIA_ROOT, entry);
            if (fs.statSync(full).isDirectory()) {
                removeEmptyDirs(full);
            }
        }
    } else {
        console.log(`  Would delete ${fileMoves.length} old files and clean empty directories`);
    }

    console.log();
    console.log('='.repeat(60));
    console.log(DRY_RUN ? '✅ DRY RUN COMPLETE — no changes made' : '✅ MIGRATION COMPLETE');
    console.log(`  Files: ${fileMoves.length} moved, ${entityUpdates} entity records updated`);
    console.log('='.repeat(60));
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
