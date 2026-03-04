'use strict';
/**
 * Finds dates in WP XML for the entities NOT covered by the existing backfill SQL,
 * and outputs supplemental SQL for those missing entries only.
 */
const fs = require('fs');
const path = require('path');

const missingSlugs = {
    homes: new Set(['wphu-gemma-alvia', 'kple-1005', 'ewab-1032', 'pcty-1006', 'slake-1015', 'coming-soon', 'aiea-care-home-coming-soon']),
    facilities: new Set(['hunt-0098761', 'the-plaza-at-kaneohe', 'the-plaza-at-pearl-city', 'the-plaza-at-moanalua', 'the-plaza-at-mililani']),
};

function unwrapCdata(raw) {
    const s = raw.trim();
    if (s.startsWith('<![CDATA[')) return s.slice(9, s.lastIndexOf(']]>')).trim();
    return s;
}
function getTag(xml, tag) {
    const re = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = re.exec(xml);
    return m ? unwrapCdata(m[1]) : '';
}
function wpDateToIso(wpDate) {
    if (!wpDate || wpDate === '0000-00-00 00:00:00') return null;
    return wpDate.replace(' ', 'T') + 'Z';
}

function extractMissing(xmlPath, postType, slugSet) {
    const xml = fs.readFileSync(path.resolve(process.cwd(), xmlPath), 'utf8');
    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);
    const found = [];
    const notFound = new Set(slugSet);
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== postType) continue;
        const slug = getTag(item, 'wp:post_name').trim();
        if (!slugSet.has(slug)) continue;
        const createdAt = wpDateToIso(getTag(item, 'wp:post_date_gmt'));
        const updatedAt = wpDateToIso(getTag(item, 'wp:post_modified_gmt'));
        found.push({ slug, createdAt, updatedAt });
        notFound.delete(slug);
    }
    if (notFound.size > 0) {
        console.log(`  Not found in ${xmlPath}: ${[...notFound].join(', ')}`);
    }
    return found;
}

const homeRecords = extractMissing('wp-homes-export.xml', 'homes', missingSlugs.homes);
const facilityRecords = extractMissing('wp-facilities-export.xml', 'facilities', missingSlugs.facilities);

console.log(`\nHomes found in XML: ${homeRecords.length}`);
homeRecords.forEach(r => console.log(`  ${r.slug}: created=${r.createdAt?.substring(0,10)} updated=${r.updatedAt?.substring(0,10)}`));
console.log(`\nFacilities found in XML: ${facilityRecords.length}`);
facilityRecords.forEach(r => console.log(`  ${r.slug}: created=${r.createdAt?.substring(0,10)} updated=${r.updatedAt?.substring(0,10)}`));

// Generate supplemental SQL
const esc = s => s.replace(/'/g, "''");
const lines = [
    '-- Supplemental WP date backfill for entities missing from original SQL',
    '-- Run in Supabase dashboard SQL editor',
    '',
    'ALTER TABLE homes DISABLE TRIGGER USER;',
    'ALTER TABLE facilities DISABLE TRIGGER USER;',
    '',
    '-- Homes',
];
for (const { slug, createdAt, updatedAt } of homeRecords) {
    if (!createdAt && !updatedAt) continue;
    const sets = [];
    if (createdAt) sets.push(`created_at = '${createdAt}'`);
    if (updatedAt) sets.push(`updated_at = '${updatedAt}'`);
    lines.push(`UPDATE homes SET ${sets.join(', ')} WHERE slug = '${esc(slug)}';`);
}
lines.push('', '-- Facilities');
for (const { slug, createdAt, updatedAt } of facilityRecords) {
    if (!createdAt && !updatedAt) continue;
    const sets = [];
    if (createdAt) sets.push(`created_at = '${createdAt}'`);
    if (updatedAt) sets.push(`updated_at = '${updatedAt}'`);
    lines.push(`UPDATE facilities SET ${sets.join(', ')} WHERE slug = '${esc(slug)}';`);
}
lines.push('', 'ALTER TABLE homes ENABLE TRIGGER USER;', 'ALTER TABLE facilities ENABLE TRIGGER USER;', '');

const outPath = path.resolve(process.cwd(), 'backfill-wp-dates-supplemental.sql');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`\nSQL written to: backfill-wp-dates-supplemental.sql`);
