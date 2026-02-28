'use strict';
/**
 * Cleanup script for the bad homes migration run.
 * Deletes the 20 incorrectly inserted homes, the duplicate
 * 'facility-types' taxonomy (slug with plural, content_types=['home']),
 * and the 'neighborhoods' taxonomy created during migration.
 *
 * Run: node scripts/cleanup-homes-migration.js
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// These are the 20 home slugs inserted in the bad run
const BAD_HOME_SLUGS = [
    'ewab-1005','ewab-1006','ewab-1007','ewab-1009','ewab-1016','ewab-1019',
    'klhi-1002','klhi-1003','wphu-1004','wphu-1013','wphu-1014','pcty-1001',
    'pcty-1002','wphu-1019','aina-1001-02','wphu-gemma-alvia','slake-1005-2',
    'klhi-1017','kple-1006','ewab-1031',
];

// The duplicate taxonomy IDs created during the bad run
const BAD_TAXONOMY_IDS = [
    'd9f6f3de-fc2a-4d19-8720-bd9974f70a9c', // facility-types (plural, content_types=['home'])
    'f70ea023-0fdd-4617-9032-40954af5212e', // neighborhoods
];

async function main() {
    console.log('=== Cleanup: bad homes migration ===\n');

    // 1. Delete homes
    const { data: deleted, error: homeErr } = await supabase
        .from('homes')
        .delete()
        .in('slug', BAD_HOME_SLUGS)
        .select('id, slug');

    if (homeErr) {
        console.error('Error deleting homes:', homeErr.message);
    } else {
        console.log(`Deleted ${deleted.length} homes:`);
        deleted.forEach(h => console.log(`  ${h.slug} (${h.id})`));
    }

    // 2. Delete taxonomy entries for bad taxonomies
    const { data: deletedEntries, error: entryErr } = await supabase
        .from('taxonomy_entries')
        .delete()
        .in('taxonomy_id', BAD_TAXONOMY_IDS)
        .select('id, name');

    if (entryErr) {
        console.error('Error deleting taxonomy entries:', entryErr.message);
    } else {
        console.log(`\nDeleted ${deletedEntries.length} taxonomy entries:`);
        deletedEntries.forEach(e => console.log(`  ${e.name} (${e.id})`));
    }

    // 3. Delete bad taxonomies
    const { data: deletedTaxs, error: taxErr } = await supabase
        .from('taxonomies')
        .delete()
        .in('id', BAD_TAXONOMY_IDS)
        .select('id, name, slug');

    if (taxErr) {
        console.error('Error deleting taxonomies:', taxErr.message);
    } else {
        console.log(`\nDeleted ${deletedTaxs.length} taxonomies:`);
        deletedTaxs.forEach(t => console.log(`  [${t.slug}] ${t.name} (${t.id})`));
    }

    // 4. Delete the media folders created (by slug, under parent 'home-images')
    const { data: rootFolder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('slug', 'home-images')
        .is('parent_id', null)
        .maybeSingle();

    if (rootFolder) {
        const folderSlugs = BAD_HOME_SLUGS.map(s => s); // same slugs
        const { data: deletedFolders, error: folderErr } = await supabase
            .from('media_folders')
            .delete()
            .in('slug', folderSlugs)
            .eq('parent_id', rootFolder.id)
            .select('id, name');

        if (folderErr) {
            console.error('Error deleting media folders:', folderErr.message);
        } else {
            console.log(`\nDeleted ${deletedFolders.length} media folders`);
        }

        // Delete the root Home Images folder too
        const { error: rootErr } = await supabase
            .from('media_folders')
            .delete()
            .eq('id', rootFolder.id);
        if (rootErr) console.error('Error deleting root folder:', rootErr.message);
        else console.log('Deleted root "Home Images" folder');
    }

    console.log('\n=== Cleanup complete ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
