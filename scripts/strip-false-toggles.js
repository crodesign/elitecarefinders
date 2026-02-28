'use strict';
/**
 * strip-false-toggles.js
 *
 * Removes all explicit `false` values from room_details.customFields on homes.
 * Boolean toggle fields should only store `true` (YES) or be absent (unset).
 *
 * Usage:
 *   node scripts/strip-false-toggles.js           # live run
 *   node scripts/strip-false-toggles.js --dry-run
 */

const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log(`Strip False Toggles${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

    const { data: homes, error } = await supabase
        .from('homes')
        .select('id, slug, room_details');

    if (error) throw new Error(error.message);

    let updated = 0, skipped = 0, errors = 0;

    for (const home of homes || []) {
        const cf = home.room_details?.customFields || {};
        const falseKeys = Object.keys(cf).filter(k => cf[k] === false);

        if (!falseKeys.length) { skipped++; continue; }

        const newCf = { ...cf };
        for (const k of falseKeys) delete newCf[k];
        const newRoomDetails = { ...home.room_details, customFields: newCf };

        console.log(`  ${home.slug}: removing ${falseKeys.length} false key(s)`);

        if (DRY_RUN) { updated++; continue; }

        const { error: updateErr } = await supabase
            .from('homes')
            .update({ room_details: newRoomDetails })
            .eq('id', home.id);

        if (updateErr) {
            console.error(`    ERROR: ${updateErr.message}`);
            errors++;
        } else {
            updated++;
        }
    }

    console.log(`\nDone`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors:  ${errors}`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
