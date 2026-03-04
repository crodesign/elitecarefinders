'use strict';
/**
 * Fetches R2 images that have width > 1940 (already WebP but not resized),
 * resizes them to max 1940px, regenerates variants, re-uploads, and updates DB.
 *
 * Usage:
 *   node scripts/resize-r2-oversized.js           # live
 *   node scripts/resize-r2-oversized.js --dry-run # preview
 */

require('dotenv').config({ path: '.env.local' });
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID?.trim();
const R2_BUCKET     = process.env.R2_BUCKET_NAME?.trim();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim();
const R2_PREFIX     = 'media';

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

async function main() {
    console.log(`\nResize oversized R2 images${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

    // Find R2 webp originals where width > 1940
    let page = 0;
    const PAGE = 200;
    let allItems = [];

    while (true) {
        const { data, error } = await supabase
            .from('media_items')
            .select('id, filename, url, width, height, mime_type')
            .like('url', '%r2.dev%')
            .like('url', '%.webp')
            .not('url', 'like', '%-500x500.webp')
            .not('url', 'like', '%-200x200.webp')
            .not('url', 'like', '%-100x100.webp')
            .gt('width', 1940)
            .range(page * PAGE, (page + 1) * PAGE - 1);

        if (error) { console.error('Query error:', error.message); process.exit(1); }
        if (!data || data.length === 0) break;
        allItems.push(...data);
        if (data.length < PAGE) break;
        page++;
    }

    // Also catch images where height > 1940
    page = 0;
    while (true) {
        const { data, error } = await supabase
            .from('media_items')
            .select('id, filename, url, width, height, mime_type')
            .like('url', '%r2.dev%')
            .like('url', '%.webp')
            .not('url', 'like', '%-500x500.webp')
            .not('url', 'like', '%-200x200.webp')
            .not('url', 'like', '%-100x100.webp')
            .gt('height', 1940)
            .range(page * PAGE, (page + 1) * PAGE - 1);

        if (error) { console.error('Query error:', error.message); process.exit(1); }
        if (!data || data.length === 0) break;
        allItems.push(...data);
        if (data.length < PAGE) break;
        page++;
    }

    // Dedupe by id
    allItems = [...new Map(allItems.map(i => [i.id, i])).values()];

    console.log(`Found ${allItems.length} oversized image(s).\n`);

    let fixed = 0, failed = 0;

    for (const item of allItems) {
        const stem = path.basename(item.filename, '.webp');
        try {
            const buf = await fetchBuffer(item.url);

            const { data: origBuf, info: origInfo } = await sharp(buf)
                .resize(1940, 1940, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 90 })
                .toBuffer({ resolveWithObject: true });

            const variantBufs = await Promise.all(
                VARIANTS.map(v =>
                    sharp(buf)
                        .resize(v.w, v.h, { fit: 'cover', position: 'centre' })
                        .webp({ quality: 85 })
                        .toBuffer()
                )
            );

            console.log(`  ${item.filename}: ${item.width}×${item.height} → ${origInfo.width}×${origInfo.height}`);

            if (!DRY_RUN) {
                await r2Upload(item.filename, origBuf, 'image/webp');

                for (let i = 0; i < VARIANTS.length; i++) {
                    await r2Upload(`${stem}${VARIANTS[i].suffix}`, variantBufs[i], 'image/webp');
                }

                const variantUpdates = {};
                for (const v of VARIANTS) {
                    variantUpdates[v.col] = `${R2_PUBLIC_URL}/${R2_PREFIX}/${stem}${v.suffix}`;
                }

                const { error: upErr } = await supabase
                    .from('media_items')
                    .update({
                        width: origInfo.width,
                        height: origInfo.height,
                        mime_type: 'image/webp',
                        ...variantUpdates,
                    })
                    .eq('id', item.id);

                if (upErr) { console.error(`    DB error: ${upErr.message}`); failed++; continue; }
            }

            fixed++;
        } catch (err) {
            console.error(`  FAILED ${item.filename}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\nDone. Fixed: ${fixed}  Failed: ${failed}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
