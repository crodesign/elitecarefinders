const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function main() {
    const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
    const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
    const supabase = createClient(url, key);

    // Find the Facility Type taxonomy
    const { data: taxonomies, error: fetchErr } = await supabase
        .from('taxonomies')
        .select('id, name, type, content_types')
        .ilike('name', '%facility%');

    if (fetchErr) { console.error(fetchErr); process.exit(1); }
    console.log('Found:', taxonomies);

    for (const t of taxonomies) {
        if (!t.content_types) continue;
        const fixed = t.content_types.map(ct => ct === 'facility' ? 'facilities' : ct);
        if (JSON.stringify(fixed) === JSON.stringify(t.content_types)) { console.log(`${t.name}: no change needed`); continue; }

        const { error: updateErr } = await supabase
            .from('taxonomies')
            .update({ content_types: fixed })
            .eq('id', t.id);

        if (updateErr) console.error(`Error updating ${t.name}:`, updateErr);
        else console.log(`Fixed ${t.name}: ${JSON.stringify(t.content_types)} → ${JSON.stringify(fixed)}`);
    }
}

main();
