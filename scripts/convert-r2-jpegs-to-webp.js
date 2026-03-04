'use strict';
/**
 * Converts JPEG/JPG media_items on R2 to WebP:
 *   1. Fetch original JPEG from R2
 *   2. Convert to WebP (max 1940px, quality 90)
 *   3. Generate 3 crop variants (500x500, 200x200, 100x100)
 *   4. Upload all 4 WebP files to R2
 *   5. Update DB record (filename, url, mime_type, width, height, url_large, url_medium, url_thumb)
 *   6. Delete old JPEG from R2
 *
 * Usage:
 *   node scripts/convert-r2-jpegs-to-webp.js           # live
 *   node scripts/convert-r2-jpegs-to-webp.js --dry-run # preview
 */

require('dotenv').config({ path: '.env.local' });
const sharp = require('sharp');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const R2_ACCOUNT_ID  = process.env.R2_ACCOUNT_ID?.trim();
const R2_BUCKET      = process.env.R2_BUCKET_NAME?.trim();
const R2_PUBLIC_URL  = process.env.R2_PUBLIC_URL?.trim();
const R2_PREFIX      = 'media';

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
    },
});

const VARIANTS = [
    { suffix: '-500x500.webp', col: 'url_large',  w: 500, h: 500 },
    { suffix: '-200x200.webp', col: 'url_medium', w: 200, h: 200 },
    { suffix: '-100x100.webp', col: 'url_thumb',  w: 100, h: 100 },
];

async function fetchBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return Buffer.from(await res.arrayBuffer());
}

async function r2Upload(filename, buffer, contentType) {
    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `${R2_PREFIX}/${filename}`,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
    }));
}

async function r2Delete(filename) {
    await r2.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: `${R2_PREFIX}/${filename}`,
    }));
}

async function main() {
    console.log(`\nConvert R2 JPEGs to WebP${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

    // Find all R2 media_items with jpeg/jpg URLs (excluding variants)
    let page = 0;
    const PAGE = 200;
    let allItems = [];

    while (true) {
        const { data: jpeg, error: e1 } = await supabase
            .from('media_items')
            .select('id, filename, mime_type, url, width, height')
            .like('url', '%r2.dev%')
            .like('url', '%.jpeg')
            .range(page * PAGE, (page + 1) * PAGE - 1);
        if (e1) { console.error('Query error:', e1.message); process.exit(1); }

        const { data: jpg, error: e2 } = await supabase
            .from('media_items')
            .select('id, filename, mime_type, url, width, height')
            .like('url', '%r2.dev%')
            .like('url', '%.jpg')
            .not('url', 'like', '%.jpeg') // avoid double-counting
            .range(page * PAGE, (page + 1) * PAGE - 1);
        if (e2) { console.error('Query error:', e2.message); process.exit(1); }

        const batch = [...(jpeg || []), ...(jpg || [])];
        if (batch.length === 0) break;
        allItems.push(...batch);
        if ((jpeg?.length ?? 0) < PAGE && (jpg?.length ?? 0) < PAGE) break;
        page++;
    }

    // Dedupe by id
    allItems = [...new Map(allItems.map(i => [i.id, i])).values()];

    console.log(`Found ${allItems.length} JPEG item(s) to convert.\n`);

    let converted = 0, failed = 0;

    for (const item of allItems) {
        const stem = path.basename(item.filename, path.extname(item.filename));
        const newFilename = `${stem}.webp`;
        const newUrl = `${R2_PUBLIC_URL}/${R2_PREFIX}/${newFilename}`;

        try {
            const buf = await fetchBuffer(item.url);

            // Original: convert to WebP, max 1940px
            const origProcessor = sharp(buf).resize(1940, 1940, { fit: 'inside', withoutEnlargement: true });
            const { data: origBuf, info: origInfo } = await origProcessor
                .webp({ quality: 90 })
                .toBuffer({ resolveWithObject: true });

            // Variants
            const variantBufs = await Promise.all(
                VARIANTS.map(v =>
                    sharp(buf)
                        .resize(v.w, v.h, { fit: 'cover', position: 'centre' })
                        .webp({ quality: 85 })
                        .toBuffer()
                )
            );

            console.log(`  ${item.filename} → ${newFilename} (${origInfo.width}×${origInfo.height})`);

            if (!DRY_RUN) {
                // Upload original WebP
                await r2Upload(newFilename, origBuf, 'image/webp');

                // Upload variants
                for (let i = 0; i < VARIANTS.length; i++) {
                    await r2Upload(`${stem}${VARIANTS[i].suffix}`, variantBufs[i], 'image/webp');
                }

                // Build variant URL map
                const variantUpdates = {};
                for (const v of VARIANTS) {
                    variantUpdates[v.col] = `${R2_PUBLIC_URL}/${R2_PREFIX}/${stem}${v.suffix}`;
                }

                // Update DB
                const { error: upErr } = await supabase
                    .from('media_items')
                    .update({
                        filename: newFilename,
                        url: newUrl,
                        mime_type: 'image/webp',
                        width: origInfo.width,
                        height: origInfo.height,
                        ...variantUpdates,
                    })
                    .eq('id', item.id);

                if (upErr) {
                    console.error(`    DB error: ${upErr.message}`);
                    failed++;
                    continue;
                }

                // Delete old JPEG from R2
                await r2Delete(item.filename);
            }

            converted++;
        } catch (err) {
            console.error(`  FAILED ${item.filename}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\nDone. Converted: ${converted}  Failed: ${failed}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
