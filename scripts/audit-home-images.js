'use strict';
/**
 * audit-home-images.js
 *
 * Compares every XML gallery/team attachment reference against what is actually
 * registered in media_items. For each home, any WP attachment that was referenced
 * but never downloaded is re-downloaded, registered, and appended to homes.images[].
 *
 * Matching: by original_filename (WP URL basename) — same as the migration.
 *
 * Usage:
 *   node scripts/audit-home-images.js           # live
 *   node scripts/audit-home-images.js --dry-run # report only
 *
 * After running, execute:
 *   node scripts/convert-originals-to-webp.js
 *   node scripts/generate-image-variants.js
 */

'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const MEDIA_DIR = path.join(process.cwd(), 'public', 'images', 'media');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// XML helpers
// =============================================================================
function unwrap(raw) {
    const s = raw.trim();
    return s.startsWith('<![CDATA[') ? s.slice(9, s.lastIndexOf(']]>')).trim() : s;
}
function getTag(xml, tag) {
    const m = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
    return m ? unwrap(m[1]) : '';
}
function getAllPostmeta(xml) {
    const map = {};
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(xml)) !== null) {
        const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(bm[1]);
        const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(bm[1]);
        if (!keyM || !valM) continue;
        const key = unwrap(keyM[1]);
        const val = unwrap(valM[1]);
        if (key) map[key] = val;  // include private keys for _thumbnail_id
    }
    return map;
}

// =============================================================================
// File download
// =============================================================================
async function downloadFile(url, destPath, redirectCount = 0) {
    if (redirectCount > 5) throw new Error(`Too many redirects for ${url}`);
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, { timeout: 30000 }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                res.resume();
                downloadFile(res.headers.location, destPath, redirectCount + 1).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(res.headers['content-type']?.split(';')[0] || 'image/jpeg'); });
            file.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// =============================================================================
// DB helpers: fetch with pagination
// =============================================================================
async function fetchAllHomes() {
    const all = [];
    let offset = 0;
    const BATCH = 500;
    while (true) {
        const { data, error } = await supabase.from('homes')
            .select('id, slug, title, images, team_images')
            .order('slug').range(offset, offset + BATCH - 1);
        if (error) throw new Error(error.message);
        if (!data?.length) break;
        all.push(...data);
        if (data.length < BATCH) break;
        offset += BATCH;
    }
    return all;
}

async function getFolderMap(rootFolderId) {
    const { data } = await supabase.from('media_folders')
        .select('id, slug').eq('parent_id', rootFolderId);
    const map = new Map();
    for (const f of data || []) map.set(f.slug, f.id);
    return map;
}

async function getMediaItemsByFolder(folderId) {
    const { data } = await supabase.from('media_items')
        .select('id, filename, original_filename, url').eq('folder_id', folderId);
    return data || [];
}

async function getMaxIndex(folderId) {
    const { data } = await supabase.from('media_items')
        .select('filename').eq('folder_id', folderId);
    let max = 0;
    for (const item of data || []) {
        const m = /-(\d+)\.webp$/.exec(item.filename);
        if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    }
    return max;
}

// =============================================================================
// Main
// =============================================================================
async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Audit Home Images${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    if (!fs.existsSync(MEDIA_DIR)) await fsp.mkdir(MEDIA_DIR, { recursive: true });

    // Parse XML
    const xml = fs.readFileSync(path.resolve(process.cwd(), 'wp-homes-export.xml'), 'utf8');
    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);

    // Build attachment map: post_id → WP URL
    const attachMap = new Map();
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'attachment') continue;
        const id = getTag(item, 'wp:post_id');
        const url = getTag(item, 'wp:attachment_url');
        if (id && url) attachMap.set(id, url);
    }
    console.log(`Attachments in XML: ${attachMap.size}`);

    // Build XML home map: slug → list of WP gallery+team URLs
    const xmlHomeMap = new Map();
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'homes') continue;
        const slug = getTag(item, 'wp:post_name').trim();
        if (!slug) continue;
        const meta = getAllPostmeta(item);

        const wpUrls = [];
        for (let i = 1; i <= 20; i++) {
            const id = (meta[`gallery_image_${i}`] || '').trim();
            if (!id) continue;
            const u = attachMap.get(id);
            if (u) wpUrls.push(u);
        }
        for (let i = 1; i <= 6; i++) {
            const id = (meta[`extra_gallery_image_${i}`] || '').trim();
            if (!id) continue;
            const u = attachMap.get(id);
            if (u) wpUrls.push(u);
        }
        for (let i = 1; i <= 5; i++) {
            const id = (meta[`team_image_${i}`] || '').trim();
            if (!id) continue;
            const u = attachMap.get(id);
            if (u) wpUrls.push(u);
        }
        const provId = (meta['provider_image'] || '').trim();
        if (provId) { const u = attachMap.get(provId); if (u) wpUrls.push(u); }

        xmlHomeMap.set(slug, wpUrls);
    }
    console.log(`XML homes with image refs: ${xmlHomeMap.size}`);

    // Load all DB homes and folder map
    const homes = await fetchAllHomes();
    console.log(`DB homes: ${homes.length}`);

    const { data: rootFolder } = await supabase.from('media_folders')
        .select('id').eq('slug', 'home-images').is('parent_id', null).maybeSingle();
    if (!rootFolder) throw new Error('Home Images root folder not found');

    const folderBySlug = await getFolderMap(rootFolder.id);

    let totalMissing = 0, downloaded = 0, downloadErrors = 0, homesAffected = 0;

    for (const home of homes) {
        const wpUrls = xmlHomeMap.get(home.slug);
        if (!wpUrls?.length) continue;

        const folderId = folderBySlug.get(home.slug);
        if (!folderId) { console.log(`  [WARN] ${home.slug}: no media folder — skipping`); continue; }

        const mediaItems = await getMediaItemsByFolder(folderId);
        // Build set of original_filenames already registered
        const registeredOriginals = new Set(
            mediaItems.map(m => m.original_filename?.toLowerCase()).filter(Boolean)
        );

        // Find missing: WP URLs whose basename isn't registered
        const missing = [];
        for (const wpUrl of wpUrls) {
            const basename = decodeURIComponent(wpUrl.split('/').pop() || '');
            if (!basename) continue;
            if (!registeredOriginals.has(basename.toLowerCase())) {
                missing.push({ wpUrl, basename });
            }
        }

        if (!missing.length) continue;

        homesAffected++;
        totalMissing += missing.length;
        console.log(`\n  ${home.slug}: ${missing.length} missing image(s)`);
        for (const { basename } of missing) console.log(`    - ${basename}`);

        if (DRY_RUN) continue;

        // Download each missing image and register it
        let maxIdx = await getMaxIndex(folderId);
        const newUrls = [];

        for (const { wpUrl, basename } of missing) {
            maxIdx++;
            const ext = (wpUrl.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
            const newFilename = `${home.slug}-${maxIdx}.${ext}`;
            const destPath = path.join(MEDIA_DIR, newFilename);
            const publicUrl = `/images/media/${newFilename}`;

            let mimeType = `image/${ext}`;
            if (!fs.existsSync(destPath)) {
                try {
                    mimeType = await downloadFile(wpUrl, destPath);
                    console.log(`    Downloaded: ${newFilename}`);
                    downloaded++;
                } catch (err) {
                    console.error(`    FAILED: ${basename} — ${err.message}`);
                    downloadErrors++;
                    maxIdx--; // don't advance index for failed download
                    continue;
                }
            } else {
                console.log(`    Already on disk: ${newFilename}`);
                downloaded++;
            }

            const stats = fs.statSync(destPath);
            const { error: insertErr } = await supabase.from('media_items').insert({
                folder_id: folderId,
                filename: newFilename,
                original_filename: basename,
                title: basename.replace(/\.[^/.]+$/, ''),
                mime_type: mimeType,
                file_size: stats.size,
                storage_path: publicUrl,
                url: publicUrl,
            });

            if (insertErr) {
                console.error(`    DB insert failed: ${insertErr.message}`);
                downloadErrors++;
                continue;
            }

            newUrls.push(publicUrl);
        }

        if (!newUrls.length) continue;

        // Determine if these are gallery or team images based on position in wpUrls
        // Gallery images come before team images in the wpUrls array
        // For simplicity: append all missing to homes.images[] (not team_images)
        // — review manually if a team image is missing
        const newImages = [...(home.images || []), ...newUrls];
        const { error: updateErr } = await supabase.from('homes')
            .update({ images: newImages }).eq('id', home.id);

        if (updateErr) console.error(`    images[] update failed: ${updateErr.message}`);
        else console.log(`    Appended ${newUrls.length} URL(s) to images[]`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Homes with missing images: ${homesAffected}`);
    console.log(`Total missing attachments: ${totalMissing}`);
    if (!DRY_RUN) {
        console.log(`Downloaded/registered:     ${downloaded}`);
        console.log(`Errors:                    ${downloadErrors}`);
        if (downloaded > 0) {
            console.log(`\nNext steps:`);
            console.log(`  node scripts/convert-originals-to-webp.js`);
            console.log(`  node scripts/generate-image-variants.js`);
            console.log(`  node scripts/fix-image-metadata.js`);
        }
    }
    console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
