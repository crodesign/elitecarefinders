'use strict';

/**
 * scripts/fix-facility-folders.js
 *
 * Moves migrated facility media folders into the correct hierarchy
 * that FacilityForm.tsx expects from ensureLocationFolders():
 *
 *   {state} (root) → Facility Images → {city} → {facility title}
 *
 * The initial migration created flat folders:
 *   Facility Images (root) → {facility title}
 *
 * Run: node scripts/fix-facility-folders.js [--dry-run]
 */

const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map facility slug → corrected address data
// Some WP addresses had the city embedded in the street (no comma separation),
// or state abbreviation was inconsistent ("Hi" instead of "HI").
const ADDRESS_OVERRIDES = {
    'manoa-cottage-kaimuki':               { city: 'Honolulu', state: 'HI' },
    'hale-o-meleana-liliha':               { city: 'Honolulu', state: 'HI' },
    'kalakaua-gardens':                    { city: 'Honolulu', state: 'HI' },
    'hawaii-kai-retirement-community':     { city: 'Honolulu', state: 'HI' }, // Fix "Hi" → "HI"
    'belmont-village':                     { city: '',         state: '' },   // Texas, no city/state in export
};

// Facilities to process (slugs from the migration)
const FACILITY_SLUGS = [
    'belmont-village',
    'ilima-at-leihano-kapolei',
    'hawaii-kai-retirement-community',
    'manoa-cottage-kaimuki',
    'hale-o-meleana-liliha',
    'testing-gallery-function',
    'the-plaza-at-waikiki',
    'the-plaza-at-kaneohe',
    'the-plaza-at-pearl-city',
    'the-plaza-at-moanalua',
    'the-plaza-at-punchbowl',
    'the-plaza-at-mililani',
    'kalakaua-gardens',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findFolder(name, parentId) {
    let q = supabase.from('media_folders').select('id, name, path').eq('name', name);
    if (parentId) q = q.eq('parent_id', parentId);
    else          q = q.is('parent_id', null);
    const { data } = await q.limit(1).maybeSingle();
    return data || null;
}

async function createFolder(name, parentId, parentPath) {
    if (DRY_RUN) {
        const fakePath = `${parentPath}/${name}`;
        console.log(`    [DRY RUN] Would create folder: "${name}" under parent ${parentId || 'root'}`);
        return { id: `dry-${name.toLowerCase().replace(/\s+/g, '-')}`, path: fakePath };
    }
    const folderPath = parentPath ? `${parentPath}/${name}` : `/${name}`;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await supabase
        .from('media_folders')
        .insert({ name, slug, parent_id: parentId, path: folderPath })
        .select('id, path')
        .single();
    if (error) throw new Error(`Failed to create folder "${name}": ${error.message}`);
    console.log(`    Created folder: "${name}" → ${folderPath}`);
    return data;
}

async function findOrCreate(name, parentId, parentPath) {
    const existing = await findFolder(name, parentId);
    if (existing) return existing;
    return createFolder(name, parentId, parentPath);
}

async function moveFolder(folderId, newParentId, newName, newParentPath) {
    const newPath = `${newParentPath}/${newName}`;
    const newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (DRY_RUN) {
        console.log(`    [DRY RUN] Would move folder ${folderId} to "${newPath}"`);
        return;
    }
    const { error } = await supabase
        .from('media_folders')
        .update({ parent_id: newParentId, name: newName, slug: newSlug, path: newPath })
        .eq('id', folderId);
    if (error) throw new Error(`Failed to move folder: ${error.message}`);
    console.log(`    Moved folder to: ${newPath}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Fix Facility Folders${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get the old Facility Images root folder (created by migration)
    const oldRoot = await findFolder('Facility Images', null);
    if (!oldRoot) {
        console.log('No "Facility Images" root folder found. Nothing to fix.');
        return;
    }
    console.log(`Old Facility Images root: ${oldRoot.id}`);

    let moved = 0;
    let skipped = 0;

    for (const slug of FACILITY_SLUGS) {
        // Get facility from DB
        const { data: facility } = await supabase
            .from('facilities')
            .select('id, title, slug, address')
            .eq('slug', slug)
            .maybeSingle();

        if (!facility) {
            console.log(`\n  Facility not found: ${slug}, skipping.`);
            skipped++;
            continue;
        }

        // Apply address overrides or use stored address
        const override = ADDRESS_OVERRIDES[slug];
        const rawState = override !== undefined ? override.state : (facility.address?.state || '');
        const rawCity  = override !== undefined ? override.city  : (facility.address?.city  || '');
        const title    = facility.title;

        console.log(`\n  ${title}`);
        console.log(`    state="${rawState}"  city="${rawCity}"`);

        // Find the current folder (should be direct child of old Facility Images root)
        const currentFolder = await findFolder(title, oldRoot.id);
        if (!currentFolder) {
            console.log(`    No folder found under old root, skipping.`);
            skipped++;
            continue;
        }
        console.log(`    Current folder: ${currentFolder.id} (${currentFolder.path})`);

        if (!rawState && !rawCity) {
            console.log(`    No state/city — cannot determine target hierarchy. Leaving in place.`);
            skipped++;
            continue;
        }

        // Build hierarchy: {state} → Facility Images → {city} → {title}
        // Step 1: state root folder
        const stateFolder = await findOrCreate(rawState, null, '');
        console.log(`    State folder: "${rawState}" (${stateFolder.id})`);

        // Step 2: "Facility Images" under state
        const typeFolder = await findOrCreate('Facility Images', stateFolder.id, stateFolder.path);
        console.log(`    Type folder: "Facility Images" (${typeFolder.id})`);

        let parentId = typeFolder.id;
        let parentPath = typeFolder.path;

        // Step 3: city folder (if city is present)
        if (rawCity) {
            const cityFolder = await findOrCreate(rawCity, typeFolder.id, typeFolder.path);
            console.log(`    City folder: "${rawCity}" (${cityFolder.id})`);
            parentId = cityFolder.id;
            parentPath = cityFolder.path;
        }

        // Step 4: Check if the folder already is in the right place
        if (currentFolder.path === `${parentPath}/${title}`) {
            console.log(`    Already in correct location.`);
            skipped++;
            continue;
        }

        // Step 5: Move the existing folder
        await moveFolder(currentFolder.id, parentId, title, parentPath);
        moved++;
    }

    // Also fix address data in the DB for facilities with overridden addresses
    if (!DRY_RUN) {
        console.log('\n--- Fixing address data for facilities with parsing issues ---');
        const addressFixes = [
            { slug: 'manoa-cottage-kaimuki', city: 'Honolulu', state: 'HI', street: '748 Olokele Avenue', zip: '96816' },
            { slug: 'hale-o-meleana-liliha',  city: 'Honolulu', state: 'HI', street: '2230 Liliha Street',  zip: '96817' },
            { slug: 'kalakaua-gardens',        city: 'Honolulu', state: 'HI', street: '1723 Kalakaua Avenue', zip: '' },
            { slug: 'hawaii-kai-retirement-community', state: 'HI' }, // Fix "Hi" → "HI"
        ];
        for (const fix of addressFixes) {
            const { data: fac } = await supabase.from('facilities').select('address').eq('slug', fix.slug).maybeSingle();
            if (!fac) { console.log(`  ${fix.slug}: not found`); continue; }
            const newAddress = { ...fac.address, ...fix };
            delete newAddress.slug; // slug is not part of address
            const { error } = await supabase.from('facilities').update({ address: newAddress }).eq('slug', fix.slug);
            if (error) console.error(`  ${fix.slug}: address update failed: ${error.message}`);
            else       console.log(`  ${fix.slug}: address updated`);
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Done. Moved: ${moved}, Skipped: ${skipped}`);
    console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('\nFATAL:', err.message || err); process.exit(1); });
