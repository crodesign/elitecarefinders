/**
 * import-post-images.js
 *
 * For each published post, finds all Unsplash image URLs in:
 *   - posts.images[]
 *   - posts.metadata.instructions[].image  (recipe step images)
 *
 * Then for each unique URL:
 *   1. Downloads the image
 *   2. Converts to WebP, resizes to max 1940px
 *   3. Generates 3 crop variants (-500x500, -200x200, -100x100)
 *   4. Uploads all 4 files to R2
 *   5. Creates a media_items row in the "Post Images" folder
 *   6. Patches the post's images[] and metadata to use the new R2 URL
 *
 * Usage:
 *   node scripts/import-post-images.js           # live
 *   node scripts/import-post-images.js --dry-run # preview, no uploads or DB writes
 */

require('dotenv').config({ path: '.env.local' });
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID?.trim()}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '',
    },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME?.trim() ?? '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.trim() ?? '';
const R2_PREFIX = 'media';

function toR2Key(filename) { return `${R2_PREFIX}/${filename}`; }
function toPublicUrl(filename) { return `${R2_PUBLIC_URL}/${R2_PREFIX}/${filename}`; }

async function r2Exists(filename) {
    try {
        await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: toR2Key(filename) }));
        return true;
    } catch { return false; }
}

async function r2Upload(filename, buf, contentType) {
    await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: toR2Key(filename),
        Body: buf,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
    }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Download a URL and return a Buffer */
async function download(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return Buffer.from(await res.arrayBuffer());
}

/** Derive a short stable slug from an Unsplash URL */
function photoSlug(url) {
    // e.g. https://images.unsplash.com/photo-1559757175-0eb30cd8c063?...
    const match = url.match(/photo-([a-zA-Z0-9_-]+)/);
    return match ? match[1] : slugify(url.split('/').pop().split('?')[0]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
    console.log(DRY_RUN ? '[DRY RUN] No uploads or DB writes.\n' : '[LIVE] Importing post images...\n');

    // 1. Fetch all published posts
    const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, slug, images, metadata')
        .eq('status', 'published');

    if (postsError) { console.error('Failed to fetch posts:', postsError.message); process.exit(1); }

    // 2. Collect unique Unsplash URLs with their post/context
    // Map: unsplashUrl → { posts: [{postId, context}] }
    const urlMap = new Map(); // url → Set of post ids

    for (const post of posts) {
        const urls = new Set();

        // Gallery images
        if (Array.isArray(post.images)) {
            for (const u of post.images) {
                if (u && u.includes('unsplash.com')) urls.add(u);
            }
        }

        // Recipe step images in metadata.instructions
        const instructions = post.metadata?.instructions;
        if (Array.isArray(instructions)) {
            for (const step of instructions) {
                if (step?.image && step.image.includes('unsplash.com')) urls.add(step.image);
            }
        }

        for (const url of urls) {
            if (!urlMap.has(url)) urlMap.set(url, new Set());
            urlMap.get(url).add(post.id);
        }
    }

    console.log(`Found ${urlMap.size} unique Unsplash image URL(s) across ${posts.length} posts.\n`);

    if (urlMap.size === 0) {
        console.log('Nothing to import.');
        return;
    }

    // 3. Get (or find) Post Images folder id
    const { data: folder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('slug', 'post-images')
        .single();

    const postImagesFolderId = folder?.id ?? null;
    if (!postImagesFolderId) console.warn('Warning: "Post Images" folder not found — items will be unfiled.\n');

    // 4. Get next available naming number for this folder
    const { data: existingItems } = await supabase
        .from('media_items')
        .select('filename')
        .eq('folder_id', postImagesFolderId ?? '');

    const pattern = /^post-images-(\d+)/;
    let nextNumber = Math.max(0, ...(existingItems || []).map(f => {
        const m = f.filename.match(pattern);
        return m ? parseInt(m[1]) : 0;
    })) + 1;

    // 5. Process each unique URL
    const urlToLocalUrl = new Map(); // unsplashUrl → R2 public url
    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const [url] of urlMap) {
        const slug = photoSlug(url);
        console.log(`Processing ${slug}...`);

        try {
            // Check if already imported (search media_items by title containing slug)
            const { data: existing } = await supabase
                .from('media_items')
                .select('id, url')
                .ilike('filename', `%${slug}%`)
                .limit(1);

            if (existing && existing.length > 0) {
                console.log(`  [SKIP] Already in library: ${existing[0].url}`);
                urlToLocalUrl.set(url, existing[0].url);
                skipped++;
                continue;
            }

            // Download
            const rawBuf = await download(url);

            // Convert + resize original
            const { data: origBuf, info: origInfo } = await sharp(rawBuf)
                .resize(1940, 1940, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 90 })
                .toBuffer({ resolveWithObject: true });

            const filename = `post-images-${nextNumber}.webp`;
            const stem = `post-images-${nextNumber}`;
            nextNumber++;

            const largeFilename  = `${stem}-500x500.webp`;
            const mediumFilename = `${stem}-200x200.webp`;
            const thumbFilename  = `${stem}-100x100.webp`;

            // Generate variants
            const [largeBuf, mediumBuf, thumbBuf] = await Promise.all([
                sharp(rawBuf).resize(500, 500, { fit: 'cover', position: 'centre' }).webp({ quality: 85 }).toBuffer(),
                sharp(rawBuf).resize(200, 200, { fit: 'cover', position: 'centre' }).webp({ quality: 85 }).toBuffer(),
                sharp(rawBuf).resize(100, 100, { fit: 'cover', position: 'centre' }).webp({ quality: 85 }).toBuffer(),
            ]);

            const publicUrl       = toPublicUrl(filename);
            const publicUrlLarge  = toPublicUrl(largeFilename);
            const publicUrlMedium = toPublicUrl(mediumFilename);
            const publicUrlThumb  = toPublicUrl(thumbFilename);

            if (!DRY_RUN) {
                await Promise.all([
                    r2Upload(filename,       origBuf,   'image/webp'),
                    r2Upload(largeFilename,  largeBuf,  'image/webp'),
                    r2Upload(mediumFilename, mediumBuf, 'image/webp'),
                    r2Upload(thumbFilename,  thumbBuf,  'image/webp'),
                ]);

                // Create media_items row
                const { error: insertError } = await supabase.from('media_items').insert({
                    folder_id:         postImagesFolderId,
                    filename,
                    original_filename: `unsplash-${slug}.jpg`,
                    title:             stem,
                    mime_type:         'image/webp',
                    file_size:         origBuf.length,
                    width:             origInfo.width,
                    height:            origInfo.height,
                    storage_path:      publicUrl,
                    url:               publicUrl,
                    url_large:         publicUrlLarge,
                    url_medium:        publicUrlMedium,
                    url_thumb:         publicUrlThumb,
                });

                if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);
            }

            urlToLocalUrl.set(url, publicUrl);
            console.log(`  [OK] ${filename} (${origInfo.width}x${origInfo.height})`);
            imported++;
        } catch (err) {
            console.error(`  [ERROR] ${slug}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\nUpload complete: ${imported} imported, ${skipped} skipped, ${failed} failed.\n`);

    if (urlToLocalUrl.size === 0) {
        console.log('No URL replacements to apply.');
        return;
    }

    // 6. Patch each post's images[] and metadata to use the local URL
    let patchedPosts = 0;

    for (const post of posts) {
        const updates = {};

        // Patch images[]
        if (Array.isArray(post.images) && post.images.length > 0) {
            const newImages = post.images.map(u => urlToLocalUrl.get(u) ?? u);
            if (newImages.join(',') !== post.images.join(',')) {
                updates.images = newImages;
            }
        }

        // Patch metadata.instructions[].image
        const instructions = post.metadata?.instructions;
        if (Array.isArray(instructions)) {
            const newInstructions = instructions.map(step => {
                if (step?.image && urlToLocalUrl.has(step.image)) {
                    return { ...step, image: urlToLocalUrl.get(step.image) };
                }
                return step;
            });
            const changed = newInstructions.some((s, i) => s.image !== instructions[i]?.image);
            if (changed) {
                updates.metadata = { ...post.metadata, instructions: newInstructions };
            }
        }

        if (Object.keys(updates).length === 0) continue;

        if (!DRY_RUN) {
            const { error: patchError } = await supabase
                .from('posts')
                .update(updates)
                .eq('id', post.id);

            if (patchError) {
                console.error(`  [ERROR] Patching post ${post.slug}: ${patchError.message}`);
            } else {
                console.log(`  [PATCHED] ${post.slug}`);
                patchedPosts++;
            }
        } else {
            console.log(`  [DRY] Would patch ${post.slug}`);
            patchedPosts++;
        }
    }

    console.log(`\nPatched ${patchedPosts} post(s).\nDone.`);
}

run().catch(err => { console.error(err); process.exit(1); });
