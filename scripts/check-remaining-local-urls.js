const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const R2 = process.env.R2_PUBLIC_URL;

async function checkArrayCol(table, col) {
    const { data } = await supabase.from(table).select(`id, ${col}`).not(col, 'is', null);
    let local = 0;
    const samples = [];
    for (const row of (data || [])) {
        const arr = row[col];
        if (!Array.isArray(arr)) continue;
        for (const url of arr) {
            if (url && url.startsWith('/images/media/')) {
                local++;
                if (samples.length < 3) samples.push(url);
            }
        }
    }
    if (local > 0) console.log(`${table}.${col}: ${local} local URLs`, samples);
    else console.log(`${table}.${col}: OK`);
}

async function checkMetadataImages(table) {
    const { data } = await supabase.from(table).select('id, metadata').not('metadata', 'is', null);
    let local = 0;
    const samples = [];
    for (const row of (data || [])) {
        const meta = row.metadata;
        if (!meta || typeof meta !== 'object') continue;
        // Check all string values recursively
        const check = (obj) => {
            if (typeof obj === 'string' && obj.startsWith('/images/media/')) {
                local++;
                if (samples.length < 3) samples.push(obj);
            } else if (Array.isArray(obj)) {
                obj.forEach(check);
            } else if (obj && typeof obj === 'object') {
                Object.values(obj).forEach(check);
            }
        };
        check(meta);
    }
    if (local > 0) console.log(`${table}.metadata: ${local} local URLs`, samples);
    else console.log(`${table}.metadata: OK`);
}

async function main() {
    await checkArrayCol('homes', 'images');
    await checkArrayCol('homes', 'team_images');
    await checkArrayCol('homes', 'cuisine_images');
    await checkArrayCol('facilities', 'images');
    await checkArrayCol('facilities', 'team_images');
    await checkArrayCol('facilities', 'cuisine_images');
    await checkArrayCol('posts', 'images');
    await checkMetadataImages('posts');
    await checkMetadataImages('homes');
    await checkMetadataImages('facilities');
}
main().catch(console.error);
