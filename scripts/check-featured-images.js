'use strict';
// Check featured image (_thumbnail_id) coverage across all homes in XML
const fs = require('fs');
const xml = fs.readFileSync('wp-homes-export.xml', 'utf8');
const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);

function unwrap(raw) {
    const s = raw.trim();
    return s.startsWith('<![CDATA[') ? s.slice(9, s.lastIndexOf(']]>')).trim() : s;
}
function getTag(xml, tag) {
    const m = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
    return m ? unwrap(m[1]) : '';
}
function getMeta(xml, key) {
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

// Build attachment map
const attachMap = new Map();
for (const item of items) {
    if (getTag(item, 'wp:post_type') !== 'attachment') continue;
    const id = getTag(item, 'wp:post_id');
    const url = getTag(item, 'wp:attachment_url');
    if (id && url) attachMap.set(id, url);
}

let withFeatured = 0, withoutFeatured = 0;
for (const item of items) {
    if (getTag(item, 'wp:post_type') !== 'homes') continue;
    const slug = getTag(item, 'wp:post_name').trim();
    const thumbnailId = getMeta(item, '_thumbnail_id');
    const gallery1 = getMeta(item, 'gallery_image_1');
    if (thumbnailId && attachMap.has(thumbnailId)) {
        withFeatured++;
        if (thumbnailId !== gallery1)
            console.log(`${slug}: featured=${thumbnailId} gallery_1=${gallery1 || '(none)'}`);
    } else {
        withoutFeatured++;
    }
}
console.log(`\nWith featured image: ${withFeatured}  Without: ${withoutFeatured}`);
