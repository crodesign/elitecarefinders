'use strict';

/**
 * scripts/remove-unauthorized-fields.js
 *
 * Removes fields that were added without authorization during the WP migration:
 *   - Bed Available field (716c9f4f) — field definition + from all facility customFields
 *   - Pay Method field (241e1424) — field definition + from all facility customFields
 *   - Payment category (ef5879d3) — empty after above removals
 *
 * Also removes duplicate fixed field options added to bedroom/shower/roomType/language:
 *   bedroom:   Private Bedroom → dup of "Private"; Shared Bedroom → dup of "Shared Bedroom" (check)
 *   shower:    Wheel-In Shower → dup of "Wheel-in Shower"; Tub/Shower Combo → dup of "Bathtub/Shower Combo"
 *   roomType:  One Bedroom → dup of "1 Bedroom"; Two Bedroom → dup of "2 Bedroom"
 *   language:  Filipino/Tagalog → dup of "Tagalog/Pilipino"
 *
 * Run: node scripts/remove-unauthorized-fields.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FIELD_IDS_TO_REMOVE = [
    '716c9f4f-def7-4264-8dce-d201f419c003', // Bed Available
    '241e1424-e960-47d6-b621-28cbf6e256a2', // Pay Method
];

const PAYMENT_CATEGORY_ID = 'ef5879d3-45b4-4fcd-984d-2a56962f9d9b'; // Payment category

// Semantic duplicates to remove explicitly (in addition to case-insensitive exact dups)
// Format: { field_type, value } — value must match exactly what's stored
const EXPLICIT_OPTION_REMOVALS = [
    { field_type: 'bedroom',  value: 'Private Bedroom' }, // semantic dup of "Private"
    { field_type: 'roomType', value: 'One Bedroom' },     // semantic dup of "1 Bedroom"
    { field_type: 'roomType', value: 'Two Bedroom' },     // semantic dup of "2 Bedroom"
    { field_type: 'shower',   value: 'Tub/Shower Combo' }, // semantic dup of "Bathtub/Shower Combo"
];

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log(`Remove Unauthorized Fields${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log('='.repeat(60));

    // ── Step 1: Confirm what field IDs exist ──────────────────────────────────
    console.log('\n── Step 1: Check which field/category IDs exist in DB');

    const { data: existingFields } = await supabase
        .from('room_field_definitions')
        .select('id, name, slug')
        .in('id', FIELD_IDS_TO_REMOVE);

    console.log(`  Found ${existingFields?.length || 0} field(s) to remove:`);
    (existingFields || []).forEach(f => console.log(`    ${f.id}  "${f.name}" (slug: ${f.slug})`));

    const { data: existingCat } = await supabase
        .from('room_field_categories')
        .select('id, name')
        .eq('id', PAYMENT_CATEGORY_ID)
        .maybeSingle();

    if (existingCat) {
        console.log(`  Payment category found: "${existingCat.name}" (${existingCat.id})`);
    } else {
        console.log(`  Payment category not found — already deleted or ID differs`);
    }

    // ── Step 2: Strip removed field IDs from all facility room_details ─────────
    console.log('\n── Step 2: Strip unauthorized field IDs from facility customFields');

    const { data: facilities } = await supabase
        .from('facilities')
        .select('id, title, room_details');

    let updatedFacs = 0;
    for (const fac of (facilities || [])) {
        const rd = fac.room_details;
        if (!rd || !rd.customFields) continue;

        const removedKeys = FIELD_IDS_TO_REMOVE.filter(id => id in rd.customFields);
        if (removedKeys.length === 0) continue;

        const newCustomFields = { ...rd.customFields };
        removedKeys.forEach(id => delete newCustomFields[id]);

        console.log(`  ${fac.title}: removing ${removedKeys.length} field(s) from customFields`);

        if (!DRY_RUN) {
            const { error } = await supabase
                .from('facilities')
                .update({ room_details: { ...rd, customFields: newCustomFields } })
                .eq('id', fac.id);
            if (error) throw new Error(`Failed to update ${fac.title}: ${error.message}`);
        }
        updatedFacs++;
    }
    console.log(`  Updated ${updatedFacs} facilit${updatedFacs === 1 ? 'y' : 'ies'}.`);

    // ── Step 3: Delete field definitions ──────────────────────────────────────
    console.log('\n── Step 3: Delete unauthorized field definitions');

    for (const fieldId of FIELD_IDS_TO_REMOVE) {
        if (!existingFields?.some(f => f.id === fieldId)) {
            console.log(`  Field ${fieldId} not found — skipping`);
            continue;
        }
        if (!DRY_RUN) {
            const { error } = await supabase
                .from('room_field_definitions')
                .delete()
                .eq('id', fieldId);
            if (error) throw new Error(`Failed to delete field ${fieldId}: ${error.message}`);
        }
        console.log(`  ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} field ${fieldId}`);
    }

    // ── Step 4: Delete Payment category ───────────────────────────────────────
    console.log('\n── Step 4: Delete Payment category');

    if (!existingCat) {
        console.log('  Category not found — skipping');
    } else {
        // Verify it's empty
        const { data: remaining } = await supabase
            .from('room_field_definitions')
            .select('id')
            .eq('category_id', PAYMENT_CATEGORY_ID);

        if (remaining && remaining.length > 0) {
            console.log(`  Category still has ${remaining.length} field(s) — skipping delete`);
        } else {
            if (!DRY_RUN) {
                const { error } = await supabase
                    .from('room_field_categories')
                    .delete()
                    .eq('id', PAYMENT_CATEGORY_ID);
                if (error) throw new Error(`Failed to delete category: ${error.message}`);
            }
            console.log(`  ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} Payment category`);
        }
    }

    // ── Step 5: Remove explicit semantic duplicates ───────────────────────────
    console.log('\n── Step 5a: Remove explicit semantic duplicate options');

    for (const { field_type, value } of EXPLICIT_OPTION_REMOVALS) {
        const { data: found } = await supabase
            .from('room_fixed_field_options')
            .select('id, value')
            .eq('field_type', field_type)
            .eq('value', value);

        if (!found || found.length === 0) {
            console.log(`  "${value}" (${field_type}) — not found, skipping`);
            continue;
        }
        for (const opt of found) {
            if (!DRY_RUN) {
                const { error } = await supabase
                    .from('room_fixed_field_options')
                    .delete()
                    .eq('id', opt.id);
                if (error) throw new Error(`Failed to delete option ${opt.id}: ${error.message}`);
            }
            console.log(`  ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} "${value}" (${field_type}) — ${opt.id}`);
        }
    }

    // ── Step 5b: Auto-detect and remove case-insensitive exact duplicates ─────
    console.log('\n── Step 5b: Auto-detect case-insensitive duplicate options');

    const { data: allOptions } = await supabase
        .from('room_fixed_field_options')
        .select('id, field_type, value, display_order, is_active')
        .order('field_type')
        .order('display_order');

    if (!allOptions) {
        console.log('  No options found');
    } else {
        // Group by field_type for display
        const byType = {};
        for (const opt of allOptions) {
            if (!byType[opt.field_type]) byType[opt.field_type] = [];
            byType[opt.field_type].push(opt);
        }

        console.log('\n  Current options by type:');
        for (const [type, opts] of Object.entries(byType)) {
            console.log(`    ${type}: ${opts.map(o => `"${o.value}" (${o.id.slice(0, 8)})`).join(', ')}`);
        }

        // Known duplicate pairs (value added by migration → canonical existing value)
        // Key: duplicate value string (case-insensitive match against existing)
        // We identify duplicates by exact value string match (case-insensitive)
        const duplicatesToRemove = [];

        for (const [type, opts] of Object.entries(byType)) {
            // Find case-insensitive duplicates (keep the one with lower display_order)
            const seen = new Map(); // lowercase value → first seen
            for (const opt of opts.sort((a, b) => a.display_order - b.display_order)) {
                const key = `${type}:${opt.value.toLowerCase().trim()}`;
                if (seen.has(key)) {
                    // This is a duplicate — remove the later one
                    duplicatesToRemove.push(opt.id);
                    const orig = seen.get(key);
                    console.log(`\n  DUPLICATE found in ${type}: "${opt.value}" (${opt.id.slice(0, 8)}) duplicates "${orig.value}" (${orig.id.slice(0, 8)})`);
                } else {
                    seen.set(key, opt);
                }
            }
        }

        console.log(`\n  ${duplicatesToRemove.length} duplicate(s) to remove`);

        for (const id of duplicatesToRemove) {
            if (!DRY_RUN) {
                const { error } = await supabase
                    .from('room_fixed_field_options')
                    .delete()
                    .eq('id', id);
                if (error) throw new Error(`Failed to delete option ${id}: ${error.message}`);
            }
            console.log(`  ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} option ${id}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Done.');
    console.log('='.repeat(60) + '\n');
}

main().catch(err => { console.error('\nFATAL:', err.message || err); process.exit(1); });
