'use strict';

/**
 * scripts/migrate-wp-facilities.js
 *
 * Migrates facilities from the WordPress XML export into Supabase.
 *
 * Usage:
 *   node scripts/migrate-wp-facilities.js            # full run
 *   node scripts/migrate-wp-facilities.js --dry-run  # preview only, no DB writes or downloads
 *   node scripts/migrate-wp-facilities.js --skip-images  # insert DB records but skip image downloads
 *
 * Prerequisites:
 *   - wp-facilities-export.xml must exist in the project root
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - "Facility Images" media folder must exist in the DB
 *   - Videos migration (20260226120000_add_videos_to_homes_facilities.sql) must be applied
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_IMAGES = process.argv.includes('--skip-images');
const MEDIA_DIR = path.join(process.cwd(), 'public', 'images', 'media');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// XML parsing helpers
// =============================================================================

function unwrapCdata(raw) {
    const s = raw.trim();
    if (s.startsWith('<![CDATA[')) {
        return s.slice(9, s.lastIndexOf(']]>')).trim();
    }
    return s;
}

function getTag(xml, tag) {
    const re = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = re.exec(xml);
    return m ? unwrapCdata(m[1]) : '';
}

function getAllPostmeta(xml) {
    const map = {};
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(xml)) !== null) {
        const block = bm[1];
        const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(block);
        const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(block);
        if (!keyM || !valM) continue;
        const key = unwrapCdata(keyM[1]);
        const val = unwrapCdata(valM[1]);
        if (key && !key.startsWith('_')) {
            map[key] = val;
        }
    }
    return map;
}

function getCategories(xml) {
    const cats = [];
    const re = /<category\s+domain="([^"]+)"\s+nicename="([^"]+)"><!\[CDATA\[([^\]]*)\]\]><\/category>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        cats.push({ domain: m[1], nicename: m[2], name: m[3] });
    }
    return cats;
}

// Parse <span ... class="yes"> → true, <span ... class="no"> → false
function isYes(val) {
    if (!val) return false;
    return /class="[^"]*\byes\b/.test(val) || /class='[^']*\byes\b/.test(val);
}

// =============================================================================
// Address parsing  e.g. "739 Leihano St, Kapolei, HI 96707"
// =============================================================================

function parseAddress(raw) {
    if (!raw) return { street: '', city: '', state: '', zip: '' };
    const parts = raw.split(',').map(s => s.trim());
    if (parts.length >= 3) {
        const street = parts[0];
        const city = parts[1];
        const stateZip = parts[2].trim().split(/\s+/);
        return { street, city, state: stateZip[0] || '', zip: stateZip[1] || '' };
    }
    if (parts.length === 2) return { street: parts[0], city: parts[1], state: '', zip: '' };
    return { street: raw, city: '', state: '', zip: '' };
}

// =============================================================================
// Slug generation
// =============================================================================

function slugify(text) {
    return text.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
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
                const location = res.headers.location;
                if (!location) { reject(new Error('Redirect with no location')); return; }
                // Consume the response body to free up socket
                res.resume();
                downloadFile(location, destPath, redirectCount + 1).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                return;
            }
            const contentType = res.headers['content-type'] || 'image/jpeg';
            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(contentType.split(';')[0]); });
            file.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout for ${url}`)); });
    });
}

// =============================================================================
// Taxonomy helpers
// =============================================================================

async function ensureTaxonomy(singularName, pluralName, slug) {
    const { data } = await supabase
        .from('taxonomies')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

    if (data) {
        console.log(`  Taxonomy exists: ${pluralName} (${data.id})`);
        return data.id;
    }

    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create taxonomy: ${pluralName}`);
        return `dry-${slug}`;
    }

    const { data: created, error } = await supabase
        .from('taxonomies')
        .insert({ type: singularName, name: pluralName, slug, content_types: ['facility'] })
        .select('id')
        .single();

    if (error) throw new Error(`Failed to create taxonomy "${slug}": ${error.message}`);
    console.log(`  Created taxonomy: ${pluralName} (${created.id})`);
    return created.id;
}

async function ensureTaxonomyEntry(taxonomyId, name, nicename) {
    const slug = nicename; // use WP nicename as slug (already slugified)

    const { data } = await supabase
        .from('taxonomy_entries')
        .select('id')
        .eq('taxonomy_id', taxonomyId)
        .eq('slug', slug)
        .maybeSingle();

    if (data) return data.id;

    if (DRY_RUN) {
        console.log(`    [DRY RUN] Would create entry: ${name}`);
        return `dry-${slug}`;
    }

    const { data: created, error } = await supabase
        .from('taxonomy_entries')
        .insert({ taxonomy_id: taxonomyId, name, slug, display_order: 0 })
        .select('id')
        .single();

    if (error) throw new Error(`Failed to create entry "${slug}": ${error.message}`);
    console.log(`    Created entry: ${name} (${created.id})`);
    return created.id;
}

// =============================================================================
// Media folder helpers
// =============================================================================

async function getFacilityImagesFolder() {
    const { data } = await supabase
        .from('media_folders')
        .select('id, path')
        .eq('slug', 'facility-images')
        .is('parent_id', null)
        .maybeSingle();

    if (data) return data;

    if (DRY_RUN) {
        console.log('  [DRY RUN] Would create "Facility Images" root folder');
        return { id: 'dry-facility-images', path: '/Facility Images' };
    }

    // Auto-create the root "Facility Images" folder
    const { data: created, error } = await supabase
        .from('media_folders')
        .insert({ name: 'Facility Images', slug: 'facility-images', path: '/Facility Images', parent_id: null })
        .select('id, path')
        .single();

    if (error) throw new Error(`Failed to create "Facility Images" folder: ${error.message}`);
    console.log(`  Created "Facility Images" root folder (${created.id})`);
    return created;
}

async function ensureMediaFolder(name, slug, parentId, parentPath) {
    const { data } = await supabase
        .from('media_folders')
        .select('id')
        .eq('slug', slug)
        .eq('parent_id', parentId)
        .maybeSingle();

    if (data) return data.id;

    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create media folder: ${name}`);
        return `dry-folder-${slug}`;
    }

    const folderPath = `${parentPath}/${name}`;
    const { data: created, error } = await supabase
        .from('media_folders')
        .insert({ name, slug, parent_id: parentId, path: folderPath })
        .select('id')
        .single();

    if (error) throw new Error(`Failed to create media folder "${name}": ${error.message}`);
    console.log(`  Created media folder: ${name} (${created.id})`);
    return created.id;
}

// =============================================================================
// Image download + media_items registration
// =============================================================================

async function downloadAndRegisterImage(wpUrl, folderId, folderSlug, index) {
    const ext = (wpUrl.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    const filename = `${folderSlug}-${index}.${ext}`;
    const destPath = path.join(MEDIA_DIR, filename);
    const publicUrl = `/images/media/${filename}`;
    const originalFilename = decodeURIComponent(wpUrl.split('/').pop() || filename);

    // Already registered?
    const { data: existing } = await supabase
        .from('media_items')
        .select('id, url')
        .eq('filename', filename)
        .maybeSingle();

    if (existing) {
        console.log(`    Already exists: ${filename}`);
        return existing.url;
    }

    if (DRY_RUN || SKIP_IMAGES) {
        console.log(`    [${DRY_RUN ? 'DRY RUN' : 'SKIP'}] ${originalFilename} → ${filename}`);
        return publicUrl;
    }

    // Download to disk
    let mimeType = `image/${ext}`;
    try {
        mimeType = await downloadFile(wpUrl, destPath);
    } catch (err) {
        console.error(`    DOWNLOAD FAILED: ${wpUrl} — ${err.message}`);
        return null;
    }

    const stats = fs.statSync(destPath);

    // Create DB record
    const { error } = await supabase.from('media_items').insert({
        folder_id: folderId,
        filename,
        original_filename: originalFilename,
        title: originalFilename.replace(/\.[^/.]+$/, ''),
        mime_type: mimeType,
        file_size: stats.size,
        storage_path: publicUrl,
        url: publicUrl,
    });

    if (error) {
        console.error(`    DB INSERT FAILED for ${filename}: ${error.message}`);
        return null;
    }

    console.log(`    Downloaded: ${filename} (${Math.round(stats.size / 1024)}KB)`);
    return publicUrl;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`WP Facilities Migration${DRY_RUN ? ' [DRY RUN]' : ''}${SKIP_IMAGES ? ' [SKIP IMAGES]' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    }

    // 1. Read XML
    const xmlPath = path.resolve(process.cwd(), 'wp-facilities-export.xml');
    if (!fs.existsSync(xmlPath)) throw new Error(`File not found: ${xmlPath}`);
    const xml = fs.readFileSync(xmlPath, 'utf8');
    console.log(`XML file size: ${Math.round(xml.length / 1024)}KB`);

    // 2. Split into item chunks
    const items = xml.split('<item>').slice(1).map(chunk => '<item>' + chunk.split('</item>')[0]);
    console.log(`Total XML items: ${items.length}`);

    // 3. Build WP attachment ID → URL map
    const attachMap = new Map();
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'attachment') continue;
        const id = getTag(item, 'wp:post_id');
        const url = getTag(item, 'wp:attachment_url');
        if (id && url) attachMap.set(id, url);
    }
    console.log(`Attachments found: ${attachMap.size}`);

    // 4. Parse facility items
    const wpFacilities = [];
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'facilities') continue;
        const title = getTag(item, 'title').trim();
        if (!title) {
            const id = getTag(item, 'wp:post_id');
            console.log(`  Skipping untitled draft (wp:post_id=${id})`);
            continue;
        }
        const rawSlug = getTag(item, 'wp:post_name').trim();
        const wpStatus = getTag(item, 'wp:status');
        const wpId = getTag(item, 'wp:post_id');
        const slug = rawSlug || slugify(title);
        const status = (wpStatus === 'publish' || wpStatus === 'pending') ? 'published' : 'draft';
        const meta = getAllPostmeta(item);
        const cats = getCategories(item);
        wpFacilities.push({ wpId, title, slug, status, meta, cats });
    }
    console.log(`Facilities to process: ${wpFacilities.length}\n`);
    for (const f of wpFacilities) {
        console.log(`  [${f.status.padEnd(9)}] ${f.title} (slug: ${f.slug})`);
    }

    // 5. Set up taxonomies
    console.log('\n--- Taxonomies ---');
    const facilityTypeTaxId = await ensureTaxonomy('Facility Type', 'Facility Types', 'facility-types');
    const neighborhoodTaxId = await ensureTaxonomy('Neighborhood', 'Neighborhoods', 'neighborhoods');

    // Collect all unique category entries across all facilities
    const facilityTypeEntryMap = {}; // nicename → DB entry ID
    const neighborhoodEntryMap = {};

    for (const fac of wpFacilities) {
        for (const cat of fac.cats) {
            if (cat.domain === 'facility_types' && !facilityTypeEntryMap[cat.nicename]) {
                const id = await ensureTaxonomyEntry(facilityTypeTaxId, cat.name, cat.nicename);
                facilityTypeEntryMap[cat.nicename] = id;
            }
            if (cat.domain === 'neighborhood' && !neighborhoodEntryMap[cat.nicename]) {
                const id = await ensureTaxonomyEntry(neighborhoodTaxId, cat.name, cat.nicename);
                neighborhoodEntryMap[cat.nicename] = id;
            }
        }
    }

    // 6. Get "Facility Images" parent folder
    console.log('\n--- Media setup ---');
    const facilityImagesFolder = await getFacilityImagesFolder();
    console.log(`Facility Images folder: ${facilityImagesFolder.id} (${facilityImagesFolder.path})`);

    // 7. Ensure media directory exists
    if (!fs.existsSync(MEDIA_DIR)) {
        await fsp.mkdir(MEDIA_DIR, { recursive: true });
        console.log(`Created directory: ${MEDIA_DIR}`);
    }

    // 8. Process each facility
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fac of wpFacilities) {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`${fac.title} [${fac.status}]`);
        console.log(`${'─'.repeat(50)}`);

        // Check for existing
        const { data: existing } = await supabase
            .from('facilities')
            .select('id')
            .eq('slug', fac.slug)
            .maybeSingle();

        if (existing) {
            console.log(`  Already exists (id=${existing.id}), skipping.`);
            skipCount++;
            continue;
        }

        // Create/get media folder for this facility
        const mediaFolderId = await ensureMediaFolder(
            fac.title,
            fac.slug,
            facilityImagesFolder.id,
            facilityImagesFolder.path
        );

        // Collect gallery image WP attachment IDs (in order 1–20)
        const galleryWpUrls = [];
        for (let i = 1; i <= 20; i++) {
            const attachId = (fac.meta[`gallery_image_${i}`] || '').trim();
            if (!attachId) continue;
            const wpUrl = attachMap.get(attachId);
            if (!wpUrl) {
                console.log(`  gallery_image_${i}: attachment ID ${attachId} not found`);
                continue;
            }
            galleryWpUrls.push(wpUrl);
        }
        // Extra gallery images (6)
        for (let i = 1; i <= 6; i++) {
            const attachId = (fac.meta[`extra_gallery_image_${i}`] || '').trim();
            if (!attachId) continue;
            const wpUrl = attachMap.get(attachId);
            if (wpUrl) galleryWpUrls.push(wpUrl);
        }

        // Collect team image WP attachment IDs
        const teamWpUrls = [];
        for (let i = 1; i <= 5; i++) {
            const attachId = (fac.meta[`team_image_${i}`] || '').trim();
            if (!attachId) continue;
            const wpUrl = attachMap.get(attachId);
            if (wpUrl) teamWpUrls.push(wpUrl);
        }

        console.log(`  Gallery: ${galleryWpUrls.length} images, Team: ${teamWpUrls.length} images`);

        // Download gallery images
        const images = [];
        let imgIndex = 1;
        for (const wpUrl of galleryWpUrls) {
            const localUrl = await downloadAndRegisterImage(wpUrl, mediaFolderId, fac.slug, imgIndex++);
            if (localUrl) images.push(localUrl);
        }

        // Download team images
        const teamImages = [];
        for (const wpUrl of teamWpUrls) {
            const localUrl = await downloadAndRegisterImage(wpUrl, mediaFolderId, fac.slug, imgIndex++);
            if (localUrl) teamImages.push(localUrl);
        }

        // Collect videos
        const videos = [];
        // Main facility video (only if marked for display)
        if (isYes(fac.meta['include_facility_video']) && fac.meta['facility_video']) {
            videos.push({ url: fac.meta['facility_video'], caption: '' });
        }
        // Gallery videos 1–5
        for (let i = 1; i <= 5; i++) {
            if (isYes(fac.meta[`display_video_${i}`]) && fac.meta[`gallery_video_${i}`]) {
                videos.push({
                    url: fac.meta[`gallery_video_${i}`],
                    caption: fac.meta[`gallery_video_caption_${i}`] || '',
                });
            }
        }

        // Build taxonomy IDs from WP categories
        const taxonomyIds = [];
        for (const cat of fac.cats) {
            if (cat.domain === 'facility_types' && facilityTypeEntryMap[cat.nicename]) {
                taxonomyIds.push(facilityTypeEntryMap[cat.nicename]);
            }
            if (cat.domain === 'neighborhood' && neighborhoodEntryMap[cat.nicename]) {
                taxonomyIds.push(neighborhoodEntryMap[cat.nicename]);
            }
        }

        const record = {
            title: fac.title,
            slug: fac.slug,
            description: fac.meta['facility_description'] || '',
            address: parseAddress(fac.meta['facility_address'] || ''),
            license_number: '',
            capacity: 0,
            taxonomy_ids: taxonomyIds,
            status: fac.status,
            images,
            team_images: teamImages,
            videos,
        };

        console.log(`  Images: ${images.length}  Team: ${teamImages.length}  Videos: ${videos.length}  Taxonomy IDs: ${taxonomyIds.length}`);
        console.log(`  Address: ${fac.meta['facility_address'] || '(none)'}`);
        console.log(`  Description: ${(record.description || '').slice(0, 80)}${record.description.length > 80 ? '…' : ''}`);

        if (DRY_RUN) {
            console.log(`  [DRY RUN] Would insert facility.`);
            successCount++;
            continue;
        }

        const { data: inserted, error } = await supabase
            .from('facilities')
            .insert(record)
            .select('id')
            .single();

        if (error) {
            console.error(`  ERROR: ${error.message}`);
            errorCount++;
        } else {
            console.log(`  Inserted: id=${inserted.id}`);
            successCount++;
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Migration complete');
    console.log(`  Inserted: ${successCount}`);
    console.log(`  Skipped (already exist): ${skipCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => {
    console.error('\nFATAL:', err.message || err);
    process.exit(1);
});
