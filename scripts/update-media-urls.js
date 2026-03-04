'use strict';

/**
 * Updates media_items URLs in the DB from local /images/media/ paths to R2 CDN URLs.
 * Run after upload-to-r2.js completes.
 *
 * Usage: node scripts/update-media-urls.js
 *        node scripts/update-media-urls.js --dry-run
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
if (!R2_PUBLIC_URL) { console.error('Missing R2_PUBLIC_URL'); process.exit(1); }

// Maps local path prefix → R2 URL prefix
function toR2Url(localUrl) {
    if (!localUrl) return localUrl;
    // /images/media/filename.webp → https://...r2.dev/media/filename.webp
    if (localUrl.startsWith('/images/media/')) {
        return `${R2_PUBLIC_URL}/media/${localUrl.slice('/images/media/'.length)}`;
    }
    return localUrl; // leave non-media URLs unchanged
}

async function main() {
    console.log(`\nMedia URL Update${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log(`R2 base: ${R2_PUBLIC_URL}/media/\n`);

    const BATCH = 500;
    let offset = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    while (true) {
        const { data: items, error } = await supabase
            .from('media_items')
            .select('id, url, url_large, url_medium, url_thumb')
            .range(offset, offset + BATCH - 1);

        if (error) { console.error('Fetch error:', error.message); process.exit(1); }
        if (!items || items.length === 0) break;

        const toUpdate = items.filter(item =>
            (item.url && item.url.startsWith('/images/media/')) ||
            (item.url_large && item.url_large.startsWith('/images/media/')) ||
            (item.url_medium && item.url_medium.startsWith('/images/media/')) ||
            (item.url_thumb && item.url_thumb.startsWith('/images/media/'))
        );

        totalSkipped += items.length - toUpdate.length;

        if (toUpdate.length > 0) {
            console.log(`Batch ${offset}–${offset + items.length - 1}: ${toUpdate.length} to update, ${items.length - toUpdate.length} already correct`);

            if (!DRY_RUN) {
                for (const item of toUpdate) {
                    const { error: updateError } = await supabase
                        .from('media_items')
                        .update({
                            url:        toR2Url(item.url),
                            url_large:  toR2Url(item.url_large),
                            url_medium: toR2Url(item.url_medium),
                            url_thumb:  toR2Url(item.url_thumb),
                            storage_path: toR2Url(item.url),
                        })
                        .eq('id', item.id);
                    if (updateError) console.error(`  Error updating ${item.id}:`, updateError.message);
                    else totalUpdated++;
                }
            } else {
                console.log(`  [DRY RUN] Sample: ${toUpdate[0].url} → ${toR2Url(toUpdate[0].url)}`);
                totalUpdated += toUpdate.length;
            }
        }

        offset += BATCH;
        if (items.length < BATCH) break;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('Done');
    console.log(`  Updated: ${totalUpdated}  Already R2: ${totalSkipped}`);
    if (!DRY_RUN && totalUpdated > 0) {
        console.log('\nNEXT: Rewrite API routes to use R2, then git push to deploy.');
    }
    console.log('='.repeat(50));
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
