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

async function r2Exists(filename) {
    try {
        await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `media/${filename}` }));
        return true;
    } catch { return false; }
}

async function main() {
    let offset = 0;
    const BATCH = 500;
    let inR2 = 0, notInR2 = 0;
    const notInR2Samples = [];

    while (true) {
        const { data: items } = await supabase
            .from('media_items')
            .select('id, filename, url')
            .like('url', '/images/media/%')
            .range(offset, offset + BATCH - 1);

        if (!items || items.length === 0) break;

        for (const item of items) {
            const exists = await r2Exists(item.filename);
            if (exists) {
                inR2++;
            } else {
                notInR2++;
                if (notInR2Samples.length < 10) {
                    notInR2Samples.push(item.filename);
                }
            }
        }

        console.log(`Processed ${offset + items.length} local-URL items so far...`);
        offset += BATCH;
        if (items.length < BATCH) break;
    }

    console.log(`\nLocal URL items total: ${inR2 + notInR2}`);
    console.log(`  File exists in R2: ${inR2}`);
    console.log(`  NOT in R2:         ${notInR2}`);

    if (notInR2Samples.length > 0) {
        console.log('\nSample filenames NOT in R2:');
        notInR2Samples.forEach(f => console.log(' ', f));
    }
}

main().catch(console.error);
