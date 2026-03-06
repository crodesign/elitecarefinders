/**
 * Backfill descriptions from WordPress XML exports into the DB.
 *
 * Reads facility_description from wp-homes-export.xml and wp-facilities-export.xml,
 * and updates the description column for each matching slug in the DB.
 *
 * Usage:
 *   node scripts/backfill-descriptions.js            # dry run (shows what would change)
 *   node scripts/backfill-descriptions.js --apply    # apply updates
 *   node scripts/backfill-descriptions.js --apply --table homes     # homes only
 *   node scripts/backfill-descriptions.js --apply --table facilities # facilities only
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const DRY_RUN = !process.argv.includes('--apply');
const TABLE_FILTER = process.argv.includes('--table')
    ? process.argv[process.argv.indexOf('--table') + 1]
    : null;

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function unwrapCdata(raw) {
    const s = raw.trim();
    if (s.startsWith('<![CDATA[')) return s.slice(9, s.lastIndexOf(']]>')).trim();
    return s;
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
        if (key && !key.startsWith('_')) map[key] = val;
    }
    return map;
}

function getTag(xml, tag) {
    const re = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = re.exec(xml);
    return m ? unwrapCdata(m[1]) : '';
}

function parseDescriptions(xmlFile, postType) {
    const xml = fs.readFileSync(xmlFile, 'utf8');
    const items = xml.split('<item>').slice(1);
    const result = {};
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== postType) continue;
        const slug = getTag(item, 'wp:post_name').trim();
        if (!slug) continue;
        const meta = getAllPostmeta(item);
        const desc = meta['facility_description'] || '';
        if (desc) result[slug] = desc;
    }
    return result;
}

async function backfill(table, xmlFile, postType) {
    console.log(`\n=== ${table} ===`);

    const xmlDescriptions = parseDescriptions(xmlFile, postType);
    const slugsInXml = Object.keys(xmlDescriptions);
    console.log(`Found ${slugsInXml.length} ${table} with non-empty description in XML`);

    // Fetch current DB records
    const { data: rows, error } = await sb
        .from(table)
        .select('slug, description')
        .in('slug', slugsInXml);

    if (error) { console.error('DB error:', error.message); return; }

    let updated = 0, skipped = 0, unchanged = 0;

    for (const row of rows) {
        const xmlDesc = xmlDescriptions[row.slug];
        if (!xmlDesc) continue;

        const currentDesc = row.description || '';

        // Skip if already matches
        if (currentDesc === xmlDesc) { unchanged++; continue; }

        const hasHtmlInXml = /<[a-z]/i.test(xmlDesc);
        const hasHtmlInDb = /<[a-z]/i.test(currentDesc);

        console.log(`\n  ${row.slug}`);
        console.log(`    DB:  ${currentDesc.slice(0, 80).replace(/\n/g, ' ')}${currentDesc.length > 80 ? '…' : ''}`);
        console.log(`    XML: ${xmlDesc.slice(0, 80).replace(/\n/g, ' ')}${xmlDesc.length > 80 ? '…' : ''}`);
        console.log(`    XML has HTML: ${hasHtmlInXml}, DB has HTML: ${hasHtmlInDb}`);

        if (DRY_RUN) { updated++; continue; }

        const { error: updateError } = await sb
            .from(table)
            .update({ description: xmlDesc })
            .eq('slug', row.slug);

        if (updateError) {
            console.error(`    ERROR updating ${row.slug}:`, updateError.message);
            skipped++;
        } else {
            updated++;
        }
    }

    // Also report slugs in XML that aren't in DB
    const dbSlugs = new Set(rows.map(r => r.slug));
    const missingInDb = slugsInXml.filter(s => !dbSlugs.has(s));
    if (missingInDb.length > 0) {
        console.log(`\n  ${missingInDb.length} slugs in XML not found in DB (not migrated):`, missingInDb.slice(0, 10));
    }

    console.log(`\n  Result: ${updated} would be updated, ${unchanged} already match, ${skipped} errors`);
    if (DRY_RUN && updated > 0) {
        console.log(`  Run with --apply to apply changes`);
    }
}

async function main() {
    console.log(DRY_RUN ? '[DRY RUN] No changes will be made' : '[APPLY] Writing to DB');

    if (!TABLE_FILTER || TABLE_FILTER === 'homes') {
        await backfill('homes', 'wp-homes-export.xml', 'homes');
    }
    if (!TABLE_FILTER || TABLE_FILTER === 'facilities') {
        await backfill('facilities', 'wp-facilities-export.xml', 'facilities');
    }
}

main().catch(console.error);
