'use strict';
/**
 * Fixes media_items on R2 that have null width/height (missed by fix-image-metadata.js
 * which only looked at local disk files). Fetches each image from its R2 URL,
 * reads actual dimensions + format with sharp, then updates the DB record.
 *
 * Usage:
 *   node scripts/fix-r2-null-dimensions.js           # live
 *   node scripts/fix-r2-null-dimensions.js --dry-run # preview
 */

require('dotenv').config({ path: '.env.local' });
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FORMAT_TO_MIME = {
    jpeg: 'image/jpeg',
    jpg:  'image/jpeg',
    png:  'image/png',
    webp: 'image/webp',
    gif:  'image/gif',
    avif: 'image/avif',
    svg:  'image/svg+xml',
};

const VARIANT = /-\d+x\d+\.[^.]+$/;

async function fetchBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
}

async function main() {
    console.log(`\nFix R2 null dimensions${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

    let page = 0;
    const PAGE = 200;
    let allItems = [];

    while (true) {
        const { data, error } = await supabase
            .from('media_items')
            .select('id, filename, mime_type, width, height, url')
            .is('width', null)
            .like('url', '%r2.dev%')
            .not('filename', 'like', '%-500x500%')
            .not('filename', 'like', '%-200x200%')
            .not('filename', 'like', '%-100x100%')
            .range(page * PAGE, (page + 1) * PAGE - 1);

        if (error) { console.error('Query error:', error.message); process.exit(1); }
        if (!data || data.length === 0) break;
        allItems.push(...data);
        if (data.length < PAGE) break;
        page++;
    }

    // Also filter out variant filenames by pattern just in case
    allItems = allItems.filter(r => !VARIANT.test(r.filename));

    console.log(`Found ${allItems.length} items to process.\n`);
    let updated = 0, failed = 0;

    for (const item of allItems) {
        try {
            const buf = await fetchBuffer(item.url);
            const meta = await sharp(buf).metadata();
            const detectedMime = FORMAT_TO_MIME[meta.format] ?? item.mime_type;

            console.log(`  ${item.filename}: ${meta.width}×${meta.height} ${meta.format} (was: ${item.mime_type})`);

            if (!DRY_RUN) {
                const { error: upErr } = await supabase
                    .from('media_items')
                    .update({
                        width: meta.width,
                        height: meta.height,
                        mime_type: detectedMime,
                    })
                    .eq('id', item.id);
                if (upErr) { console.error(`    Error: ${upErr.message}`); failed++; }
                else updated++;
            } else {
                updated++;
            }
        } catch (err) {
            console.error(`  FAILED ${item.filename}: ${err.message}`);
            failed++;
        }
    }

    console.log(`\nDone. Updated: ${updated}  Failed: ${failed}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
