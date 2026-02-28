'use strict';
const fs = require('fs');

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/inspect-home.js <slug>'); process.exit(1); }

const xml = fs.readFileSync('wp-homes-export.xml', 'utf8');
const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);

for (const item of items) {
    if (!item.includes('<wp:post_type><![CDATA[homes]]>')) continue;
    const nameM = item.match(/<wp:post_name>([\s\S]*?)<\/wp:post_name>/);
    const itemSlug = nameM ? nameM[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    if (itemSlug !== slug) continue;

    console.log('=== META (non-private, non-empty) ===');
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(item)) !== null) {
        const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(bm[1]);
        const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(bm[1]);
        if (!keyM || !valM) continue;
        const k = keyM[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const v = valM[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        if (!k || k.startsWith('_') || !v) continue;
        console.log(`  ${k} = ${v.substring(0, 120).replace(/\n/g, ' ')}`);
    }

    console.log('\n=== CATEGORIES ===');
    const catRe = /<category\s+domain="([^"]+)"\s+nicename="([^"]+)"><!\[CDATA\[([^\]]*)\]\]><\/category>/g;
    let cm;
    while ((cm = catRe.exec(item)) !== null) {
        console.log(`  domain=${cm[1]} nicename=${cm[2]} name=${cm[3]}`);
    }
    break;
}
