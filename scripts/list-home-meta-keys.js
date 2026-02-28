'use strict';
const fs = require('fs');
const xml = fs.readFileSync('wp-homes-export.xml', 'utf8');
const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);
const keys = new Map();
for (const item of items) {
    if (!item.includes('<wp:post_type><![CDATA[homes]]>')) continue;
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(item)) !== null) {
        const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(bm[1]);
        const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(bm[1]);
        if (!keyM || !valM) continue;
        const k = keyM[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const v = valM[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        if (!k || k.startsWith('_')) continue;
        if (!keys.has(k)) keys.set(k, v);
    }
}
for (const [k, v] of [...keys].sort()) {
    console.log(k + ' = ' + v.substring(0, 100).replace(/\n/g, ' '));
}
