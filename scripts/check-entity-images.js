const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const R2 = process.env.R2_PUBLIC_URL;

async function checkTable(table, imageCol) {
    const { data, count } = await supabase
        .from(table)
        .select(`id, ${imageCol}`, { count: 'exact' })
        .not(imageCol, 'is', null);

    let r2 = 0, local = 0, empty = 0, other = 0;
    const localSamples = [];

    for (const row of (data || [])) {
        const imgs = row[imageCol];
        if (!imgs || imgs.length === 0) { empty++; continue; }
        const first = imgs[0];
        if (!first) { empty++; continue; }
        if (first.startsWith(R2)) r2++;
        else if (first.startsWith('/images/media/')) {
            local++;
            if (localSamples.length < 3) localSamples.push(first);
        }
        else other++;
    }

    console.log(`${table}.${imageCol} (${count} rows with data):`);
    console.log(`  R2:    ${r2}`);
    console.log(`  Local: ${local}`);
    console.log(`  Empty: ${empty}`);
    console.log(`  Other: ${other}`);
    if (localSamples.length) console.log(`  Sample local:`, localSamples);
    console.log();
}

async function main() {
    await checkTable('homes', 'images');
    await checkTable('facilities', 'images');
    await checkTable('posts', 'images');
}
main().catch(console.error);
