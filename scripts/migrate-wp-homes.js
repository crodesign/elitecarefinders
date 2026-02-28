'use strict';

/**
 * scripts/migrate-wp-homes.js
 *
 * Migrates homes from the WordPress XML export into Supabase.
 *
 * Usage:
 *   node scripts/migrate-wp-homes.js                  # full run
 *   node scripts/migrate-wp-homes.js --dry-run        # preview only, no DB writes or downloads
 *   node scripts/migrate-wp-homes.js --skip-images    # insert DB records but skip image downloads
 *   node scripts/migrate-wp-homes.js --limit 20       # process first N homes only
 *   node scripts/migrate-wp-homes.js --update         # update room_details on already-migrated homes
 *
 * After running, generate image variants:
 *   node scripts/generate-image-variants.js
 *
 * LESSONS APPLIED (from wp-migration-lessons.md):
 *   - Taxonomy IDs are hardcoded — never create new taxonomies
 *   - WP `facility_types` domain → existing `home-type` taxonomy
 *   - WP `neighborhood` domain → existing `location` taxonomy (Oahu children)
 *   - Missing neighborhoods created under Oahu in setup phase only
 *   - Unmatched values logged and skipped, never silently ignored
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_IMAGES = process.argv.includes('--skip-images');
const UPDATE_MODE = process.argv.includes('--update'); // update room_details on already-migrated homes
const MEDIA_DIR = path.join(process.cwd(), 'public', 'images', 'media');

const limitArg = process.argv.find(a => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || process.argv[process.argv.indexOf(limitArg) + 1], 10) : null;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =============================================================================
// HARDCODED TAXONOMY CONFIG  (queried from DB 2026-02-27)
// =============================================================================

// Taxonomy: Home Types  id=286967ff-a897-4529-9c25-6f452f77f0d7
// WP domain: facility_types
const HOME_TYPE_ENTRY_MAP = {
    'adult-foster-home':                   '472ffdb8-def9-4961-a5ed-fd4a7e66d56c',
    'adult-residential-care-home':          'a030638d-3b86-448a-9840-64cdb247786f',
    'expanded-adult-residential-care-home': '9bf1a545-6ff1-4d0f-9b04-6a0d6a41ecb1',
    // memory-care intentionally absent — not in home-type, will be logged+skipped
};

// Taxonomy: Locations  id=58112e25-5d12-4233-980c-079e48586435
// WP domain: neighborhood → Oahu city-level entries
const LOCATION_TAX_ID  = '58112e25-5d12-4233-980c-079e48586435';
const OAHU_ENTRY_ID    = 'fd72a571-8f86-410b-a766-bca6c3e1f9fe';

const LOCATION_ENTRY_MAP = {
    'aiea':           '7774376c-f206-4744-bf2d-3b74391dd09b',
    'ewa-beach':      'dc306fd7-fc67-45d2-9ff2-37cbf249904d',
    'hawaii-kai':     '4b03d362-c623-4ae1-846f-9a5ca0fdc1e6',
    'honolulu':       '94811a0d-1018-4603-b4f0-7f31a8a1aab8',
    'kahala':         '60a2300f-befb-4c36-9c41-43224759bd25',
    'kailua':         'c0c0bd51-066e-4a69-b69f-02ca1e0753a0',
    'kaneohe':        '6a736785-4b21-4b33-87b8-146f9516a8ee',
    'kapolei':        '4fc7a1df-3612-4f44-beec-b54124b50ee4',
    'manoa':          '8edd407e-91dd-49e1-9ec2-64aa491025e3',
    'mililani':       'bbd289d7-bf99-4db3-8970-c507a52df56c',
    'pearl-city':     '71d786ef-463f-4503-a995-7272cd740c3f',
    // null = missing, will be created under Oahu in setup:
    'aina-haina':     null,
    'foster-village': null,
    'kalihi':         null,
    'makaha':         null,
    'wahiawa':        null,
    'waianae':        null,
    'waipahu':        null,
};

const MISSING_NEIGHBORHOOD_NAMES = {
    'aina-haina':     'Aina Haina',
    'foster-village': 'Foster Village',
    'kalihi':         'Kalihi',
    'makaha':         'Makaha',
    'wahiawa':        'Wahiawa',
    'waianae':        "Wai'anae",
    'waipahu':        'Waipahu',
};

// =============================================================================
// ROOM FIELD DEFINITION IDs  (queried from DB 2026-02-27)
// Maps DB field ID → WP meta key(s) to read
// =============================================================================

// Room Amenities (section=room_details, col=3)
const FIELD_TELEVISION          = 'e3e78b4f-b37f-44aa-a3ad-70c61183cb48';
const FIELD_AIR_CONDITIONING    = '232835e2-e1fa-4306-b38a-539cf7432364';
const FIELD_CEILING_FAN         = 'b0785b03-f2ce-49b6-aacd-b3ab2848d13e';
const FIELD_NIGHTSTAND          = '0a3e1764-e0a6-4946-83e7-eb0e575338f2';
const FIELD_WIFI                = 'b766c3ae-8c7c-4189-8471-ce9be070a159';
const FIELD_FULL_KITCHEN        = '52dd87ab-1f8b-4f7b-837e-e27151c031f5';
const FIELD_KITCHENETTE         = '2f8e71d4-3aa9-4f48-8e45-6b8363ad254f';
const FIELD_PETS                = 'b43dfed2-b8d1-45da-b6fc-5d6b7bcc54d1'; // multi

// Furnishings (section=room_details, col=2)
const FIELD_BED_SIZE            = '81e173a1-96e1-465b-b828-979ae0070fd7'; // multi
const FIELD_HOSPITAL_BED        = 'fd5ea21c-f4ca-4b29-8fa2-63cadff659b0';
const FIELD_SITTING_AREA        = 'e5e469dc-d1b5-40ec-91c7-4ba3a6010863';
const FIELD_DESK                = '70c473b4-1aa6-48cc-be6f-fcbaec1c5535';
const FIELD_DRESSER             = '172418c4-2c2f-467a-8ac4-13e2031aa8fb';

// Outdoor & Access (section=room_details, col=4)
const FIELD_PRIVATE_LANAI       = 'e1be9c9a-9370-4a05-ba67-83c0e2001a36';
const FIELD_GROUND_FLOOR        = '6a61bd20-d934-4018-b094-841936e6871f';
const FIELD_FENCED_PERIMETER    = '2555b660-72a3-46a1-8077-3856afe50ac9';
const FIELD_SECURED_GATE        = 'e9ea71f5-516f-4655-acc3-c616f82a1620';

// Accessibility (section=room_details, col=2)
const FIELD_WHEELCHAIR          = '465256c7-15cf-4a63-a396-114c1225cf8e';
const FIELD_TRANSPORT_OPTIONS   = '5f9fad5f-6485-4453-937e-43542854a809';
const FIELD_HANDICAP_VAN        = 'e4092de1-8ae3-4355-bebe-855bab30fb3e';

// Care Provider Information (section=care_provider_details, col=1)
const FIELD_PROVIDER_NAME       = '1188cc8e-1923-4dbb-98ca-1131ee385175';
const FIELD_PROVIDER_TITLE      = '2aba0a31-4765-4f83-9815-c5490041345b';
const FIELD_PROVIDER_PHONE      = '8a5d9e2e-5d43-4388-a572-3b27332a7709';
const FIELD_PROVIDER_GENDER     = '8804d48b-bdf1-4df4-8a30-083d6c8e5a3b'; // single-select
const FIELD_ABOUT_PROVIDER      = '4d0c4db3-aa4f-4059-9ba6-72ce1c0856fd';

// Staffing & Contact (section=care_provider_details, col=2)
const FIELD_CASE_MGMT_AGENCY    = '29c0620a-0799-4366-a76b-af173cd4ade7';
const FIELD_NUMBER_ON_STAFF     = '8d730ade-3d42-4d08-83db-5aef6dd5ffce'; // dropdown
const FIELD_PROVIDER_HOURS      = '3224c668-8958-4813-8690-a1f5824d1aed'; // single-select

// Food Options (section=care_provider_details, col=3)
const FIELD_FOOD_TYPES          = '6c5e2cc9-bff5-4da5-b4c6-b8d2bcc41022'; // multi

// Skills & Specialties (section=care_provider_details, col=4)
const FIELD_SKILLS              = '6c4b678b-6c6e-4765-a7bf-a9940cb60b74'; // multi

// =============================================================================
// XML helpers
// =============================================================================

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

function getAllPostmeta(xml) {
    const map = {};
    const blockRe = /<wp:postmeta>([\s\S]*?)<\/wp:postmeta>/g;
    let bm;
    while ((bm = blockRe.exec(xml)) !== null) {
        const block = bm[1];
        const keyM = /<wp:meta_key>([\s\S]*?)<\/wp:meta_key>/.exec(block);
        const valM = /<wp:meta_value>([\s\S]*?)<\/wp:meta_value>/.exec(block);
        if (!keyM || !valM) continue;
        const key = unwrapCdata(keyM[1]);
        const val = unwrapCdata(valM[1]);
        if (key && !key.startsWith('_')) map[key] = val;
    }
    return map;
}

function getCategories(xml) {
    const cats = [];
    const re = /<category\s+domain="([^"]+)"\s+nicename="([^"]+)"><!\[CDATA\[([^\]]*)\]\]><\/category>/g;
    let m;
    while ((m = re.exec(xml)) !== null) cats.push({ domain: m[1], nicename: m[2], name: m[3] });
    return cats;
}

// Detects "yes": class="item yes", class="rmdetail yes", raw "yes", or "1"
function isYes(val) {
    if (!val) return false;
    const v = val.trim();
    return /class="[^"]*\byes\b/.test(v) || v === 'yes' || v === '1';
}

// Extract text content from all <span class="item yes">VALUE</span> elements → string[]
function parseMultiSpan(val) {
    if (!val) return [];
    const results = [];
    const re = /<span[^>]*class="[^"]*\byes\b[^"]*"[^>]*>([^<]+)<\/span>/g;
    let m;
    while ((m = re.exec(val)) !== null) { const t = m[1].trim(); if (t) results.push(t); }
    return results;
}

// Parse PHP serialized array  a:N:{i:0;s:LEN:"value";...}  → string[]
function parsePhpArray(val) {
    if (!val) return [];
    const results = [];
    const re = /s:\d+:"([^"]*)"/g;
    let m;
    while ((m = re.exec(val)) !== null) results.push(m[1]);
    return results;
}

function parseAddress(raw) {
    if (!raw) return { street: '', city: '', state: '', zip: '' };
    const parts = raw.split(',').map(s => s.trim());
    if (parts.length >= 3) {
        const stateZip = parts[2].trim().split(/\s+/);
        return { street: parts[0], city: parts[1], state: stateZip[0] || '', zip: stateZip[1] || '' };
    }
    if (parts.length === 2) return { street: parts[0], city: parts[1], state: '', zip: '' };
    return { street: raw, city: '', state: '', zip: '' };
}

function slugify(text) {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Normalize care provider gender from WP values to form options
function normalizeGender(val) {
    if (!val) return undefined;
    const v = val.toLowerCase();
    if (v.includes('female')) return 'Female';
    if (v.includes('male')) return 'Male';
    return 'Unknown';
}

// Extract first non-empty value from a list of meta keys (for per-room fields)
function firstNonEmpty(meta, ...keys) {
    for (const k of keys) {
        const v = (meta[k] || '').trim();
        if (v) return v;
    }
    return '';
}

// =============================================================================
// File download
// =============================================================================

async function downloadFile(url, destPath, redirectCount = 0) {
    if (redirectCount > 5) throw new Error(`Too many redirects for ${url}`);
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, { timeout: 30000 }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                res.resume();
                downloadFile(res.headers.location, destPath, redirectCount + 1).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode} for ${url}`)); return; }
            const contentType = res.headers['content-type'] || 'image/jpeg';
            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(contentType.split(';')[0]); });
            file.on('error', reject);
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout for ${url}`)); });
    });
}

// =============================================================================
// Setup: create missing neighborhoods in Location under Oahu
// =============================================================================

async function setupMissingNeighborhoods() {
    const missing = Object.entries(LOCATION_ENTRY_MAP).filter(([, id]) => id === null);
    if (!missing.length) { console.log('  All neighborhoods already mapped.'); return; }

    console.log(`  Creating ${missing.length} missing neighborhoods under Oahu...`);

    for (const [slug] of missing) {
        const name = MISSING_NEIGHBORHOOD_NAMES[slug];

        const { data: existing } = await supabase
            .from('taxonomy_entries')
            .select('id')
            .eq('taxonomy_id', LOCATION_TAX_ID)
            .eq('slug', slug)
            .maybeSingle();

        if (existing) {
            LOCATION_ENTRY_MAP[slug] = existing.id;
            console.log(`    Already exists: ${name} (${existing.id})`);
            continue;
        }

        if (DRY_RUN) {
            console.log(`    [DRY RUN] Would create: ${name}`);
            LOCATION_ENTRY_MAP[slug] = `dry-${slug}`;
            continue;
        }

        const { data: created, error } = await supabase
            .from('taxonomy_entries')
            .insert({ taxonomy_id: LOCATION_TAX_ID, name, slug, parent_id: OAHU_ENTRY_ID, display_order: 0 })
            .select('id')
            .single();

        if (error) throw new Error(`Failed to create "${name}": ${error.message}`);
        LOCATION_ENTRY_MAP[slug] = created.id;
        console.log(`    Created: ${name} (${created.id})`);
    }
}

// =============================================================================
// Media helpers
// =============================================================================

async function getHomeImagesFolder() {
    const { data } = await supabase
        .from('media_folders').select('id, path').eq('slug', 'home-images').is('parent_id', null).maybeSingle();

    if (data) return data;
    if (DRY_RUN) return { id: 'dry-home-images', path: '/Home Images' };

    const { data: created, error } = await supabase
        .from('media_folders')
        .insert({ name: 'Home Images', slug: 'home-images', path: '/Home Images', parent_id: null })
        .select('id, path').single();

    if (error) throw new Error(`Failed to create Home Images folder: ${error.message}`);
    console.log(`  Created "Home Images" root folder (${created.id})`);
    return created;
}

async function ensureMediaFolder(name, slug, parentId, parentPath) {
    // Check by slug+parent first
    const { data } = await supabase
        .from('media_folders').select('id').eq('slug', slug).eq('parent_id', parentId).maybeSingle();
    if (data) return data.id;

    // Check by path in case folder exists with a different slug (from prior migration run)
    const folderPath = `${parentPath}/${name}`;
    const { data: byPath } = await supabase
        .from('media_folders').select('id').eq('path', folderPath).maybeSingle();
    if (byPath) return byPath.id;

    if (DRY_RUN) return `dry-folder-${slug}`;

    const { data: created, error } = await supabase
        .from('media_folders')
        .insert({ name, slug, parent_id: parentId, path: folderPath })
        .select('id').single();

    if (error) throw new Error(`Failed to create media folder "${name}": ${error.message}`);
    console.log(`  Created media folder: ${name} (${created.id})`);
    return created.id;
}

async function downloadAndRegisterImage(wpUrl, folderId, folderSlug, index) {
    const ext = (wpUrl.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    const filename = `${folderSlug}-${index}.${ext}`;
    const destPath = path.join(MEDIA_DIR, filename);
    const publicUrl = `/images/media/${filename}`;
    const originalFilename = decodeURIComponent(wpUrl.split('/').pop() || filename);

    const { data: existing } = await supabase
        .from('media_items').select('id, url').eq('filename', filename).maybeSingle();

    if (existing) { console.log(`    Already exists: ${filename}`); return existing.url; }

    if (DRY_RUN || SKIP_IMAGES) {
        console.log(`    [${DRY_RUN ? 'DRY RUN' : 'SKIP'}] ${originalFilename} → ${filename}`);
        return publicUrl;
    }

    let mimeType = `image/${ext}`;
    try {
        mimeType = await downloadFile(wpUrl, destPath);
    } catch (err) {
        console.error(`    DOWNLOAD FAILED: ${wpUrl} — ${err.message}`);
        return null;
    }

    const stats = fs.statSync(destPath);
    const { error } = await supabase.from('media_items').insert({
        folder_id: folderId, filename, original_filename: originalFilename,
        title: originalFilename.replace(/\.[^/.]+$/, ''),
        mime_type: mimeType, file_size: stats.size, storage_path: publicUrl, url: publicUrl,
    });

    if (error) { console.error(`    DB INSERT FAILED for ${filename}: ${error.message}`); return null; }
    console.log(`    Downloaded: ${filename} (${Math.round(stats.size / 1024)}KB)`);
    return publicUrl;
}

// =============================================================================
// Build room_details from WP meta
// =============================================================================

function buildRoomDetails(meta) {
    const cf = {};

    // ── Room Amenities (booleans) ──────────────────────────────────────────
    // Each entry: [fieldId, ...metaKeys]  — checks all keys, true if ANY is yes
    const boolMap = [
        [FIELD_TELEVISION,       'television'],
        [FIELD_AIR_CONDITIONING, 'air_conditioning'],
        [FIELD_CEILING_FAN,      'ceiling_fan'],
        [FIELD_NIGHTSTAND,       'nightstand_with_lamp', 'night_stand_with_lamp'], // two WP key variants
        [FIELD_WIFI,             'wifi_included'],
        [FIELD_FULL_KITCHEN,     'full_kitchen'],
        [FIELD_KITCHENETTE,      'kitchenette'],
        // Furnishings
        [FIELD_HOSPITAL_BED,     'hospital_bed'],
        // (FIELD_BED_SIZE handled separately below — multi-span, not boolean)
        [FIELD_SITTING_AREA,     'sitting_area'],
        [FIELD_DESK,             'desk'],
        [FIELD_DRESSER,          'dresser'],
        // Outdoor & Access
        [FIELD_PRIVATE_LANAI,    'private_lanai_patio_or_balcony', 'private_patio_deck_or_balcony'],
        [FIELD_GROUND_FLOOR,     'ground_floor_units'],
        [FIELD_FENCED_PERIMETER, 'fenced_in_perimeter'],
        [FIELD_SECURED_GATE,     'secured_gate_access'],
        // Accessibility
        [FIELD_WHEELCHAIR,       'accommodates_wheelchair'],
        [FIELD_TRANSPORT_OPTIONS,'transportation_options'],
        [FIELD_HANDICAP_VAN,     'owns_a_handicap_transport_van'],
    ];
    for (const [fieldId, ...metaKeys] of boolMap) {
        const hasValue = metaKeys.some(k => meta[k] !== undefined && meta[k] !== '');
        if (hasValue) cf[fieldId] = metaKeys.some(k => isYes(meta[k]));
    }

    // ── Bed Size (multi-span: <span class="item yes">Twin</span> etc.) ────
    const bedSizeArr = parseMultiSpan(meta['bed_size'] || '');
    if (bedSizeArr.length) cf[FIELD_BED_SIZE] = bedSizeArr;

    // ── Pets Allowed (multi-select from PHP serialized or simple yes/no) ──
    const petsRaw = meta['pet_friendly'] || '';
    if (petsRaw) {
        const petsArr = parsePhpArray(petsRaw);
        if (petsArr.length) cf[FIELD_PETS] = petsArr;
        // If it was a simple yes/no HTML span, skip — no meaningful value to map
    }

    // ── Care Provider Information ──────────────────────────────────────────
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

    // ── Staffing & Contact ─────────────────────────────────────────────────
    const agencyRaw = firstNonEmpty(meta, 'case_management_agency_1', 'case_management_agency_2');
    if (agencyRaw) cf[FIELD_CASE_MGMT_AGENCY] = agencyRaw;

    const staffCount = (meta['number_on_staff'] || '').trim();
    if (staffCount) cf[FIELD_NUMBER_ON_STAFF] = staffCount;

    const providerHours = (meta['care_provider_hours'] || '').trim();
    if (providerHours) cf[FIELD_PROVIDER_HOURS] = providerHours;

    // ── Food Types (PHP serialized multi) ─────────────────────────────────
    const foodArr = parsePhpArray(meta['types_of_food_available'] || '');
    if (foodArr.length) cf[FIELD_FOOD_TYPES] = foodArr;

    // ── Skills & Specialties (PHP serialized multi) ───────────────────────
    const skillsArr = parsePhpArray(meta['care_provider_skillsspecialties'] || '');
    if (skillsArr.length) cf[FIELD_SKILLS] = skillsArr;

    // ── Top-level RoomDetails fixed fields ────────────────────────────────
    const languages = parsePhpArray(meta['languages_spoken'] || '');
    const bedroomType = firstNonEmpty(meta, 'bedroom_type', 'bedroom_type_1');
    const bathroomType = firstNonEmpty(meta, 'bathroom_type', 'bathroom_type_1');
    const showerType = firstNonEmpty(meta, 'shower_type', 'shower_type_1');

    return {
        ...(bedroomType && { bedroomType }),
        ...(bathroomType && { bathroomType }),
        ...(showerType && { showerType }),
        ...(languages.length && { languages }),
        customFields: cf,
    };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`WP Homes Migration${DRY_RUN ? ' [DRY RUN]' : ''}${SKIP_IMAGES ? ' [SKIP IMAGES]' : ''}${UPDATE_MODE ? ' [UPDATE]' : ''}${LIMIT ? ` [LIMIT ${LIMIT}]` : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    }

    const xml = fs.readFileSync(path.resolve(process.cwd(), 'wp-homes-export.xml'), 'utf8');
    console.log(`XML file size: ${Math.round(xml.length / 1024)}KB`);

    const items = xml.split('<item>').slice(1).map(c => '<item>' + c.split('</item>')[0]);
    console.log(`Total XML items: ${items.length}`);

    const attachMap = new Map();
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'attachment') continue;
        const id = getTag(item, 'wp:post_id');
        const url = getTag(item, 'wp:attachment_url');
        if (id && url) attachMap.set(id, url);
    }
    console.log(`Attachments found: ${attachMap.size}`);

    const wpHomes = [];
    for (const item of items) {
        if (getTag(item, 'wp:post_type') !== 'homes') continue;
        const title = getTag(item, 'title').trim();
        if (!title) { console.log(`  Skipping untitled (wp:post_id=${getTag(item, 'wp:post_id')})`); continue; }
        const rawSlug = getTag(item, 'wp:post_name').trim();
        const wpStatus = getTag(item, 'wp:status');
        const slug = rawSlug || slugify(title);
        const status = (wpStatus === 'publish' || wpStatus === 'pending') ? 'published' : 'draft';
        wpHomes.push({ title, slug, status, meta: getAllPostmeta(item), cats: getCategories(item) });
    }

    const homesToProcess = LIMIT ? wpHomes.slice(0, LIMIT) : wpHomes;
    console.log(`\nHomes to process: ${homesToProcess.length}`);
    for (const h of homesToProcess) console.log(`  [${h.status.padEnd(9)}] ${h.title}`);

    // Setup
    console.log('\n--- Setup: missing neighborhoods ---');
    await setupMissingNeighborhoods();

    console.log('\n--- Media setup ---');
    const homeImagesFolder = await getHomeImagesFolder();
    console.log(`Home Images folder: ${homeImagesFolder.id}`);
    if (!fs.existsSync(MEDIA_DIR)) await fsp.mkdir(MEDIA_DIR, { recursive: true });

    let successCount = 0, skipCount = 0, errorCount = 0;
    const unmatchedTypes = new Set();
    const unmatchedNeighborhoods = new Set();

    for (const home of homesToProcess) {
        console.log(`\n${'─'.repeat(50)}`);
        console.log(`${home.title} [${home.status}]`);

        const { data: existing } = await supabase.from('homes').select('id').eq('slug', home.slug).maybeSingle();
        if (existing && !UPDATE_MODE) { console.log(`  Already exists, skipping.`); skipCount++; continue; }

        const mediaFolderId = await ensureMediaFolder(home.title, home.slug, homeImagesFolder.id, homeImagesFolder.path);

        const galleryWpUrls = [];
        for (let i = 1; i <= 20; i++) {
            const attachId = (home.meta[`gallery_image_${i}`] || '').trim();
            if (!attachId) continue;
            const wpUrl = attachMap.get(attachId);
            if (!wpUrl) { console.log(`  gallery_image_${i}: attachment ${attachId} not found`); continue; }
            galleryWpUrls.push(wpUrl);
        }
        for (let i = 1; i <= 6; i++) {
            const attachId = (home.meta[`extra_gallery_image_${i}`] || '').trim();
            if (attachId) { const wpUrl = attachMap.get(attachId); if (wpUrl) galleryWpUrls.push(wpUrl); }
        }

        const teamWpUrls = [];
        for (let i = 1; i <= 5; i++) {
            const attachId = (home.meta[`team_image_${i}`] || '').trim();
            if (attachId) { const wpUrl = attachMap.get(attachId); if (wpUrl) teamWpUrls.push(wpUrl); }
        }
        const providerAttachId = (home.meta['provider_image'] || '').trim();
        if (providerAttachId) { const wpUrl = attachMap.get(providerAttachId); if (wpUrl) teamWpUrls.push(wpUrl); }

        console.log(`  Gallery: ${galleryWpUrls.length}, Team+Provider: ${teamWpUrls.length}`);

        const images = [];
        let imgIndex = 1;
        for (const wpUrl of galleryWpUrls) {
            const localUrl = await downloadAndRegisterImage(wpUrl, mediaFolderId, home.slug, imgIndex++);
            if (localUrl) images.push(localUrl);
        }

        const teamImages = [];
        for (const wpUrl of teamWpUrls) {
            const localUrl = await downloadAndRegisterImage(wpUrl, mediaFolderId, home.slug, imgIndex++);
            if (localUrl) teamImages.push(localUrl);
        }

        const videos = [];
        if (isYes(home.meta['include_facility_video']) && home.meta['facility_video'])
            videos.push({ url: home.meta['facility_video'], caption: '' });
        for (let i = 1; i <= 5; i++) {
            if (isYes(home.meta[`display_video_${i}`]) && home.meta[`gallery_video_${i}`])
                videos.push({ url: home.meta[`gallery_video_${i}`], caption: home.meta[`gallery_video_caption_${i}`] || '' });
        }

        const taxonomyIds = [];
        for (const cat of home.cats) {
            if (cat.domain === 'facility_types') {
                const id = HOME_TYPE_ENTRY_MAP[cat.nicename];
                if (id) taxonomyIds.push(id);
                else { unmatchedTypes.add(cat.nicename); console.log(`  WARN: unmatched home type "${cat.nicename}" — skipped`); }
            }
            if (cat.domain === 'neighborhood') {
                const id = LOCATION_ENTRY_MAP[cat.nicename];
                if (id) taxonomyIds.push(id);
                else { unmatchedNeighborhoods.add(cat.nicename); console.log(`  WARN: unmatched neighborhood "${cat.nicename}" — skipped`); }
            }
        }

        const roomDetails = buildRoomDetails(home.meta);

        const record = {
            title: home.title,
            slug: home.slug,
            description: home.meta['facility_description'] || '',
            address: parseAddress(home.meta['facility_address'] || ''),
            phone: home.meta['facility_phone'] || null,
            show_address: isYes(home.meta['show_address']),
            status: home.status,
            taxonomy_entry_ids: taxonomyIds,
            images,
            team_images: teamImages,
            videos,
            room_details: roomDetails,
            is_featured: isYes(home.meta['featured']),
            has_featured_video: isYes(home.meta['featured_video']),
            is_home_of_month: isYes(home.meta['home_of_the_month']),
            featured_label: home.meta['feature_label'] || null,
            home_of_month_description: home.meta['home_of_the_month_description'] || null,
        };

        const cfCount = Object.keys(roomDetails.customFields).length;
        console.log(`  Images: ${images.length}  Team: ${teamImages.length}  Videos: ${videos.length}  TaxIDs: ${taxonomyIds.length}  Fields: ${cfCount}`);
        console.log(`  Addr: ${home.meta['facility_address'] || '(none)'}  Phone: ${record.phone || '(none)'}`);
        if (roomDetails.bedroomType) console.log(`  Bedroom: ${roomDetails.bedroomType}  Bathroom: ${roomDetails.bathroomType || ''}  Shower: ${roomDetails.showerType || ''}`);
        if (roomDetails.languages?.length) console.log(`  Languages: ${roomDetails.languages.join(', ')}`);

        if (DRY_RUN) { console.log(`  [DRY RUN] Would ${existing ? 'update' : 'insert'}.`); successCount++; continue; }

        if (existing) {
            // UPDATE MODE: only refresh room_details (don't touch images/taxonomy/etc.)
            const { error } = await supabase.from('homes')
                .update({ room_details: roomDetails })
                .eq('id', existing.id);
            if (error) { console.error(`  ERROR updating: ${error.message}`); errorCount++; }
            else { console.log(`  Updated room_details: id=${existing.id}`); successCount++; }
        } else {
            const { data: inserted, error } = await supabase.from('homes').insert(record).select('id').single();
            if (error) { console.error(`  ERROR: ${error.message}`); errorCount++; }
            else { console.log(`  Inserted: id=${inserted.id}`); successCount++; }
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('Migration complete');
    console.log(`  Inserted: ${successCount}  Skipped: ${skipCount}  Errors: ${errorCount}`);
    if (unmatchedTypes.size) console.log(`  Unmatched home types (skipped): ${[...unmatchedTypes].join(', ')}`);
    if (unmatchedNeighborhoods.size) console.log(`  Unmatched neighborhoods (skipped): ${[...unmatchedNeighborhoods].join(', ')}`);
    if (!DRY_RUN && successCount > 0)
        console.log(`\n  NEXT: node scripts/generate-image-variants.js`);
    console.log(`${'='.repeat(60)}\n`);
}

main().catch(err => { console.error('\nFATAL:', err.message || err); process.exit(1); });
