'use strict';
/**
 * fix-featured-images.js
 *
 * For every migrated home that has a WordPress featured image (_thumbnail_id),
 * ensures that image appears first in the home's images[] array.
 *
 * Strategy:
 *   1. Build attachment map from XML (id → WP URL)
 *   2. For each home in DB, look up its slug in XML to find _thumbnail_id
 *   3. From the WP URL, derive the original_filename (WP file basename)
 *   4. Find the matching media_item in the home's folder by original_filename
 *   5. If found and not already first, move it to position 0 in images[]
 *   6. If not found (wasn't downloaded), download and prepend it
 *
 * Usage:
 *   node scripts/fix-featured-images.js           # live run
 *   node scripts/fix-featured-images.js --dry-run # preview only
 */

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
function getPrivateMeta(xml, key) {
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(xml)) !== null) {
        const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(bm[1]);
        const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(bm[1]);
        if (!keyM || !valM) continue;
        if (unwrap(keyM[1]) === key) return unwrap(valM[1]);
    }
    return '';
}

// =============================================================================
// File download (same as migration script)
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
// Main
// =============================================================================

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Fix Featured Images${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

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

    // Build homes map from XML: slug → { thumbnailId, thumbnailUrl }
    const xmlHomeMap = new Map();
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'homes') continue;
        const slug = getTag(item, 'wp:post_name').trim();
        if (!slug) continue;
        const thumbnailId = getPrivateMeta(item, '_thumbnail_id');
        if (!thumbnailId) continue;
        const thumbnailUrl = attachMap.get(thumbnailId);
        if (!thumbnailUrl) continue;
        xmlHomeMap.set(slug, { thumbnailId, thumbnailUrl });
    }
    console.log(`Homes with featured image in XML: ${xmlHomeMap.size}`);

    // Load all homes from DB
    const { data: homes, error } = await supabase
        .from('homes')
        .select('id, slug, images, title')
        .order('slug');

    if (error) throw new Error(`Failed to fetch homes: ${error.message}`);
    console.log(`Homes in DB: ${homes.length}\n`);

    // Get the Home Images root folder then load only its direct children
    const { data: rootFolder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('slug', 'home-images')
        .is('parent_id', null)
        .maybeSingle();

    if (!rootFolder) throw new Error('Home Images root folder not found');

    const { data: folders } = await supabase
        .from('media_folders')
        .select('id, slug')
        .eq('parent_id', rootFolder.id);

    const folderBySlug = new Map();
    for (const f of folders || []) folderBySlug.set(f.slug, f.id);

    let updated = 0, alreadyFirst = 0, noFeatured = 0, notFound = 0, errors = 0;

    for (const home of homes) {
        const xmlData = xmlHomeMap.get(home.slug);
        if (!xmlData) { noFeatured++; continue; }

        const { thumbnailUrl } = xmlData;
        const wpFilename = decodeURIComponent(thumbnailUrl.split('/').pop() || '');
        const wpStem = wpFilename.replace(/\.[^/.]+$/, '');

        // Find media_item for this home by matching original_filename to WP filename
        // Match on stem (ignoring extension) because WP may have size suffixes like -1200x900
        const folderId = folderBySlug.get(home.slug);
        if (!folderId) {
            console.log(`  ${home.slug}: no media folder found`);
            notFound++;
            continue;
        }

        const { data: mediaItems } = await supabase
            .from('media_items')
            .select('id, url, filename, original_filename')
            .eq('folder_id', folderId);

        if (!mediaItems?.length) { notFound++; continue; }

        // Find the item whose original_filename (sans extension) contains the WP stem
        // Strip WordPress size suffix from stem: e.g. "front-1200x900" → "front"
        const wpStemBase = wpStem.replace(/-\d+x\d+$/, '');
        const featuredItem = mediaItems.find(m => {
            const mStem = m.original_filename?.replace(/\.[^/.]+$/, '').replace(/-\d+x\d+$/, '') || '';
            return mStem === wpStemBase;
        });

        if (!featuredItem) {
            // Try downloading and adding it
            console.log(`  ${home.slug}: featured image not in gallery (${wpFilename}) — downloading`);

            if (DRY_RUN) {
                console.log(`    [DRY RUN] Would download: ${thumbnailUrl}`);
                notFound++;
                continue;
            }

            const ext = (thumbnailUrl.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
            const currentImages = home.images || [];
            const newIndex = currentImages.length + 1;
            const newFilename = `${home.slug}-featured.${ext}`;
            const destPath = path.join(MEDIA_DIR, newFilename);
            const publicUrl = `/images/media/${newFilename}`;

            // Check if already on disk
            let finalUrl = publicUrl;
            if (!fs.existsSync(destPath)) {
                try {
                    await downloadFile(thumbnailUrl, destPath);
                    console.log(`    Downloaded: ${newFilename}`);
                } catch (err) {
                    console.error(`    DOWNLOAD FAILED: ${err.message}`);
                    errors++;
                    continue;
                }
            }

            // Register media_item
            const stats = fs.statSync(destPath);
            const { error: insertErr } = await supabase.from('media_items').insert({
                folder_id: folderId, filename: newFilename,
                original_filename: wpFilename,
                title: wpStemBase,
                mime_type: `image/${ext}`, file_size: stats.size,
                storage_path: finalUrl, url: finalUrl,
            });
            if (insertErr) {
                console.error(`    DB insert failed: ${insertErr.message}`);
                errors++;
                continue;
            }

            // Prepend to images[]
            const newImages = [finalUrl, ...currentImages];
            const { error: updateErr } = await supabase.from('homes').update({ images: newImages }).eq('id', home.id);
            if (updateErr) {
                console.error(`    images[] update failed: ${updateErr.message}`);
                errors++;
            } else {
                console.log(`    Added as first image`);
                updated++;
            }
            continue;
        }

        const featuredUrl = featuredItem.url;
        const currentImages = home.images || [];

        if (currentImages[0] === featuredUrl) {
            alreadyFirst++;
            continue;
        }

        // Move featured image to front
        const withoutFeatured = currentImages.filter(u => u !== featuredUrl);
        const newImages = [featuredUrl, ...withoutFeatured];

        console.log(`  ${home.slug}: move ${featuredItem.filename} to front`);

        if (DRY_RUN) { updated++; continue; }

        const { error: updateErr } = await supabase.from('homes').update({ images: newImages }).eq('id', home.id);
        if (updateErr) {
            console.error(`    ERROR: ${updateErr.message}`);
            errors++;
        } else {
            updated++;
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Done`);
    console.log(`  Reordered/added: ${updated}`);
    console.log(`  Already first:   ${alreadyFirst}`);
    console.log(`  No featured img: ${noFeatured}`);
    console.log(`  Not found:       ${notFound}`);
    console.log(`  Errors:          ${errors}`);
    console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('\nFATAL:', err.message); process.exit(1); });
