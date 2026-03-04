const { createClient } = require('@supabase/supabase-js');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

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

async function checkExists(filename) {
    try {
        await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `media/${filename}` }));
        return true;
    } catch {
        return false;
    }
}

async function main() {
    // Get 20 sample media items from DB
    const { data: items, error } = await supabase
        .from('media_items')
        .select('id, filename, url')
        .limit(20);

    if (error) { console.error(error); return; }

    console.log(`Checking ${items.length} sample items...\n`);

    let r2Count = 0, localCount = 0, missingCount = 0;

    for (const item of items) {
        const url = item.url || '';
        const isR2 = url.startsWith(R2_PUBLIC_URL);
        const isLocal = url.startsWith('/images/media/');

        if (isR2) {
            r2Count++;
            const exists = await checkExists(item.filename);
            if (!exists) {
                missingCount++;
                console.log(`MISSING in R2: ${item.filename}`);
                console.log(`  URL: ${url}`);
            }
        } else if (isLocal) {
            localCount++;
            console.log(`LOCAL URL still in DB: ${item.filename}`);
            console.log(`  URL: ${url}`);
        } else {
            console.log(`UNKNOWN URL format: ${url}`);
        }
    }

    console.log(`\nSummary (sample of 20):`);
    console.log(`  R2 URLs: ${r2Count}`);
    console.log(`  Local URLs: ${localCount}`);
    console.log(`  Missing from R2: ${missingCount}`);

    // Also show a working R2 URL example
    const r2Item = items.find(i => (i.url || '').startsWith(R2_PUBLIC_URL));
    if (r2Item) {
        console.log(`\nExample R2 URL from DB: ${r2Item.url}`);
        console.log(`Expected format:        ${R2_PUBLIC_URL}/media/${r2Item.filename}`);
    }
}

main();
