'use strict';

/**
 * scripts/fix-field-duplicates.js
 *
 * Cleans up duplicate/misplaced room_field_definitions created by fix-migration-data.js:
 *
 * Fields to remap then delete (wrong slug/category — originals already existed):
 *   0b59c84f  "Night Stand with Lamp"      slug:night-stand-with-lamp  → 0a3e1764 slug:night-stand-lamp
 *   7d50ece2  "Private Patio/Deck/Balcony" slug:private-patio-deck-balcony → e1be9c9a slug:private-lanai (Private Lanai/Patio/Balcony)
 *   cc3f5db2  "Low/No Sodium or Sugar"     slug:low-no-sodium-or-sugar → c5fd821e slug:low-no-sodium-sugar (in Meals & Dining / location_details)
 *   a7e1be0c  "Ground Floor Units"         slug:ground-floor-units     → 6a61bd20 slug:ground-floor
 *
 * Field to move (category wrong):
 *   716c9f4f  "Bed Available" → move from Medical Services to Health Care Services (90e3b44c)
 *
 * Categories to delete (empty after field cleanup):
 *   17ed99c9  "Dining"             (room_details — wrong section; real one is Meals & Dining in location_details)
 *   d822cde6  "Facility Amenities" (empty — Meeting Room / TV Lounge are in Common Areas)
 *   c17d1f4e  "Medical Services"   (empty after moving Bed Available)
 *
 * Also: remove false/null boolean values from room_details.customFields on all facilities
 *
 * Run: node scripts/fix-field-duplicates.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OLD field ID → correct field ID
const FIELD_REMAPS = {
    '0b59c84f-543d-4e9b-a22f-5758e06ddc8a': '0a3e1764-e0a6-4946-83e7-eb0e575338f2', // Night Stand with Lamp
    '7d50ece2-9993-44b6-91c3-9e052e4386e2': 'e1be9c9a-9370-4a05-ba67-83c0e2001a36', // Private Lanai/Patio/Balcony
    'cc3f5db2-f607-4b52-b300-b3f4db6af29b': 'c5fd821e-25ac-494a-8615-b66622336209', // Low/No Sodium or Sugar
    'a7e1be0c-b34e-408a-8542-c3d24e2d6361': '6a61bd20-d934-4018-b094-841936e6871f', // Ground Floor Units
};

const FIELDS_TO_DELETE = Object.keys(FIELD_REMAPS);

const BED_AVAILABLE_ID    = '716c9f4f-def7-4264-8dce-d201f419c003';
const HEALTH_CARE_CAT_ID  = '90e3b44c-e0e0-4145-a8db-1466fda616c9'; // Health Care Services (location_details col 1)

const CATS_TO_DELETE = [
    '17ed99c9-7b0d-4cee-ac02-772ffc99ea33', // Dining (room_details — misplaced)
    'd822cde6-6c1f-4641-924d-6763e6b852ad', // Facility Amenities (empty)
    'c17d1f4e-84ca-4fee-ae62-c8b353e8d8e5', // Medical Services (will be empty after move)
];

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log(`Fix Field Duplicates${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log('='.repeat(60));

    // ── Step 1: Remap + strip falses in room_details.customFields ──────────────
    console.log('\n── Step 1: Remap room_details.customFields on all facilities');

    const { data: facilities } = await supabase
        .from('facilities')
        .select('id, title, room_details');

    let updatedFacs = 0;
    for (const fac of facilities) {
        const rd = fac.room_details;
        if (!rd || !rd.customFields) continue;

        const oldFields = rd.customFields;
        const newFields = {};
        let changed = false;

        for (const [fieldId, val] of Object.entries(oldFields)) {
            // Remap if it's one of the wrong IDs
            const targetId = FIELD_REMAPS[fieldId] || fieldId;
            if (targetId !== fieldId) changed = true;

            // Only keep truthy values (drop false/null/empty)
            if (val === false || val === null || val === undefined || val === '') {
                changed = true;
                continue;
            }
            // If remapped, don't overwrite if target already has a truthy value
            if (newFields[targetId] === undefined || newFields[targetId] === false) {
                newFields[targetId] = val;
            }
        }

        if (!changed) continue;

        const newRd = { ...rd, customFields: newFields };
        console.log(`  ${fac.title}: ${Object.keys(oldFields).length} → ${Object.keys(newFields).length} custom fields`);

        if (!DRY_RUN) {
            const { error } = await supabase
                .from('facilities')
                .update({ room_details: newRd })
                .eq('id', fac.id);
            if (error) throw new Error(`Failed to update ${fac.title}: ${error.message}`);
        }
        updatedFacs++;
    }
    console.log(`  Updated ${updatedFacs} facilities.`);

    // ── Step 2: Move Bed Available to Health Care Services ─────────────────────
    console.log('\n── Step 2: Move "Bed Available" to Health Care Services');

    if (!DRY_RUN) {
        const { error } = await supabase
            .from('room_field_definitions')
            .update({ category_id: HEALTH_CARE_CAT_ID })
            .eq('id', BED_AVAILABLE_ID);
        if (error) throw new Error(`Failed to move Bed Available: ${error.message}`);
        console.log('  Moved Bed Available → Health Care Services');
    } else {
        console.log('  [DRY RUN] Would move Bed Available → Health Care Services');
    }

    // ── Step 3: Delete duplicate/misplaced field definitions ──────────────────
    console.log('\n── Step 3: Delete duplicate/misplaced field definitions');

    for (const fieldId of FIELDS_TO_DELETE) {
        if (!DRY_RUN) {
            const { error } = await supabase
                .from('room_field_definitions')
                .delete()
                .eq('id', fieldId);
            if (error) throw new Error(`Failed to delete field ${fieldId}: ${error.message}`);
        }
        console.log(`  ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} field ${fieldId}`);
    }

    // ── Step 4: Delete empty/misplaced categories ──────────────────────────────
    console.log('\n── Step 4: Delete empty/misplaced categories');

    for (const catId of CATS_TO_DELETE) {
        // Verify empty before deleting
        const { data: remaining } = await supabase
            .from('room_field_definitions')
            .select('id')
            .eq('category_id', catId);

        if (remaining && remaining.length > 0) {
            console.log(`  Category ${catId} still has ${remaining.length} fields — skipping delete`);
            continue;
        }

        if (!DRY_RUN) {
            const { error } = await supabase
                .from('room_field_categories')
                .delete()
                .eq('id', catId);
            if (error) throw new Error(`Failed to delete category ${catId}: ${error.message}`);
        }
        console.log(`  ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} category ${catId}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Done.');
    console.log('='.repeat(60) + '\n');
}

main().catch(err => { console.error('\nFATAL:', err.message || err); process.exit(1); });
