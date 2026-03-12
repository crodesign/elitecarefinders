/**
 * convert-site-images.js
 *
 * For every JPG/PNG in /public/images/site/:
 *   1. Convert to WebP (max 1940px proportional, quality 90)
 *   2. Generate -500x500.webp, -200x200.webp, -100x100.webp variants
 *   3. Update media_items DB row: filename, url, file_size, url_large, url_medium, url_thumb
 *   4. Delete the original non-WebP file from disk
 *
 * Also processes existing .webp files in the folder (generates missing variants only).
 *
 * Usage:
 *   node scripts/convert-site-images.js           # live
 *   node scripts/convert-site-images.js --dry-run # preview only
 */

require('dotenv').config({ path: '.env.local' });
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');
const SITE_DIR = path.join(process.cwd(), 'public', 'images', 'site');
const MAX_PX = 1940;
const BASE_QUALITY = 90;
const VARIANT_QUALITY = 85;

const VARIANTS = [
    { suffix: '-500x500.webp', col: 'url_large',  w: 500, h: 500 },
    { suffix: '-200x200.webp', col: 'url_medium', w: 200, h: 200 },
    { suffix: '-100x100.webp', col: 'url_thumb',  w: 100, h: 100 },
];

const CONVERT_EXTS = ['.jpg', '.jpeg', '.png'];

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function isVariant(filename) {
    return VARIANTS.some(v => filename.endsWith(v.suffix));
}

async function run() {
    console.log(DRY_RUN ? '[DRY RUN] No changes will be made.\n' : '[LIVE] Processing site images...\n');

    const allFiles = fs.readdirSync(SITE_DIR);

    // Build list: originals to convert (jpg/png), plus existing webp originals needing variants
    const toProcess = [];

    for (const file of allFiles) {
        if (isVariant(file)) continue; // skip already-generated variants

        const ext = path.extname(file).toLowerCase();
        if (CONVERT_EXTS.includes(ext)) {
            toProcess.push({ file, needsConvert: true });
        } else if (ext === '.webp') {
            toProcess.push({ file, needsConvert: false });
        }
    }

    console.log(`Found ${toProcess.length} originals to process.\n`);

    for (const { file, needsConvert } of toProcess) {
        const srcPath = path.join(SITE_DIR, file);
        const stem = path.basename(file, path.extname(file));
        const webpFile = stem + '.webp';
        const webpPath = path.join(SITE_DIR, webpFile);
        const webpUrl = `/images/site/${webpFile}`;

        console.log(`\n→ ${file}${needsConvert ? ` → ${webpFile}` : ' (already WebP)'}`);

        // ── Step 1: Convert to base WebP ─────────────────────────────────────
        if (needsConvert) {
            if (!DRY_RUN) {
                const meta = await sharp(srcPath).metadata();
                let pipeline = sharp(srcPath);
                if ((meta.width || 0) > MAX_PX || (meta.height || 0) > MAX_PX) {
                    pipeline = pipeline.resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true });
                }
                await pipeline.webp({ quality: BASE_QUALITY }).toFile(webpPath);
                console.log(`  [OK] Base WebP written: ${webpFile} (${fs.statSync(webpPath).size} bytes)`);
            } else {
                console.log(`  [DRY] Would write base WebP: ${webpFile}`);
            }
        }

        // ── Step 2: Generate variants ─────────────────────────────────────────
        const dbVariantUpdate = {};
        for (const v of VARIANTS) {
            const variantFile = stem + v.suffix;
            const variantPath = path.join(SITE_DIR, variantFile);
            const variantUrl = `/images/site/${variantFile}`;

            if (fs.existsSync(variantPath)) {
                console.log(`  [SKIP] Variant exists: ${variantFile}`);
                dbVariantUpdate[v.col] = variantUrl;
                continue;
            }

            if (!DRY_RUN) {
                await sharp(webpPath)
                    .resize(v.w, v.h, { fit: 'cover', position: 'attention' })
                    .webp({ quality: VARIANT_QUALITY })
                    .toFile(variantPath);
                console.log(`  [OK] Variant: ${variantFile}`);
            } else {
                console.log(`  [DRY] Would write variant: ${variantFile}`);
            }
            dbVariantUpdate[v.col] = variantUrl;
        }

        // ── Step 3: Update media_items ────────────────────────────────────────
        // Try to find by original filename first, then by webp filename
        const { data: rows } = await supabase
            .from('media_items')
            .select('id, filename, url')
            .or(`url.eq./images/site/${file},url.eq.${webpUrl}`)
            .limit(1);

        if (!rows || rows.length === 0) {
            console.log(`  [WARN] No media_items row found for ${file} — skipping DB update`);
        } else {
            const row = rows[0];
            const newFileSize = !DRY_RUN && fs.existsSync(webpPath) ? fs.statSync(webpPath).size : null;

            const updates = {
                filename: webpFile,
                url: webpUrl,
                storage_path: webpUrl,
                ...dbVariantUpdate,
                ...(newFileSize !== null ? { file_size: newFileSize } : {}),
            };

            if (!DRY_RUN) {
                const { error } = await supabase.from('media_items').update(updates).eq('id', row.id);
                if (error) {
                    console.log(`  [ERROR] DB update failed: ${error.message}`);
                } else {
                    console.log(`  [OK] DB updated: ${row.filename} → ${webpFile}`);
                }
            } else {
                console.log(`  [DRY] Would update DB row ${row.id}: filename=${webpFile}`);
            }
        }

        // ── Step 4: Delete original non-WebP file ────────────────────────────
        if (needsConvert) {
            if (!DRY_RUN) {
                fs.unlinkSync(srcPath);
                console.log(`  [OK] Deleted original: ${file}`);
            } else {
                console.log(`  [DRY] Would delete original: ${file}`);
            }
        }
    }

    console.log('\nDone.');
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
