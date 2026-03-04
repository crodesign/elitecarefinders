'use strict';
/**
 * Updates homes.images, homes.team_images, facilities.images,
 * facilities.team_images, and posts.images arrays from local /images/media/
 * paths to R2 CDN URLs.
 *
 * Usage: node scripts/fix-entity-image-urls.js
 *        node scripts/fix-entity-image-urls.js --dry-run
 */

const { createClient } = require('@supabase/supabase-js');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

function toR2Url(localUrl) {
    if (!localUrl) return localUrl;
    if (localUrl.startsWith('/images/media/')) {
        return `${R2_PUBLIC_URL}/media/${localUrl.slice('/images/media/'.length)}`;
    }
    return localUrl;
}

function convertArray(arr) {
    if (!arr || !Array.isArray(arr)) return { converted: arr, changed: false };
    const converted = arr.map(toR2Url);
    const changed = converted.some((url, i) => url !== arr[i]);
    return { converted, changed };
}

async function r2Exists(filename) {
    try {
        await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `media/${filename}` }));
        return true;
    } catch { return false; }
}

async function processTable(table, cols) {
    let totalUpdated = 0, totalSkipped = 0, totalMissing = 0;
    const missingSamples = [];

    const selectCols = ['id', ...cols].join(', ');
    let offset = 0;
    const BATCH = 200;

    while (true) {
        const { data: rows, error } = await supabase
            .from(table)
            .select(selectCols)
            .range(offset, offset + BATCH - 1);

        if (error) { console.error(`Error fetching ${table}:`, error.message); break; }
        if (!rows || rows.length === 0) break;

        for (const row of rows) {
            const updates = {};
            let needsUpdate = false;

            for (const col of cols) {
                const { converted, changed } = convertArray(row[col]);
                if (changed) {
                    updates[col] = converted;
                    needsUpdate = true;
                }
            }

            if (!needsUpdate) { totalSkipped++; continue; }

            // Check a sample URL exists in R2
            const sampleUrl = Object.values(updates).find(arr => arr?.length > 0)?.[0];
            if (sampleUrl) {
                const filename = sampleUrl.split('/').pop();
                const exists = await r2Exists(filename);
                if (!exists) {
                    totalMissing++;
                    if (missingSamples.length < 5) missingSamples.push(filename);
                    // Still update the URL — file might exist with different variant
                }
            }

            if (!DRY_RUN) {
                const { error: updateErr } = await supabase
                    .from(table)
                    .update(updates)
                    .eq('id', row.id);
                if (updateErr) {
                    console.error(`  Error updating ${table} ${row.id}:`, updateErr.message);
                } else {
                    totalUpdated++;
                }
            } else {
                totalUpdated++;
            }
        }

        offset += BATCH;
        if (rows.length < BATCH) break;
    }

    console.log(`${table}: updated=${totalUpdated}, skipped=${totalSkipped}, r2-missing=${totalMissing}`);
    if (missingSamples.length > 0) {
        console.log(`  Missing in R2 samples:`, missingSamples);
    }
    return { totalUpdated, totalMissing };
}

async function main() {
    console.log(`\nEntity Image URL Fix${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log(`R2 base: ${R2_PUBLIC_URL}/media/\n`);

    await processTable('homes', ['images', 'team_images']);
    await processTable('facilities', ['images', 'team_images']);
    await processTable('posts', ['images']);

    console.log('\nDone.');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
