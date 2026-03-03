'use strict';

/**
 * scripts/backfill-wp-dates.js
 *
 * Backfills created_at and updated_at on homes and facilities from the
 * WordPress XML export (wp:post_date_gmt → created_at, wp:post_modified_gmt → updated_at).
 *
 * Usage:
 *   node scripts/backfill-wp-dates.js            # update via Supabase JS client
 *   node scripts/backfill-wp-dates.js --dry-run  # preview only, no DB writes
 *   node scripts/backfill-wp-dates.js --sql       # generate backfill-wp-dates.sql for Supabase dashboard
 *
 * Use --sql if the DB has an updated_at trigger (it does), then paste the SQL file
 * into the Supabase dashboard SQL editor to bypass the trigger.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const SQL_MODE = process.argv.includes('--sql');

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = DRY_RUN ? null : createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey
);

function unwrapCdata(raw) {
    const s = raw.trim();
    if (s.startsWith('<![CDATA[')) return s.slice(9, s.lastIndexOf(']]>')).trim();
    return s;
}

function getTag(xml, tag) {
    const re = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = re.exec(xml);
    return m ? unwrapCdata(m[1]) : '';
}

// Convert WP date "YYYY-MM-DD HH:MM:SS" → ISO 8601 UTC string
function wpDateToIso(wpDate) {
    if (!wpDate || wpDate === '0000-00-00 00:00:00') return null;
    return wpDate.replace(' ', 'T') + 'Z';
}

function extractDates(xml, postType) {
    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);
    const results = [];
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== postType) continue;
        const slug = getTag(item, 'wp:post_name').trim();
        if (!slug) continue;
        const createdAt = wpDateToIso(getTag(item, 'wp:post_date_gmt'));
        const updatedAt = wpDateToIso(getTag(item, 'wp:post_modified_gmt'));
        if (createdAt || updatedAt) results.push({ slug, createdAt, updatedAt });
    }
    return results;
}

async function backfillTable(table, records) {
    console.log(`\n--- ${table} (${records.length} records) ---`);
    let updated = 0, skipped = 0, notFound = 0;

    for (const { slug, createdAt, updatedAt } of records) {
        const updates = {};
        if (createdAt) updates.created_at = createdAt;
        if (updatedAt) updates.updated_at = updatedAt;

        if (Object.keys(updates).length === 0) { skipped++; continue; }

        if (DRY_RUN) {
            console.log(`  [dry] ${slug}: created=${createdAt} updated=${updatedAt}`);
            updated++;
            continue;
        }

        const { data, error } = await supabase
            .from(table)
            .update(updates)
            .eq('slug', slug)
            .select('id')
            .maybeSingle();

        if (error) {
            console.error(`  ERROR ${slug}: ${error.message}`);
        } else if (!data) {
            console.log(`  NOT FOUND: ${slug}`);
            notFound++;
        } else {
            updated++;
        }
    }

    console.log(`  Updated: ${updated}  Skipped (no dates): ${skipped}  Not found: ${notFound}`);
}

function generateSql(homeRecords, facilityRecords) {
    const esc = s => s.replace(/'/g, "''");
    const lines = [
        '-- Backfill WordPress original dates (bypasses updated_at trigger)',
        '-- Run in Supabase dashboard SQL editor',
        '',
        'ALTER TABLE homes DISABLE TRIGGER USER;',
        'ALTER TABLE facilities DISABLE TRIGGER USER;',
        '',
        '-- Homes',
    ];
    for (const { slug, createdAt, updatedAt } of homeRecords) {
        if (!createdAt && !updatedAt) continue;
        const sets = [];
        if (createdAt) sets.push(`created_at = '${createdAt}'`);
        if (updatedAt) sets.push(`updated_at = '${updatedAt}'`);
        lines.push(`UPDATE homes SET ${sets.join(', ')} WHERE slug = '${esc(slug)}';`);
    }
    lines.push('', '-- Facilities');
    for (const { slug, createdAt, updatedAt } of facilityRecords) {
        if (!createdAt && !updatedAt) continue;
        const sets = [];
        if (createdAt) sets.push(`created_at = '${createdAt}'`);
        if (updatedAt) sets.push(`updated_at = '${updatedAt}'`);
        lines.push(`UPDATE facilities SET ${sets.join(', ')} WHERE slug = '${esc(slug)}';`);
    }
    lines.push('', 'ALTER TABLE homes ENABLE TRIGGER USER;', 'ALTER TABLE facilities ENABLE TRIGGER USER;', '');
    return lines.join('\n');
}

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`WP Date Backfill${DRY_RUN ? ' [DRY RUN]' : SQL_MODE ? ' [SQL]' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    if (!DRY_RUN && !SQL_MODE && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseKey)) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local');
    }
    if (!DRY_RUN && !SQL_MODE) {
        console.log(`Using ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role key' : 'anon key (RLS applies)'}`);
    }

    const homesXml = fs.readFileSync(path.resolve(process.cwd(), 'wp-homes-export.xml'), 'utf8');
    const facilitiesXml = fs.readFileSync(path.resolve(process.cwd(), 'wp-facilities-export.xml'), 'utf8');

    const homeRecords = extractDates(homesXml, 'homes');
    const facilityRecords = extractDates(facilitiesXml, 'facilities');

    console.log(`Homes with dates: ${homeRecords.length}`);
    console.log(`Facilities with dates: ${facilityRecords.length}`);

    if (SQL_MODE) {
        const sql = generateSql(homeRecords, facilityRecords);
        const outPath = path.resolve(process.cwd(), 'backfill-wp-dates.sql');
        fs.writeFileSync(outPath, sql, 'utf8');
        console.log(`\nSQL written to: ${outPath}`);
        console.log('Paste this file into the Supabase dashboard SQL editor to bypass the updated_at trigger.');
        return;
    }

    await backfillTable('homes', homeRecords);
    await backfillTable('facilities', facilityRecords);

    console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
