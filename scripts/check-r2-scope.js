const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
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

async function main() {
    // Count all media items and URL types
    const { count: total } = await supabase.from('media_items').select('*', { count: 'exact', head: true });
    const { count: r2Count } = await supabase.from('media_items').select('*', { count: 'exact', head: true }).like('url', `${R2_PUBLIC_URL}%`);
    const { count: localCount } = await supabase.from('media_items').select('*', { count: 'exact', head: true }).like('url', '/images/media/%');

    console.log(`DB media_items total: ${total}`);
    console.log(`  R2 URLs:   ${r2Count}`);
    console.log(`  Local URLs: ${localCount}`);
    console.log(`  Other:     ${total - r2Count - localCount}`);

    // Count R2 objects
    let r2Total = 0;
    let continuationToken;
    do {
        const resp = await r2.send(new ListObjectsV2Command({
            Bucket: BUCKET,
            ContinuationToken: continuationToken,
        }));
        r2Total += resp.KeyCount || 0;
        continuationToken = resp.NextContinuationToken;
    } while (continuationToken);

    console.log(`\nR2 bucket total objects: ${r2Total}`);

    // Check url_thumb column population
    const { count: thumbNull } = await supabase.from('media_items').select('*', { count: 'exact', head: true }).is('url_thumb', null);
    const { count: thumbR2 } = await supabase.from('media_items').select('*', { count: 'exact', head: true }).like('url_thumb', `${R2_PUBLIC_URL}%`);
    console.log(`\nurl_thumb column:`);
    console.log(`  NULL: ${thumbNull}`);
    console.log(`  R2:   ${thumbR2}`);

    // Sample any remaining local URLs
    const { data: localItems } = await supabase.from('media_items').select('id, filename, url').like('url', '/images/media/%').limit(5);
    if (localItems && localItems.length > 0) {
        console.log('\nSample local URLs still in DB:');
        localItems.forEach(i => console.log(' ', i.url));
    }
}

main().catch(console.error);
