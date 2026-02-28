'use strict';
const fs = require('fs');

const xml = fs.readFileSync('wp-homes-export.xml', 'utf8');

// Count by post type
const homes = (xml.match(/<wp:post_type><!\[CDATA\[homes\]\]>/g) || []).length;
const attachments = (xml.match(/<wp:post_type><!\[CDATA\[attachment\]\]>/g) || []).length;
const totalItems = (xml.match(/<item>/g) || []).length;

console.log(`Total items: ${totalItems}`);
console.log(`  homes: ${homes}`);
console.log(`  attachments: ${attachments}`);
console.log(`  other: ${totalItems - homes - attachments}`);

// All unique non-private meta keys
const keyRe = /<wp:meta_key><!\[CDATA\[([^\]]+)\]\]><\/wp:meta_key>/g;
const keys = new Set();
let m;
while ((m = keyRe.exec(xml)) !== null) {
    if (!m[1].startsWith('_')) keys.add(m[1]);
}
const sorted = [...keys].sort();
console.log(`\nUnique meta keys (${sorted.length}):`);
sorted.forEach(k => console.log(`  ${k}`));

// Sample a homes item with actual data (not draft placeholders)
const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);
const homeItems = items.filter(i => i.includes('<wp:post_type><![CDATA[homes]]>'));

// Find one with real content
let sample = null;
for (const item of homeItems) {
    const title = item.match(/<title><!\[CDATA\[([^\]]+)\]\]>/)?.[1] || '';
    const desc = item.match(/<wp:meta_key><!\[CDATA\[facility_description\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([^\]]+)\]\]>/)?.[1] || '';
    if (desc && desc.length > 50 && !title.startsWith('EWAB')) {
        sample = { title, item };
        break;
    }
}

if (sample) {
    console.log(`\n--- Sample home: ${sample.title} ---`);
    // Print all non-private meta
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(sample.item)) !== null) {
        const keyM = /<wp:meta_key><!\[CDATA\[([^\]]+)\]\]>/.exec(bm[1]);
        const valM = /<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]>/.exec(bm[1]);
        if (keyM && valM && !keyM[1].startsWith('_')) {
            const val = valM[1].trim();
            if (val) console.log(`  ${keyM[1]}: ${val.slice(0, 120)}`);
        }
    }
    // Categories
    const catRe = /<category\s+domain="([^"]+)"\s+nicename="([^"]+)"><!\[CDATA\[([^\]]*)\]\]>/g;
    while ((m = catRe.exec(sample.item)) !== null) {
        console.log(`  [category] domain=${m[1]} nicename=${m[2]} name=${m[3]}`);
    }
}
