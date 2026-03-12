'use strict';

/**
 * upload-site-images-to-r2.js
 *
 * Uploads all files from /public/images/site/ to Cloudflare R2 under media/site/
 * and updates media_items DB rows to use R2 public URLs.
 *
 * Usage:
 *   node scripts/upload-site-images-to-r2.js           # live
 *   node scripts/upload-site-images-to-r2.js --dry-run # preview only
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SITE_DIR = path.join(process.cwd(), 'public', 'images', 'site');
const R2_PREFIX = 'media/site';

const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_URL) {
    console.error('Missing R2 env vars. Check .env.local');
    process.exit(1);
}

const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
    };
    return map[ext] || 'application/octet-stream';
}

function toR2Key(filename) {
    return `${R2_PREFIX}/${filename}`;
}

function toPublicUrl(filename) {
    return `${R2_PUBLIC_URL}/${R2_PREFIX}/${filename}`;
}

function variantFilename(stem, suffix) {
    return `${stem}${suffix}`;
}

const VARIANT_SUFFIXES = [
    { suffix: '-500x500.webp', col: 'url_large' },
    { suffix: '-200x200.webp', col: 'url_medium' },
    { suffix: '-100x100.webp', col: 'url_thumb' },
];

function isVariant(filename) {
    return VARIANT_SUFFIXES.some(v => filename.endsWith(v.suffix));
}

async function fileExistsInR2(key) {
    try {
        await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
        return true;
    } catch {
        return false;
    }
}

async function uploadFile(filename) {
    const key = toR2Key(filename);
    const filePath = path.join(SITE_DIR, filename);

    if (await fileExistsInR2(key)) {
        return 'skipped';
    }

    const body = fs.readFileSync(filePath);
    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: getMimeType(filename),
        CacheControl: 'public, max-age=31536000, immutable',
    }));
    return 'uploaded';
}

async function run() {
    console.log(DRY_RUN ? '[DRY RUN]\n' : '[LIVE]\n');

    const allFiles = fs.readdirSync(SITE_DIR).filter(f =>
        !fs.statSync(path.join(SITE_DIR, f)).isDirectory()
    );

    // Originals only (skip variant files)
    const originals = allFiles.filter(f => !isVariant(f));
    const variants = allFiles.filter(f => isVariant(f));

    console.log(`Originals: ${originals.length}  Variants: ${variants.length}  Total: ${allFiles.length}\n`);

    let uploaded = 0, skipped = 0, errors = 0, dbUpdated = 0;

    for (const filename of allFiles) {
        const key = toR2Key(filename);
        const r2Url = toPublicUrl(filename);
        const filePath = path.join(SITE_DIR, filename);

        if (!fs.existsSync(filePath)) {
            console.log(`  [SKIP] File not found: ${filename}`);
            continue;
        }

        if (DRY_RUN) {
            console.log(`  [DRY] Would upload: ${filename} → ${key}`);
            continue;
        }

        try {
            const result = await uploadFile(filename);
            if (result === 'uploaded') {
                uploaded++;
                console.log(`  [OK] Uploaded: ${filename}`);
            } else {
                skipped++;
                console.log(`  [SKIP] Already in R2: ${filename}`);
            }
        } catch (err) {
            errors++;
            console.error(`  [ERR] ${filename}: ${err.message}`);
        }
    }

    if (DRY_RUN) {
        console.log('\nDry run complete — no changes made.');
        return;
    }

    // Update media_items DB rows for originals
    console.log('\n--- Updating media_items ---\n');

    for (const filename of originals) {
        const stem = path.basename(filename, path.extname(filename));
        const ext = path.extname(filename).toLowerCase();
        const r2Url = toPublicUrl(filename);

        // Build variant URL map
        const variantUpdates = {};
        if (ext !== '.svg') {
            for (const v of VARIANT_SUFFIXES) {
                const vFile = variantFilename(stem, v.suffix);
                if (fs.existsSync(path.join(SITE_DIR, vFile))) {
                    variantUpdates[v.col] = toPublicUrl(vFile);
                }
            }
        }

        const { data: rows } = await supabase
            .from('media_items')
            .select('id, filename, url')
            .or(`url.eq./images/site/${filename},url.eq.${r2Url}`)
            .limit(1);

        if (!rows || rows.length === 0) {
            console.log(`  [WARN] No DB row for ${filename} — skipping`);
            continue;
        }

        const row = rows[0];
        const updates = {
            url: r2Url,
            storage_path: r2Url,
            ...variantUpdates,
        };

        const { error } = await supabase.from('media_items').update(updates).eq('id', row.id);
        if (error) {
            console.log(`  [ERR] DB update ${filename}: ${error.message}`);
        } else {
            dbUpdated++;
            console.log(`  [OK] DB updated: ${filename} → R2`);
        }
    }

    console.log(`\nDone.`);
    console.log(`  Uploaded: ${uploaded}  Skipped: ${skipped}  Errors: ${errors}  DB updated: ${dbUpdated}`);
    console.log(`\nFiles served at: ${R2_PUBLIC_URL}/${R2_PREFIX}/<filename>`);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
