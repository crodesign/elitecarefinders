const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

client.send(new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME,
    MaxKeys: 10,
})).then(r => {
    console.log('KeyCount:', r.KeyCount);
    console.log('IsTruncated:', r.IsTruncated);
    console.log('Sample keys:');
    (r.Contents || []).forEach(o => console.log(' ', o.Key));
}).catch(e => console.error('Error:', e.message));
