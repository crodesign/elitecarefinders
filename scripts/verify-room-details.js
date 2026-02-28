'use strict';
/**
 * verify-room-details.js
 *
 * Deep comparison of WordPress XML vs Supabase DB for every home's room_details.
 * Re-runs the same field-mapping logic as migrate-wp-homes.js and reports every
 * discrepancy. With --fix it writes corrections to the DB.
 *
 * Checks:
 *   - Boolean toggles (set when should be absent, absent when should be set)
 *   - Text / single-select fields (wrong value)
 *   - Multi-select arrays (food types, skills, languages, pets)
 *   - Top-level scalars: bedroomType, bathroomType, showerType
 *
 * Usage:
 *   node scripts/verify-room-details.js           # report only
 *   node scripts/verify-room-details.js --fix     # report + update DB
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const FIX = process.argv.includes('--fix');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// Field ID constants (same as migrate-wp-homes.js)
// =============================================================================
const FIELD_TELEVISION          = 'e3e78b4f-b37f-44aa-a3ad-70c61183cb48';
const FIELD_AIR_CONDITIONING    = '232835e2-e1fa-4306-b38a-539cf7432364';
const FIELD_CEILING_FAN         = 'b0785b03-f2ce-49b6-aacd-b3ab2848d13e';
const FIELD_NIGHTSTAND          = '0a3e1764-e0a6-4946-83e7-eb0e575338f2';
const FIELD_WIFI                = 'b766c3ae-8c7c-4189-8471-ce9be070a159';
const FIELD_FULL_KITCHEN        = '52dd87ab-1f8b-4f7b-837e-e27151c031f5';
const FIELD_KITCHENETTE         = '2f8e71d4-3aa9-4f48-8e45-6b8363ad254f';
const FIELD_PETS                = 'b43dfed2-b8d1-45da-b6fc-5d6b7bcc54d1';
const FIELD_BED_SIZE            = '81e173a1-96e1-465b-b828-979ae0070fd7';
const FIELD_HOSPITAL_BED        = 'fd5ea21c-f4ca-4b29-8fa2-63cadff659b0';
const FIELD_SITTING_AREA        = 'e5e469dc-d1b5-40ec-91c7-4ba3a6010863';
const FIELD_DESK                = '70c473b4-1aa6-48cc-be6f-fcbaec1c5535';
const FIELD_DRESSER             = '172418c4-2c2f-467a-8ac4-13e2031aa8fb';
const FIELD_PRIVATE_LANAI       = 'e1be9c9a-9370-4a05-ba67-83c0e2001a36';
const FIELD_GROUND_FLOOR        = '6a61bd20-d934-4018-b094-841936e6871f';
const FIELD_FENCED_PERIMETER    = '2555b660-72a3-46a1-8077-3856afe50ac9';
const FIELD_SECURED_GATE        = 'e9ea71f5-516f-4655-acc3-c616f82a1620';
const FIELD_WHEELCHAIR          = '465256c7-15cf-4a63-a396-114c1225cf8e';
const FIELD_TRANSPORT_OPTIONS   = '5f9fad5f-6485-4453-937e-43542854a809';
const FIELD_HANDICAP_VAN        = 'e4092de1-8ae3-4355-bebe-855bab30fb3e';
const FIELD_PROVIDER_NAME       = '1188cc8e-1923-4dbb-98ca-1131ee385175';
const FIELD_PROVIDER_TITLE      = '2aba0a31-4765-4f83-9815-c5490041345b';
const FIELD_PROVIDER_PHONE      = '8a5d9e2e-5d43-4388-a572-3b27332a7709';
const FIELD_PROVIDER_GENDER     = '8804d48b-bdf1-4df4-8a30-083d6c8e5a3b';
const FIELD_ABOUT_PROVIDER      = '4d0c4db3-aa4f-4059-9ba6-72ce1c0856fd';
const FIELD_CASE_MGMT_AGENCY    = '29c0620a-0799-4366-a76b-af173cd4ade7';
const FIELD_NUMBER_ON_STAFF     = '8d730ade-3d42-4d08-83db-5aef6dd5ffce';
const FIELD_PROVIDER_HOURS      = '3224c668-8958-4813-8690-a1f5824d1aed';
const FIELD_FOOD_TYPES          = '6c5e2cc9-bff5-4da5-b4c6-b8d2bcc41022';
const FIELD_SKILLS              = '6c4b678b-6c6e-4765-a7bf-a9940cb60b74';

// Human-readable label for each field ID
const FIELD_LABEL = {
    [FIELD_TELEVISION]:        'Television',
    [FIELD_AIR_CONDITIONING]:  'Air Conditioning',
    [FIELD_CEILING_FAN]:       'Ceiling Fan',
    [FIELD_NIGHTSTAND]:        'Nightstand w/Lamp',
    [FIELD_WIFI]:              'WiFi',
    [FIELD_FULL_KITCHEN]:      'Full Kitchen',
    [FIELD_KITCHENETTE]:       'Kitchenette',
    [FIELD_PETS]:              'Pets',
    [FIELD_HOSPITAL_BED]:      'Hospital Bed',
    [FIELD_SITTING_AREA]:      'Sitting Area',
    [FIELD_DESK]:              'Desk',
    [FIELD_DRESSER]:           'Dresser',
    [FIELD_PRIVATE_LANAI]:     'Private Lanai/Patio',
    [FIELD_GROUND_FLOOR]:      'Ground Floor',
    [FIELD_FENCED_PERIMETER]:  'Fenced Perimeter',
    [FIELD_SECURED_GATE]:      'Secured Gate',
    [FIELD_WHEELCHAIR]:        'Wheelchair Accessible',
    [FIELD_TRANSPORT_OPTIONS]: 'Transport Options',
    [FIELD_HANDICAP_VAN]:      'Handicap Van',
    [FIELD_PROVIDER_NAME]:     'Provider Name',
    [FIELD_PROVIDER_TITLE]:    'Provider Title',
    [FIELD_PROVIDER_PHONE]:    'Provider Phone',
    [FIELD_PROVIDER_GENDER]:   'Provider Gender',
    [FIELD_ABOUT_PROVIDER]:    'About Provider',
    [FIELD_CASE_MGMT_AGENCY]:  'Case Mgmt Agency',
    [FIELD_NUMBER_ON_STAFF]:   'Number on Staff',
    [FIELD_PROVIDER_HOURS]:    'Provider Hours',
    [FIELD_BED_SIZE]:          'Bed Size',
    [FIELD_FOOD_TYPES]:        'Food Types',
    [FIELD_SKILLS]:            'Skills/Specialties',
};

const BOOL_FIELDS = new Set([
    FIELD_TELEVISION, FIELD_AIR_CONDITIONING, FIELD_CEILING_FAN, FIELD_NIGHTSTAND,
    FIELD_WIFI, FIELD_FULL_KITCHEN, FIELD_KITCHENETTE,
    FIELD_HOSPITAL_BED, FIELD_SITTING_AREA, FIELD_DESK, FIELD_DRESSER,
    FIELD_PRIVATE_LANAI, FIELD_GROUND_FLOOR, FIELD_FENCED_PERIMETER, FIELD_SECURED_GATE,
    FIELD_WHEELCHAIR, FIELD_TRANSPORT_OPTIONS, FIELD_HANDICAP_VAN,
]);

const ARRAY_FIELDS = new Set([FIELD_BED_SIZE, FIELD_PETS, FIELD_FOOD_TYPES, FIELD_SKILLS]);

// =============================================================================
// XML helpers (identical to migrate-wp-homes.js)
// =============================================================================
function unwrapCdata(raw) {
    const s = raw.trim();
    return s.startsWith('<![CDATA[') ? s.slice(9, s.lastIndexOf(']]>')).trim() : s;
}
function getTag(xml, tag) {
    const m = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml);
    return m ? unwrapCdata(m[1]) : '';
}
function getAllPostmeta(xml) {
    const map = {};
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(xml)) !== null) {
        const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(bm[1]);
        const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(bm[1]);
        if (!keyM || !valM) continue;
        const key = unwrapCdata(keyM[1]);
        const val = unwrapCdata(valM[1]);
        if (key && !key.startsWith('_')) map[key] = val;
    }
    return map;
}
function isYes(val) {
    if (!val) return false;
    const v = val.trim();
    return /class="[^"]*\byes\b/.test(v) || v === 'yes' || v === '1';
}
function parseMultiSpan(val) {
    if (!val) return [];
    const results = [];
    const re = /<span[^>]*class="[^"]*\byes\b[^"]*"[^>]*>([^<]+)<\/span>/g;
    let m;
    while ((m = re.exec(val)) !== null) { const t = m[1].trim(); if (t) results.push(t); }
    return results;
}
function parsePhpArray(val) {
    if (!val) return [];
    const results = [];
    const re = /s:\d+:"([^"]*)"/g;
    let m;
    while ((m = re.exec(val)) !== null) results.push(m[1]);
    return results;
}
function normalizeGender(val) {
    if (!val) return undefined;
    const v = val.toLowerCase();
    if (v.includes('female')) return 'Female';
    if (v.includes('male')) return 'Male';
    return 'Unknown';
}
function firstNonEmpty(meta, ...keys) {
    for (const k of keys) { const v = (meta[k] || '').trim(); if (v) return v; }
    return '';
}

// =============================================================================
// Build expected room_details from XML meta (same as migration)
// =============================================================================
function buildExpected(meta) {
    const cf = {};

    const boolMap = [
        [FIELD_TELEVISION,       'television'],
        [FIELD_AIR_CONDITIONING, 'air_conditioning'],
        [FIELD_CEILING_FAN,      'ceiling_fan'],
        [FIELD_NIGHTSTAND,       'nightstand_with_lamp', 'night_stand_with_lamp'],
        [FIELD_WIFI,             'wifi_included'],
        [FIELD_FULL_KITCHEN,     'full_kitchen'],
        [FIELD_KITCHENETTE,      'kitchenette'],
        [FIELD_HOSPITAL_BED,     'hospital_bed'],
        [FIELD_SITTING_AREA,     'sitting_area'],
        [FIELD_DESK,             'desk'],
        [FIELD_DRESSER,          'dresser'],
        [FIELD_PRIVATE_LANAI,    'private_lanai_patio_or_balcony', 'private_patio_deck_or_balcony'],
        [FIELD_GROUND_FLOOR,     'ground_floor_units'],
        [FIELD_FENCED_PERIMETER, 'fenced_in_perimeter'],
        [FIELD_SECURED_GATE,     'secured_gate_access'],
        [FIELD_WHEELCHAIR,       'accommodates_wheelchair'],
        [FIELD_TRANSPORT_OPTIONS,'transportation_options'],
        [FIELD_HANDICAP_VAN,     'owns_a_handicap_transport_van'],
    ];

    for (const [fieldId, ...metaKeys] of boolMap) {
        const hasValue = metaKeys.some(k => meta[k] !== undefined && meta[k] !== '');
        if (hasValue) {
            const yes = metaKeys.some(k => isYes(meta[k]));
            if (yes) cf[fieldId] = true;
            // false → omit (unset)
        }
    }

    const bedSizeArr = parseMultiSpan(meta['bed_size'] || '');
    if (bedSizeArr.length) cf[FIELD_BED_SIZE] = bedSizeArr;

    const petsRaw = meta['pet_friendly'] || '';
    if (petsRaw) {
        const petsArr = parsePhpArray(petsRaw);
        if (petsArr.length) cf[FIELD_PETS] = petsArr;
    }

    const providerName = (meta['care_provider_name'] || '').trim();
    if (providerName) cf[FIELD_PROVIDER_NAME] = providerName;

    const providerTitle = (meta['care_provider_title'] || '').trim();
    if (providerTitle) cf[FIELD_PROVIDER_TITLE] = providerTitle;

    const providerPhone = (meta['care_provider_phone_number'] || '').trim();
    if (providerPhone) cf[FIELD_PROVIDER_PHONE] = providerPhone;

    const providerGender = normalizeGender(meta['care_provider_gender']);
    if (providerGender) cf[FIELD_PROVIDER_GENDER] = providerGender;

    const aboutProvider = (meta['about_care_provider'] || '').trim();
    if (aboutProvider) cf[FIELD_ABOUT_PROVIDER] = aboutProvider;

    const agencyRaw = firstNonEmpty(meta, 'case_management_agency_1', 'case_management_agency_2');
    if (agencyRaw) cf[FIELD_CASE_MGMT_AGENCY] = agencyRaw;

    const staffCount = (meta['number_on_staff'] || '').trim();
    if (staffCount) cf[FIELD_NUMBER_ON_STAFF] = staffCount;

    const providerHours = (meta['care_provider_hours'] || '').trim();
    if (providerHours) cf[FIELD_PROVIDER_HOURS] = providerHours;

    const foodArr = parsePhpArray(meta['types_of_food_available'] || '');
    if (foodArr.length) cf[FIELD_FOOD_TYPES] = foodArr;

    const skillsArr = parsePhpArray(meta['care_provider_skillsspecialties'] || '');
    if (skillsArr.length) cf[FIELD_SKILLS] = skillsArr;

    const languages = parsePhpArray(meta['languages_spoken'] || '');
    const bedroomType  = firstNonEmpty(meta, 'bedroom_type', 'bedroom_type_1');
    const bathroomType = firstNonEmpty(meta, 'bathroom_type', 'bathroom_type_1');
    const showerType   = firstNonEmpty(meta, 'shower_type', 'shower_type_1');

    return {
        ...(bedroomType  && { bedroomType }),
        ...(bathroomType && { bathroomType }),
        ...(showerType   && { showerType }),
        ...(languages.length && { languages }),
        customFields: cf,
    };
}

// =============================================================================
// Compare expected vs actual, return list of diff descriptions
// =============================================================================
function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    const sa = [...a].sort().join('|');
    const sb = [...b].sort().join('|');
    return sa === sb;
}

function compareRoomDetails(slug, expected, actual) {
    const diffs = [];
    const expCf = expected.customFields || {};
    const actCf = actual.customFields || {};

    // Check all expected keys
    for (const [fieldId, expVal] of Object.entries(expCf)) {
        const actVal = actCf[fieldId];
        const label = FIELD_LABEL[fieldId] || fieldId;

        if (BOOL_FIELDS.has(fieldId)) {
            // expected true, actual missing/false
            if (expVal === true && actVal !== true) {
                diffs.push({ fieldId, label, type: 'bool', issue: 'MISSING', expected: true, actual: actVal ?? 'absent' });
            }
        } else if (ARRAY_FIELDS.has(fieldId)) {
            if (!arraysEqual(expVal, actVal)) {
                diffs.push({ fieldId, label, type: 'array', issue: 'MISMATCH',
                    expected: expVal.join(', '), actual: Array.isArray(actVal) ? actVal.join(', ') : String(actVal ?? 'absent') });
            }
        } else {
            // string/text
            if (String(actVal ?? '').trim() !== String(expVal).trim()) {
                diffs.push({ fieldId, label, type: 'text', issue: 'MISMATCH',
                    expected: String(expVal), actual: String(actVal ?? 'absent') });
            }
        }
    }

    // Check for extra bool fields in DB that XML says should NOT be set
    for (const [fieldId, actVal] of Object.entries(actCf)) {
        if (!BOOL_FIELDS.has(fieldId)) continue;
        if (expCf[fieldId] === true) continue; // correctly set
        if (actVal === true) {
            const label = FIELD_LABEL[fieldId] || fieldId;
            diffs.push({ fieldId, label, type: 'bool', issue: 'EXTRA', expected: 'absent', actual: true });
        }
    }

    // Top-level scalars
    for (const key of ['bedroomType', 'bathroomType', 'showerType']) {
        const expVal = expected[key] || '';
        const actVal = actual[key] || '';
        if (expVal.trim() !== actVal.trim()) {
            diffs.push({ fieldId: key, label: key, type: 'text', issue: 'MISMATCH',
                expected: expVal || 'absent', actual: actVal || 'absent' });
        }
    }

    // Languages array
    const expLangs = expected.languages || [];
    const actLangs = actual.languages || [];
    if (!arraysEqual(expLangs, actLangs)) {
        diffs.push({ fieldId: 'languages', label: 'Languages', type: 'array', issue: 'MISMATCH',
            expected: expLangs.join(', ') || 'absent', actual: actLangs.join(', ') || 'absent' });
    }

    return diffs;
}

// Build corrected room_details: apply expected onto actual (preserve actual keys not in expected)
function applyFix(expected, actual) {
    const expCf = expected.customFields || {};
    const actCf = actual ? { ...actual.customFields } : {};

    // Remove extra bool fields XML says should be absent
    for (const fieldId of Object.keys(actCf)) {
        if (BOOL_FIELDS.has(fieldId) && expCf[fieldId] !== true) delete actCf[fieldId];
    }

    // Apply all expected customFields values
    for (const [k, v] of Object.entries(expCf)) {
        actCf[k] = v;
    }

    // Remove false values just in case
    for (const [k, v] of Object.entries(actCf)) {
        if (v === false) delete actCf[k];
    }

    const result = { ...(actual || {}), customFields: actCf };

    // Apply top-level scalars
    for (const key of ['bedroomType', 'bathroomType', 'showerType']) {
        if (expected[key]) result[key] = expected[key];
        else delete result[key];
    }
    if (expected.languages && expected.languages.length) result.languages = expected.languages;
    else delete result.languages;

    return result;
}

// =============================================================================
// Fetch all DB homes with pagination
// =============================================================================
async function fetchAllHomes() {
    const BATCH = 500;
    const all = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabase
            .from('homes')
            .select('id, slug, room_details')
            .order('slug')
            .range(offset, offset + BATCH - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < BATCH) break;
        offset += BATCH;
    }
    return all;
}

// =============================================================================
// Main
// =============================================================================
async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Verify Room Details${FIX ? ' [FIX]' : ' [REPORT ONLY]'}`);
    console.log(`${'='.repeat(60)}\n`);

    const xmlPath = path.resolve(process.cwd(), 'wp-homes-export.xml');
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);

    // Build expected map from XML
    const xmlMap = new Map(); // slug → expected room_details
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'homes') continue;
        const slug = getTag(item, 'wp:post_name').trim();
        if (!slug) continue;
        const meta = getAllPostmeta(item);
        xmlMap.set(slug, buildExpected(meta));
    }
    console.log(`XML homes parsed: ${xmlMap.size}`);

    const homes = await fetchAllHomes();
    console.log(`DB homes loaded:  ${homes.length}\n`);

    let totalDiffs = 0, homesWithDiffs = 0, fixed = 0, errors = 0;
    const summary = [];

    for (const home of homes) {
        const expected = xmlMap.get(home.slug);
        if (!expected) {
            console.log(`  [WARN] ${home.slug}: not found in XML, skipping`);
            continue;
        }

        const actual = home.room_details || {};
        const diffs = compareRoomDetails(home.slug, expected, actual);

        if (!diffs.length) continue;

        homesWithDiffs++;
        totalDiffs += diffs.length;

        console.log(`\n  ${home.slug} (${diffs.length} issue${diffs.length > 1 ? 's' : ''}):`);
        for (const d of diffs) {
            const arrow = `${JSON.stringify(d.actual)} → ${JSON.stringify(d.expected)}`;
            console.log(`    [${d.issue}] ${d.label}: ${arrow}`);
        }
        summary.push({ slug: home.slug, count: diffs.length });

        if (FIX) {
            const corrected = applyFix(expected, actual);
            const { error } = await supabase.from('homes').update({ room_details: corrected }).eq('id', home.id);
            if (error) {
                console.error(`    ERROR fixing ${home.slug}: ${error.message}`);
                errors++;
            } else {
                console.log(`    → Fixed`);
                fixed++;
            }
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Homes with discrepancies: ${homesWithDiffs}`);
    console.log(`Total field mismatches:   ${totalDiffs}`);
    if (FIX) console.log(`Fixed: ${fixed}  Errors: ${errors}`);
    else if (homesWithDiffs > 0) console.log(`\nRun with --fix to apply corrections.`);
    console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
