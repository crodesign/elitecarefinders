'use strict';

/**
 * Bulk uploads public/images/media/ to Cloudflare R2.
 * Usage: node scripts/upload-to-r2.js
 * Flags: --dry-run   list files without uploading
 *        --concurrency N  parallel uploads (default 20)
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const concurrencyArg = process.argv.find(a => a.startsWith('--concurrency'));
const CONCURRENCY = concurrencyArg
    ? parseInt(concurrencyArg.split('=')[1] || process.argv[process.argv.indexOf(concurrencyArg) + 1], 10)
    : 20;

const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
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

const MEDIA_DIR = path.join(process.cwd(), 'public', 'images', 'media');

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const map = {
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.pdf': 'application/pdf',
    };
    return map[ext] || 'application/octet-stream';
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
    const key = `media/${filename}`;
    const filePath = path.join(MEDIA_DIR, filename);

    if (await fileExistsInR2(key)) {
        return { status: 'skipped', filename };
    }

    const body = fs.readFileSync(filePath);
    await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: getMimeType(filename),
        CacheControl: 'public, max-age=31536000, immutable',
    }));
    return { status: 'uploaded', filename };
}

async function runWithConcurrency(tasks, limit) {
    const results = [];
    let idx = 0;

    async function worker() {
        while (idx < tasks.length) {
            const i = idx++;
            results[i] = await tasks[i]();
        }
    }

    const workers = Array.from({ length: limit }, worker);
    await Promise.all(workers);
    return results;
}

async function main() {
    console.log(`\nR2 Bulk Upload${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log(`Bucket: ${R2_BUCKET_NAME}`);
    console.log(`Public URL: ${R2_PUBLIC_URL}`);
    console.log(`Concurrency: ${CONCURRENCY}\n`);

    const files = fs.readdirSync(MEDIA_DIR).filter(f => !fs.statSync(path.join(MEDIA_DIR, f)).isDirectory());
    const totalSize = files.reduce((sum, f) => sum + fs.statSync(path.join(MEDIA_DIR, f)).size, 0);
    console.log(`Files: ${files.length}  Total size: ${(totalSize / 1024 / 1024).toFixed(1)} MB\n`);

    if (DRY_RUN) {
        files.slice(0, 10).forEach(f => console.log(`  ${f}`));
        if (files.length > 10) console.log(`  ... and ${files.length - 10} more`);
        return;
    }

    let uploaded = 0, skipped = 0, errors = 0;
    const startTime = Date.now();

    const tasks = files.map((filename, i) => async () => {
        try {
            const result = await uploadFile(filename);
            if (result.status === 'uploaded') {
                uploaded++;
                if (uploaded % 50 === 0 || uploaded <= 5) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                    const rate = (uploaded / ((Date.now() - startTime) / 1000)).toFixed(1);
                    console.log(`  [${i + 1}/${files.length}] ✓ ${filename} | ${uploaded} uploaded, ${skipped} skipped | ${rate} files/s | ${elapsed}s elapsed`);
                }
            } else {
                skipped++;
                if (skipped <= 3 || skipped % 200 === 0) {
                    console.log(`  [${i + 1}/${files.length}] → already exists: ${filename}`);
                }
            }
        } catch (err) {
            errors++;
            console.error(`  [${i + 1}/${files.length}] ✗ ${filename}: ${err.message}`);
        }
    });

    await runWithConcurrency(tasks, CONCURRENCY);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Done in ${elapsed}s`);
    console.log(`  Uploaded: ${uploaded}  Skipped: ${skipped}  Errors: ${errors}`);
    if (uploaded > 0) {
        console.log(`\nFiles served at: ${R2_PUBLIC_URL}/media/<filename>`);
        console.log(`\nNEXT: node scripts/update-media-urls.js`);
    }
    console.log('='.repeat(50));
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
