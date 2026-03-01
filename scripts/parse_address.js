const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Supabase Setup
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

const cities = [
    'honolulu', 'waipahu', 'waip', 'hon', 'kapolei', 'ewa beach',
    'pearl city', 'kaneohe', 'kailua', 'mililani', 'aiea',
    'wahiawa', 'waimanalo', 'waianae', 'haleiwa', 'waialua',
    'kahuku', 'laie', 'hauula', 'kaaawa', 'hilo', 'kona', 'kailua-kona'
];

const slugCityMap = {
    'ewab': 'Ewa Beach',
    'wphu': 'Waipahu',
    'wphuvp': 'Waipahu',
    'klhi': 'Honolulu',
    'slake': 'Honolulu',
    'pcty': 'Pearl City',
    'manoa': 'Honolulu',
    'kaimuki': 'Honolulu',
    'kailua': 'Kailua',
    'aina-haina': 'Honolulu',
    'kple': 'Kapolei',
    'knhe': 'Kaneohe',
    'mililani': 'Mililani',
    'aiea': 'Aiea',
    'wahiawa': 'Wahiawa',
    'waimanalo': 'Waimanalo',
    'waianae': 'Waianae',
    'haleiwa': 'Haleiwa',
    'waialua': 'Waialua',
    'kahuku': 'Kahuku',
    'laie': 'Laie',
    'hauula': 'Hauula',
    'kaaawa': 'Kaaawa',
    'kunia': 'Kunia',
    'hilo': 'Hilo'
};

function parseAddress(addressObj, slug = '') {
    if (!addressObj) return null;

    // Combine all fields to avoid losing data, separated by spaces
    const parts = [
        addressObj.street,
        addressObj.city,
        addressObj.state,
        addressObj.zip
    ].filter(p => p && typeof p === 'string' && p.trim() !== '');

    // De-duplicate parts
    let full = parts.join(', ').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

    let state = 'Hawaii'; // Default to Hawaii per request
    let zip = '';
    let city = '';
    let street = '';

    // 1. Extract Zip (5 digits at end, or 5-4)
    const zipRegex = /\b(\d{5}(?:-\d{4})?)\b(?:[^0-9A-Z]*)$/i;
    const zipMatch = full.match(zipRegex);
    if (zipMatch) {
        zip = zipMatch[1];
        full = full.substring(0, zipMatch.index).trim();
    }

    // 2. Extract State (HI or Hawaii) at the end
    const stateRegex = /\b(HI|Hawaii)\b(?:[^0-9A-Z]*)$/i;
    const stateMatch = full.match(stateRegex);
    if (stateMatch) {
        state = 'Hawaii'; // normalize to spelled out
        full = full.substring(0, stateMatch.index).trim();
    }

    full = full.replace(/[,.\s]+$/, '');

    // 3. Extract City from end
    const sortedCities = [...cities].sort((a, b) => b.length - a.length);

    for (const c of sortedCities) {
        const cityRegex = new RegExp(`\\b(${c})\\b(?:[^a-z0-9]*)$`, 'i');
        const match = full.match(cityRegex);
        if (match) {
            city = match[1];
            if (city.toLowerCase() === 'waip') city = 'Waipahu';
            if (city.toLowerCase() === 'hon') city = 'Honolulu';

            city = city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

            full = full.substring(0, match.index).trim();
            break; // found City
        }
    }

    // If city is still blank, let's try to derive it from the slug
    if (!city && slug) {
        const slugPrefix = slug.split('-')[0].toLowerCase();
        if (slugCityMap[slugPrefix]) {
            city = slugCityMap[slugPrefix];
        } else if (slugCityMap[slug]) {
            city = slugCityMap[slug];
        }
    }

    full = full.replace(/[,.\s]+$/, '');

    street = full;

    return {
        street,
        city,
        state,
        zip
    };
}

async function run() {
    console.log('Fetching all homes...');
    const { data: homes, error } = await supabase
        .from('homes')
        .select('id, slug, address')
        .not('address', 'is', null);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${homes.length} homes with address data.`);

    let perfect = 0;
    let missingCity = 0;
    let missingZip = 0;

    const updates = [];
    const samples = [];

    for (const home of homes) {
        // Only process if it's an object
        if (typeof home.address !== 'object' || !home.address) continue;

        // Skip if street is missing
        if (!home.address.street || home.address.street.trim() === '') continue;

        const parsed = parseAddress(home.address, home.slug);

        if (!parsed.city) missingCity++;
        if (!parsed.zip) missingZip++;
        if (parsed.city && parsed.zip) perfect++;

        updates.push({
            id: home.id,
            slug: home.slug,
            old: home.address,
            new: parsed
        });

        if (samples.length < 10) {
            samples.push({
                slug: home.slug,
                old: home.address,
                new: parsed
            });
        }
    }

    // Perform bulk update!
    console.log(`\nReady to update ${updates.length} homes.`);
    let successCount = 0;
    let failCount = 0;

    for (const u of updates) {
        const { error: upErr } = await supabase
            .from('homes')
            .update({ address: u.new }) // update with parsed values
            .eq('id', u.id);

        if (upErr) {
            console.error(`Error updating home ${u.slug}:`, upErr.message);
            failCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\nUpdate Complete.`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed to update: ${failCount}`);

    fs.writeFileSync(path.join(__dirname, 'address_updates.json'), JSON.stringify(updates, null, 2));
    console.log(`Saved full proposed updates to address_updates.json`);
}

run();
