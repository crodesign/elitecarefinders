'use strict';
const fs = require('fs');

const xml = fs.readFileSync('wp-homes-export.xml', 'utf8');
const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);

const facilityTypes = new Map(); // nicename → name
const neighborhoods = new Map();

for (const item of items) {
    if (!item.includes('<wp:post_type><![CDATA[homes]]>')) continue;
    const catRe = /<category\s+domain="([^"]+)"\s+nicename="([^"]+)"><!\[CDATA\[([^\]]*)\]\]>/g;
    let m;
    while ((m = catRe.exec(item)) !== null) {
        if (m[1] === 'facility_types') facilityTypes.set(m[2], m[3]);
        if (m[1] === 'neighborhood') neighborhoods.set(m[2], m[3]);
    }
}

console.log('facility_types domain values:');
for (const [slug, name] of [...facilityTypes].sort()) console.log(`  "${slug}" → "${name}"`);

console.log('\nneighborhood domain values:');
for (const [slug, name] of [...neighborhoods].sort()) console.log(`  "${slug}" → "${name}"`);
