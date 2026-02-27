'use strict';

/**
 * scripts/fix-migration-data.js
 *
 * Comprehensive post-migration cleanup:
 *
 * 1. Consolidate Facility Type taxonomies
 *    - Original (slug: facility-type) had 4 entries, missing ARCH/EARCH/Memory Care
 *    - Migration created a duplicate (slug: facility-types) with all 7
 *    - Fix: add missing entries to original, remap facility taxonomy_ids, delete duplicate
 *
 * 2. Fix Location / Neighborhood mapping
 *    - Migration created a flat "Neighborhoods" taxonomy (Honolulu, Kapolei, Waikiki)
 *    - These should be entries in the existing Location taxonomy (State→Island→City)
 *    - Kapolei and Waikiki already exist under Hawaii→Oahu
 *    - "Honolulu" needs to be added under Oahu
 *    - Fix: remap facility taxonomy_ids, delete Neighborhoods taxonomy
 *
 * 3. Seed room_fixed_field_options
 *    - bedroom, bathroom, shower, roomType, levelOfCare options from WP data
 *
 * 4. Create room_field_categories and room_field_definitions
 *    - All WP boolean meta fields, organised into sections and columns
 *
 * 5. Parse XML and populate room_details JSON on each facility
 *
 * Run: node scripts/fix-migration-data.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Known IDs (from DB inspection) ──────────────────────────────────────────

const ORIGINAL_FACILITY_TYPE_TAX_ID = 'aaff7539-60ec-448d-ae56-5ee8763917f6'; // slug: facility-type
const MIGRATION_FACILITY_TYPE_TAX_ID = '8a4a611f-dead-41d2-9303-3346956b392c'; // slug: facility-types (DELETE)
const MIGRATION_NEIGHBORHOODS_TAX_ID = 'e3a251a8-8893-4d9f-99a1-5ddf759384ff'; // slug: neighborhoods (DELETE)
const LOCATION_TAX_ID = '58112e25-5d12-4233-980c-079e48586435';                // slug: location (keep)
const OAHU_ENTRY_ID = 'fd72a571-8f86-410b-a766-bca6c3e1f9fe';                  // Hawaii→Oahu

// Migration neighborhood entry IDs → their names (for mapping to Location)
const MIGRATION_NEIGHBORHOOD_ENTRIES = {
    'aaa83273-ab8c-4091-98b7-dde11c4fd04a': 'honolulu',
    '1075e650-24ac-4be8-8dc3-9dc07e281d86': 'waikiki',
    'eb4dc50e-5d48-455e-a166-99930a733ea6': 'kapolei',
};

// Existing Location entries under Oahu
const LOCATION_KAPOLEI_ID = '4fc7a1df-3612-4f44-beec-b54124b50ee4';
const LOCATION_WAIKIKI_ID = '84ca8cfa-91da-4cf8-85d7-f2c44991474f';
// Honolulu doesn't exist yet — will be created

// ─── WP XML Path ─────────────────────────────────────────────────────────────

const XML_PATH = path.resolve(process.cwd(), 'wp-facilities-export.xml');

// ─── Room field definitions to create ────────────────────────────────────────

// Format: { section, column, categoryName, categoryIcon, fields: [{name, slug, type}] }
const ROOM_FIELD_SCHEMA = [
    {
        section: 'room_details',
        column: 1,
        categoryName: 'Room Amenities',
        categoryIcon: 'Bed',
        fields: [
            { name: 'Air Conditioning',           slug: 'air-conditioning',             type: 'boolean' },
            { name: 'Ceiling Fan',                 slug: 'ceiling-fan',                  type: 'boolean' },
            { name: 'Desk',                        slug: 'desk',                         type: 'boolean' },
            { name: 'Full Kitchen',                slug: 'full-kitchen',                 type: 'boolean' },
            { name: 'Kitchenette',                 slug: 'kitchenette',                  type: 'boolean' },
            { name: 'Ground Floor Units',          slug: 'ground-floor-units',           type: 'boolean' },
            { name: 'Night Stand with Lamp',       slug: 'night-stand-with-lamp',        type: 'boolean' },
            { name: 'Private Patio/Deck/Balcony',  slug: 'private-patio-deck-balcony',   type: 'boolean' },
            { name: 'Sitting Area',                slug: 'sitting-area',                 type: 'boolean' },
            { name: 'Television',                  slug: 'television',                   type: 'boolean' },
            { name: 'WiFi Included',               slug: 'wifi-included',                type: 'boolean' },
        ],
    },
    {
        section: 'room_details',
        column: 2,
        categoryName: 'Dining',
        categoryIcon: 'UtensilsCrossed',
        fields: [
            { name: 'Anytime Dining',              slug: 'anytime-dining',               type: 'boolean' },
            { name: 'Custom Menu',                 slug: 'custom-menu',                  type: 'boolean' },
            { name: 'Gluten-Free',                 slug: 'gluten-free',                  type: 'boolean' },
            { name: 'Guest Meals',                 slug: 'guest-meals',                  type: 'boolean' },
            { name: 'International Cuisine',       slug: 'international-cuisine',        type: 'boolean' },
            { name: 'Local Cuisine',               slug: 'local-cuisine',                type: 'boolean' },
            { name: 'Low/No Sodium or Sugar',      slug: 'low-no-sodium-or-sugar',       type: 'boolean' },
            { name: 'Restaurant Style Dining',     slug: 'restaurant-style-dining',      type: 'boolean' },
            { name: 'Vegetarian',                  slug: 'vegetarian',                   type: 'boolean' },
        ],
    },
    {
        section: 'location_details',
        column: 2,
        categoryName: 'Medical Services',
        categoryIcon: 'Stethoscope',
        fields: [
            { name: 'Bed Available',               slug: 'bed-available',                type: 'boolean' },
            { name: 'Diabetic Care',               slug: 'diabetic-care',                type: 'boolean' },
            { name: 'Doctor on Staff',             slug: 'doctor-on-staff',              type: 'boolean' },
            { name: 'Incontinence Care',           slug: 'incontinence-care',            type: 'boolean' },
            { name: 'Massage Therapist',           slug: 'massage-therapist',            type: 'boolean' },
            { name: 'Medication Management',       slug: 'medication-management',        type: 'boolean' },
            { name: 'Nurse',                       slug: 'nurse',                        type: 'boolean' },
            { name: 'Physical Therapist',          slug: 'physical-therapist',           type: 'boolean' },
            { name: 'Podiatrist',                  slug: 'podiatrist',                   type: 'boolean' },
        ],
    },
    {
        section: 'location_details',
        column: 3,
        categoryName: 'Facility Amenities',
        categoryIcon: 'Building2',
        fields: [
            { name: 'Meeting Room',                slug: 'meeting-room',                 type: 'boolean' },
            { name: 'TV Lounge',                   slug: 'tv-lounge',                    type: 'boolean' },
        ],
    },
    {
        section: 'location_details',
        column: 4,
        categoryName: 'Payment',
        categoryIcon: 'DollarSign',
        fields: [
            { name: 'Pay Method',                  slug: 'pay-method',                   type: 'text' },
        ],
    },
];

// Fixed field options to seed
const FIXED_FIELD_OPTIONS = {
    bedroom: [
        'Private Bedroom',
        'Shared Bedroom',
        'Studio',
        'Semi-Private',
    ],
    bathroom: [
        'Private Full Bath',
        'Private Half Bath',
        'Shared Full Bath',
        'Shared Half Bath',
    ],
    shower: [
        'Step-In Shower',
        'Walk-In Shower',
        'Wheel-In Shower',
        'Roll-In Shower',
        'Tub/Shower Combo',
    ],
    roomType: [
        'Studio',
        'One Bedroom',
        'Two Bedroom',
        'Suite',
        'Shared Room',
    ],
    levelOfCare: [
        'Assisted Living',
        'Independent Living',
        'Memory Care',
        'Ambulatory Care',
        'Hospice/Palliative Care',
        'Skilled Nursing',
        'Intermediate Care',
    ],
    language: [
        'English',
        'Spanish',
        'Japanese',
        'Mandarin',
        'Cantonese',
        'Filipino/Tagalog',
        'Ilocano',
        'Korean',
        'Vietnamese',
        'Portuguese',
    ],
};

// WP meta_key → levelOfCare value mapping
const LEVEL_OF_CARE_KEYS = {
    'assisted_living':           'Assisted Living',
    'independent_living':        'Independent Living',
    'memory_care':               'Memory Care',
    'ambulatory_care':           'Ambulatory Care',
    'hospice_available_on-site': 'Hospice/Palliative Care',
};

// ─── XML Helpers ──────────────────────────────────────────────────────────────

function extractMeta(xml) {
    const meta = {};
    const re = /<wp:postmeta>\s*<wp:meta_key><!\[CDATA\[([^\]]+)\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>\s*<\/wp:postmeta>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        const key = m[1];
        const val = m[2];
        // Skip underscore-prefixed WP internal cache keys
        if (!key.startsWith('_') && !key.startsWith('gallery_image_') && key !== 'facility_video' && key !== 'include_facility_video') {
            meta[key] = val;
        }
    }
    return meta;
}

function isYes(html) {
    // <span class="item yes">Label</span> or just "yes"
    if (!html) return false;
    if (html.toLowerCase() === 'yes' || html === '1') return true;
    return /class="item yes"/.test(html);
}

function extractText(html) {
    if (!html) return '';
    // Strip HTML tags
    return html.replace(/<[^>]+>/g, '').trim();
}

function parseRoomPrice(val) {
    if (!val) return undefined;
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? undefined : num;
}

function normaliseShower(val) {
    if (!val) return '';
    // "(step-in shower)" → "Step-In Shower"
    const clean = val.replace(/[()]/g, '').trim();
    return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function parseXMLFacilities(xmlContent) {
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xmlContent)) !== null) {
        const item = m[1];
        const postType = (item.match(/<wp:post_type><!\[CDATA\[([^\]]+)\]\]>/) || [])[1];
        if (postType !== 'facilities') continue;
        const slug = (item.match(/<wp:post_name><!\[CDATA\[([^\]]+)\]\]>/) || [])[1] || '';
        if (!slug) continue; // skip auto-drafts with no slug

        const meta = extractMeta(item);

        // Categories
        const catRe = /<category domain="([^"]+)" nicename="([^"]+)"><!\[CDATA\[([^\]]*)\]\]><\/category>/g;
        const facilityTypes = [];
        const neighborhoods = [];
        let cr;
        while ((cr = catRe.exec(item)) !== null) {
            if (cr[1] === 'facility_types') facilityTypes.push(cr[3].trim());
            if (cr[1] === 'neighborhood')   neighborhoods.push(cr[3].trim());
        }

        items.push({ slug, meta, facilityTypes, neighborhoods });
    }
    return items;
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function log(msg) { console.log(msg); }
async function logDry(msg) { if (DRY_RUN) console.log(`  [DRY RUN] ${msg}`); }

async function findOrCreateEntry(taxonomyId, name, parentId = null) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let q = supabase.from('taxonomy_entries').select('id').eq('taxonomy_id', taxonomyId).eq('name', name);
    if (parentId) q = q.eq('parent_id', parentId);
    else q = q.is('parent_id', null);
    const { data: existing } = await q.maybeSingle();
    if (existing) return existing.id;

    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create taxonomy_entry: "${name}" under ${parentId || 'root'}`);
        return `dry-${slug}`;
    }
    const { data, error } = await supabase
        .from('taxonomy_entries')
        .insert({ taxonomy_id: taxonomyId, name, slug, parent_id: parentId })
        .select('id')
        .single();
    if (error) throw new Error(`Failed to create entry "${name}": ${error.message}`);
    console.log(`  Created taxonomy_entry: "${name}"`);
    return data.id;
}

// ─── Phase 1: Consolidate Facility Type Taxonomies ────────────────────────────

async function phase1_consolidateFacilityTypes() {
    console.log('\n' + '─'.repeat(60));
    console.log('Phase 1: Consolidate Facility Type taxonomies');
    console.log('─'.repeat(60));

    // Get all entries from both taxonomies
    const { data: origEntries } = await supabase
        .from('taxonomy_entries')
        .select('id,name,slug')
        .eq('taxonomy_id', ORIGINAL_FACILITY_TYPE_TAX_ID);

    const { data: migEntries } = await supabase
        .from('taxonomy_entries')
        .select('id,name,slug')
        .eq('taxonomy_id', MIGRATION_FACILITY_TYPE_TAX_ID);

    console.log(`  Original has ${origEntries.length} entries, migration has ${migEntries.length} entries`);

    // Build name→id map for original
    const origByName = {};
    origEntries.forEach(e => { origByName[e.name.toLowerCase()] = e.id; });

    // For each migration entry, find or create matching entry in original
    const migToOrig = {}; // migrationEntryId → originalEntryId
    for (const me of migEntries) {
        if (origByName[me.name.toLowerCase()]) {
            migToOrig[me.id] = origByName[me.name.toLowerCase()];
            console.log(`  Map existing: "${me.name}" → ${migToOrig[me.id]}`);
        } else {
            // Create in original
            const newId = await findOrCreateEntry(ORIGINAL_FACILITY_TYPE_TAX_ID, me.name, null);
            migToOrig[me.id] = newId;
            console.log(`  Created in original: "${me.name}" → ${newId}`);
        }
    }

    // Get all facilities that have any migration taxonomy_ids
    const { data: facilities } = await supabase
        .from('facilities')
        .select('id,title,taxonomy_ids');

    let updated = 0;
    for (const fac of facilities) {
        const ids = fac.taxonomy_ids || [];
        const hasMig = ids.some(id => migToOrig[id]);
        if (!hasMig) continue;

        const newIds = ids.map(id => migToOrig[id] || id);
        // Deduplicate
        const dedupedIds = [...new Set(newIds)];

        if (!DRY_RUN) {
            const { error } = await supabase
                .from('facilities')
                .update({ taxonomy_ids: dedupedIds })
                .eq('id', fac.id);
            if (error) throw new Error(`Failed to update ${fac.title}: ${error.message}`);
        }
        console.log(`  Updated ${fac.title}: ${ids.length} → ${dedupedIds.length} taxonomy_ids`);
        updated++;
    }

    // Delete migration taxonomy entries, then taxonomy
    if (!DRY_RUN) {
        const { error: e1 } = await supabase.from('taxonomy_entries').delete().eq('taxonomy_id', MIGRATION_FACILITY_TYPE_TAX_ID);
        if (e1) throw new Error(`Failed to delete migration entries: ${e1.message}`);
        const { error: e2 } = await supabase.from('taxonomies').delete().eq('id', MIGRATION_FACILITY_TYPE_TAX_ID);
        if (e2) throw new Error(`Failed to delete migration taxonomy: ${e2.message}`);
        console.log('  Deleted migration Facility Types taxonomy and its entries');
    } else {
        console.log('  [DRY RUN] Would delete migration Facility Types taxonomy and entries');
    }

    // Also fix the original taxonomy's content_types to include 'facility' (currently only has 'facilities')
    if (!DRY_RUN) {
        await supabase.from('taxonomies')
            .update({ content_types: ['facility', 'facilities'] })
            .eq('id', ORIGINAL_FACILITY_TYPE_TAX_ID);
        console.log("  Fixed original taxonomy content_types → ['facility', 'facilities']");
    }

    console.log(`  Phase 1 done. Updated ${updated} facilities.`);
}

// ─── Phase 2: Fix Neighborhood → Location ────────────────────────────────────

async function phase2_fixNeighborhoodLocation() {
    console.log('\n' + '─'.repeat(60));
    console.log('Phase 2: Fix Neighborhood → Location taxonomy');
    console.log('─'.repeat(60));

    // Create "Honolulu" under Oahu in Location taxonomy if it doesn't exist
    const honoluluId = await findOrCreateEntry(LOCATION_TAX_ID, 'Honolulu', OAHU_ENTRY_ID);
    console.log(`  Honolulu entry in Location: ${honoluluId}`);

    // Map from Neighborhoods entry IDs → Location entry IDs
    const neighborhoodToLocation = {
        'aaa83273-ab8c-4091-98b7-dde11c4fd04a': honoluluId,          // Honolulu
        '1075e650-24ac-4be8-8dc3-9dc07e281d86': LOCATION_WAIKIKI_ID, // Waikiki
        'eb4dc50e-5d48-455e-a166-99930a733ea6': LOCATION_KAPOLEI_ID, // Kapolei
    };

    // Get all facilities
    const { data: facilities } = await supabase
        .from('facilities')
        .select('id,title,taxonomy_ids');

    let updated = 0;
    for (const fac of facilities) {
        const ids = fac.taxonomy_ids || [];
        const hasNeighborhood = ids.some(id => neighborhoodToLocation[id]);
        if (!hasNeighborhood) continue;

        const newIds = ids.map(id => neighborhoodToLocation[id] || id);
        const dedupedIds = [...new Set(newIds)];

        if (!DRY_RUN) {
            const { error } = await supabase
                .from('facilities')
                .update({ taxonomy_ids: dedupedIds })
                .eq('id', fac.id);
            if (error) throw new Error(`Failed to update ${fac.title}: ${error.message}`);
        }
        const before = ids.filter(id => neighborhoodToLocation[id]).map(id => {
            const name = Object.keys(MIGRATION_NEIGHBORHOOD_ENTRIES).includes(id)
                ? MIGRATION_NEIGHBORHOOD_ENTRIES[id]
                : id;
            return name;
        });
        console.log(`  Updated ${fac.title}: neighborhood [${before.join(', ')}] → Location entries`);
        updated++;
    }

    // Delete Neighborhoods taxonomy entries + taxonomy
    if (!DRY_RUN) {
        const { error: e1 } = await supabase.from('taxonomy_entries').delete().eq('taxonomy_id', MIGRATION_NEIGHBORHOODS_TAX_ID);
        if (e1) throw new Error(`Failed to delete neighborhood entries: ${e1.message}`);
        const { error: e2 } = await supabase.from('taxonomies').delete().eq('id', MIGRATION_NEIGHBORHOODS_TAX_ID);
        if (e2) throw new Error(`Failed to delete neighborhood taxonomy: ${e2.message}`);
        console.log('  Deleted Neighborhoods taxonomy and its entries');
    } else {
        console.log('  [DRY RUN] Would delete Neighborhoods taxonomy and entries');
    }

    console.log(`  Phase 2 done. Updated ${updated} facilities.`);
}

// ─── Phase 3: Seed room_fixed_field_options ───────────────────────────────────

async function phase3_seedFixedFieldOptions() {
    console.log('\n' + '─'.repeat(60));
    console.log('Phase 3: Seed room_fixed_field_options');
    console.log('─'.repeat(60));

    for (const [fieldType, values] of Object.entries(FIXED_FIELD_OPTIONS)) {
        // Check existing
        const { data: existing } = await supabase
            .from('room_fixed_field_options')
            .select('value')
            .eq('field_type', fieldType);
        const existingValues = new Set((existing || []).map(r => r.value));

        let order = existingValues.size + 1;
        for (const value of values) {
            if (existingValues.has(value)) {
                console.log(`  ${fieldType}/"${value}" already exists, skipping`);
                continue;
            }
            if (!DRY_RUN) {
                const { error } = await supabase.from('room_fixed_field_options').insert({
                    field_type: fieldType,
                    value,
                    display_order: order,
                    is_active: true,
                });
                if (error) throw new Error(`Failed to create option ${fieldType}/${value}: ${error.message}`);
            }
            console.log(`  Created: ${fieldType}/"${value}"`);
            order++;
        }
    }
    console.log('  Phase 3 done.');
}

// ─── Phase 4: Create room_field_categories + room_field_definitions ───────────

async function phase4_seedFieldSchema() {
    console.log('\n' + '─'.repeat(60));
    console.log('Phase 4: Create room_field_categories and room_field_definitions');
    console.log('─'.repeat(60));

    // Map: fieldSlug → fieldDefinitionId (for phase 5)
    const fieldSlugToId = {};

    let catOrder = 10;
    for (const cat of ROOM_FIELD_SCHEMA) {
        // Find or create category
        const { data: existingCat } = await supabase
            .from('room_field_categories')
            .select('id,name')
            .eq('name', cat.categoryName)
            .maybeSingle();

        let categoryId;
        if (existingCat) {
            categoryId = existingCat.id;
            console.log(`  Category exists: "${cat.categoryName}" (${categoryId})`);
        } else {
            if (!DRY_RUN) {
                const { data, error } = await supabase
                    .from('room_field_categories')
                    .insert({
                        name: cat.categoryName,
                        slug: cat.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                        display_order: catOrder,
                        section: cat.section,
                        column_number: cat.column,
                        icon: cat.categoryIcon || null,
                    })
                    .select('id')
                    .single();
                if (error) throw new Error(`Failed to create category "${cat.categoryName}": ${error.message}`);
                categoryId = data.id;
                console.log(`  Created category: "${cat.categoryName}" (${categoryId})`);
            } else {
                categoryId = `dry-cat-${cat.categoryName.toLowerCase().replace(/\s+/g, '-')}`;
                console.log(`  [DRY RUN] Would create category: "${cat.categoryName}"`);
            }
            catOrder++;
        }

        // Create field definitions
        let fieldOrder = 1;
        for (const field of cat.fields) {
            const { data: existingField } = await supabase
                .from('room_field_definitions')
                .select('id')
                .eq('slug', field.slug)
                .maybeSingle();

            if (existingField) {
                fieldSlugToId[field.slug] = existingField.id;
                console.log(`    Field exists: "${field.name}"`);
            } else {
                if (!DRY_RUN) {
                    const { data, error } = await supabase
                        .from('room_field_definitions')
                        .insert({
                            name: field.name,
                            slug: field.slug,
                            type: field.type,
                            target_type: 'facility',
                            category_id: categoryId,
                            display_order: fieldOrder,
                            is_active: true,
                            options: [],
                        })
                        .select('id')
                        .single();
                    if (error) throw new Error(`Failed to create field "${field.name}": ${error.message}`);
                    fieldSlugToId[field.slug] = data.id;
                    console.log(`    Created field: "${field.name}" (${data.id})`);
                } else {
                    fieldSlugToId[field.slug] = `dry-field-${field.slug}`;
                    console.log(`    [DRY RUN] Would create field: "${field.name}"`);
                }
            }
            fieldOrder++;
        }
    }

    console.log('  Phase 4 done.');
    return fieldSlugToId;
}

// ─── Phase 5: Parse XML and update room_details ───────────────────────────────

async function phase5_populateRoomDetails(fieldSlugToId) {
    console.log('\n' + '─'.repeat(60));
    console.log('Phase 5: Populate room_details from XML');
    console.log('─'.repeat(60));

    if (!fs.existsSync(XML_PATH)) {
        console.log('  XML file not found, skipping.');
        return;
    }

    const xmlContent = fs.readFileSync(XML_PATH, 'utf8');
    const wpFacilities = parseXMLFacilities(xmlContent);
    console.log(`  Parsed ${wpFacilities.length} facilities from XML`);

    // WP meta_key → field slug mapping
    const metaKeyToSlug = {
        'air_conditioning':           'air-conditioning',
        'ceiling_fan':                'ceiling-fan',
        'desk':                       'desk',
        'full_kitchen':               'full-kitchen',
        'kitchenette':                'kitchenette',
        'ground_floor_units':         'ground-floor-units',
        'night_stand_with_lamp':      'night-stand-with-lamp',
        'private_patio_deck_or_balcony': 'private-patio-deck-balcony',
        'sitting_area':               'sitting-area',
        'television':                 'television',
        'wifi_included':              'wifi-included',
        'anytime_dining':             'anytime-dining',
        'custom_menu':                'custom-menu',
        'gluten-free':                'gluten-free',
        'guest_meals':                'guest-meals',
        'international_cuisine':      'international-cuisine',
        'local_cuisine':              'local-cuisine',
        'low__no_sodium_or_sugar':    'low-no-sodium-or-sugar',
        'restaurant_style_dining':    'restaurant-style-dining',
        'vegetarian':                 'vegetarian',
        'bed_available':              'bed-available',
        'diabetic_care':              'diabetic-care',
        'doctor_on_staff':            'doctor-on-staff',
        'incontinence_care':          'incontinence-care',
        'massage_therapist':          'massage-therapist',
        'medication_management':      'medication-management',
        'nurse':                      'nurse',
        'physical_therapist':         'physical-therapist',
        'podiatrist':                 'podiatrist',
        'meeting_room':               'meeting-room',
        'tv_lounge':                  'tv-lounge',
        'pay_method':                 'pay-method',
    };

    let updated = 0;
    for (const wpFac of wpFacilities) {
        // Find facility in DB by slug
        const { data: fac } = await supabase
            .from('facilities')
            .select('id,title,room_details')
            .eq('slug', wpFac.slug)
            .maybeSingle();

        if (!fac) {
            console.log(`  Facility not found in DB: ${wpFac.slug}, skipping`);
            continue;
        }

        const meta = wpFac.meta;
        const existing = fac.room_details || {};
        const customFields = existing.customFields || {};

        // Fixed fields
        const roomPrice = parseRoomPrice(meta.room_price);
        const bedroomType = extractText(meta.bedroom_type) || undefined;
        const bathroomType = extractText(meta.bathroom_type) || undefined;
        const showerType = normaliseShower(meta.shower_type) || undefined;

        // Level of care (from boolean WP meta)
        const levelOfCare = [];
        for (const [key, label] of Object.entries(LEVEL_OF_CARE_KEYS)) {
            if (isYes(meta[key])) levelOfCare.push(label);
        }

        // Custom boolean and text fields
        for (const [metaKey, fieldSlug] of Object.entries(metaKeyToSlug)) {
            const fieldId = fieldSlugToId[fieldSlug];
            if (!fieldId || fieldId.startsWith('dry-')) continue;
            const val = meta[metaKey];
            if (fieldSlug === 'pay-method') {
                const text = extractText(val);
                if (text) customFields[fieldId] = text;
            } else {
                // boolean
                customFields[fieldId] = isYes(val);
            }
        }

        const newRoomDetails = {
            ...existing,
            ...(roomPrice !== undefined ? { roomPrice } : {}),
            ...(bedroomType ? { bedroomType } : {}),
            ...(bathroomType ? { bathroomType } : {}),
            ...(showerType ? { showerType } : {}),
            ...(levelOfCare.length > 0 ? { levelOfCare } : {}),
            customFields,
        };

        console.log(`  ${fac.title}: roomPrice=${roomPrice}, bedroom=${bedroomType}, levelOfCare=[${levelOfCare.join(', ')}], ${Object.keys(customFields).length} custom fields`);

        if (!DRY_RUN) {
            const { error } = await supabase
                .from('facilities')
                .update({ room_details: newRoomDetails })
                .eq('id', fac.id);
            if (error) throw new Error(`Failed to update room_details for ${fac.title}: ${error.message}`);
        }
        updated++;
    }

    console.log(`  Phase 5 done. Updated ${updated} facilities.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log(`Fix Migration Data${DRY_RUN ? ' [DRY RUN]' : ''}`);
    console.log('='.repeat(60));

    await phase1_consolidateFacilityTypes();
    await phase2_fixNeighborhoodLocation();
    await phase3_seedFixedFieldOptions();
    const fieldSlugToId = await phase4_seedFieldSchema();
    await phase5_populateRoomDetails(fieldSlugToId);

    console.log('\n' + '='.repeat(60));
    console.log('All phases complete.');
    console.log('='.repeat(60) + '\n');
}

main().catch(err => { console.error('\nFATAL:', err.message || err); process.exit(1); });
