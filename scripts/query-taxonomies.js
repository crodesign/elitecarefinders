'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    // All taxonomies
    const { data: taxs } = await supabase
        .from('taxonomies')
        .select('id, type, name, slug, content_types')
        .order('name');

    console.log('\n=== Taxonomies ===');
    for (const t of taxs) {
        console.log(`  [${t.slug}] "${t.name}" id=${t.id} content_types=${JSON.stringify(t.content_types)}`);
    }

    // All taxonomy entries grouped by taxonomy
    const { data: entries } = await supabase
        .from('taxonomy_entries')
        .select('id, taxonomy_id, name, slug, parent_id')
        .order('name');

    console.log('\n=== Taxonomy Entries ===');
    const byTax = {};
    for (const e of entries) {
        if (!byTax[e.taxonomy_id]) byTax[e.taxonomy_id] = [];
        byTax[e.taxonomy_id].push(e);
    }
    for (const t of taxs) {
        const list = byTax[t.id] || [];
        if (!list.length) continue;
        console.log(`\n  [${t.slug}] ${t.name}:`);
        for (const e of list) {
            console.log(`    ${e.name} (slug: ${e.slug}, id: ${e.id}, parent: ${e.parent_id || 'none'})`);
        }
    }

    // Media folders relevant to homes
    const { data: folders } = await supabase
        .from('media_folders')
        .select('id, name, slug, parent_id, path')
        .order('name');

    console.log('\n=== Media Folders ===');
    for (const f of folders) {
        console.log(`  [${f.slug}] "${f.name}" id=${f.id} path=${f.path}`);
    }
}

main().catch(e => { console.error(e.message); process.exit(1); });
