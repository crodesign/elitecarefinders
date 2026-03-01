const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
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

// 2. Parse XML
const xmlPath = path.join(__dirname, '..', 'wp-homes-export.xml');
console.log(`Reading XML from ${xmlPath}...`);
const xmlData = fs.readFileSync(xmlPath, 'utf8');

console.log('Parsing XML...');
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});
const parsed = parser.parse(xmlData);

const items = parsed.rss.channel.item;
const homes = items.filter(item => item['wp:post_type'] === 'homes');
console.log(`Found ${homes.length} 'homes' items in XML.`);

// 3. Helper to extract meta
function getMeta(item, key) {
    if (!item['wp:postmeta']) return null;
    const metaList = Array.isArray(item['wp:postmeta']) ? item['wp:postmeta'] : [item['wp:postmeta']];
    const meta = metaList.find(m => m['wp:meta_key'] === key);
    return meta ? meta['wp:meta_value'] : null;
}

// Helper to get taxonomies from XML
function getCategories(item, domain) {
    if (!item.category) return [];
    const catList = Array.isArray(item.category) ? item.category : [item.category];
    return catList.filter(c => c['@_domain'] === domain).map(c => c['@_nicename'] || c['#text']);
}

// 4. Find 5 well-populated homes
const candidates = homes.filter(h => {
    const meta = h['wp:postmeta'];
    return meta && (Array.isArray(meta) ? meta.length > 20 : true); // make sure it has lots of fields
});

// Shuffle candidates predictably or just pick 5
const sampled = candidates.sort(() => 0.5 - Math.random()).slice(0, 5);

async function run() {
    console.log(`\nStarting spot check for 5 homes...`);

    for (const xmlHome of sampled) {
        const slug = xmlHome['wp:post_name'];
        const title = xmlHome.title;
        const status = xmlHome['wp:status'];
        const capacity = getMeta(xmlHome, 'capacity');

        // Some ACF fields
        const providerName = getMeta(xmlHome, 'provider_name');
        const address = getMeta(xmlHome, 'address');
        const phone = getMeta(xmlHome, 'phone');

        // Let's get taxonomy slugs for comparison
        const homeTypes = getCategories(xmlHome, 'home_type');
        const facilityTags = getCategories(xmlHome, 'facility_tags');

        console.log(`\n======================================================`);
        console.log(`Spot Check: ${title} (${slug})`);
        console.log(`======================================================`);

        // Fetch from Supabase (removed taxonomy_entries join since no fk)
        const { data, error } = await supabase
            .from('homes')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) {
            console.log(`[Error] Could not find home in Supabase: ${error.message}`);
            continue;
        }

        // We need to resolve taxonomy_entry_ids to slugs to compare if no joined table
        // We'll just print Supabase fields for now

        console.log(`[Field]             | [Wordpress XML]                    | [Supabase DB]`);
        console.log(`--------------------|------------------------------------|------------------------------------`);
        console.log(`Title               | ${String(title).padEnd(34)} | ${String(data.title).padEnd(34)}`);
        console.log(`Slug                | ${String(slug).padEnd(34)} | ${String(data.slug).padEnd(34)}`);
        console.log(`Status              | ${String(status).padEnd(34)} | ${String(data.status).padEnd(34)}`);
        console.log(`Capacity            | ${String(capacity || 'N/A').padEnd(34)} | ${String(data.capacity || 'N/A').padEnd(34)}`);

        function getSupabaseField(key) {
            if (!data.fields) return 'N/A';
            return data.fields[key] || 'N/A';
        }

        console.log(`Provider Name       | ${String(providerName || 'N/A').substring(0, 34).padEnd(34)} | ${String(getSupabaseField('provider_name')).substring(0, 34).padEnd(34)}`);
        console.log(`Address             | ${String(address || 'N/A').substring(0, 34).padEnd(34)} | ${String(getSupabaseField('address')).substring(0, 34).padEnd(34)}`);
        console.log(`Phone               | ${String(phone || 'N/A').substring(0, 34).padEnd(34)} | ${String(getSupabaseField('phone')).substring(0, 34).padEnd(34)}`);

        // Print arrays
        console.log(`\n[Taxonomies]`);
        console.log(`WP Home Types:      ${homeTypes.join(', ') || 'None'}`);
        console.log(`WP Facility Tags:   ${facilityTags.join(', ') || 'None'}`);
        console.log(`DB Taxonomy IDs:    ${(data.taxonomy_entry_ids || []).join(', ') || 'None'}`);
    }
}

run();
