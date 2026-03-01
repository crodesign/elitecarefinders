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

function cleanHtml(htmlStr) {
    if (!htmlStr || typeof htmlStr !== 'string') return htmlStr;

    // 1. Remove script and style blocks entirely
    let text = htmlStr.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');

    // 2. Replace common block elements with newlines to preserve some structure
    text = text.replace(/<\/?(?:p|div|h[1-6]|br\s*\/?)>/gi, '\n');

    // 3. Remove all remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // 4. Decode common HTML entities
    const entities = {
        '&nbsp;': ' ',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&ndash;': '-',
        '&mdash;': '--',
        '&lsquo;': "'",
        '&rsquo;': "'",
        '&ldquo;': '"',
        '&rdquo;': '"',
        '&#8211;': '-',
        '&#8212;': '--',
        '&#8216;': "'",
        '&#8217;': "'",
        '&#8220;': '"',
        '&#8221;': '"'
    };

    // Replace known entities
    for (const [entity, replacement] of Object.entries(entities)) {
        text = text.replace(new RegExp(entity, 'gi'), replacement);
    }

    // Replace decimal numeric entities (e.g., &#160;)
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));

    // Replace hex numeric entities (e.g., &#x00A0;)
    text = text.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

    // 4.5 Clean unusual unicode spaces (like non-breaking spaces '\u00A0', zero-width spaces, etc)
    text = text.replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ');
    text = text.replace(/[\u200b-\u200d\ufeff]/g, '');

    // 5. Clean up extra whitespace (collapse multiple spaces to one, but preserve intentional newlines)
    text = text.replace(/[ \t]+/g, ' '); // Collapse spaces/tabs
    text = text.replace(/\n\s*\n+/g, '\n\n'); // Max 2 newlines

    return text.trim();
}

async function run() {
    console.log('Fetching homes with home_of_month_description...');

    // Find homes where home_of_month_description is not null AND looks like it might contain HTML
    const { data: homes, error } = await supabase
        .from('homes')
        .select('id, slug, home_of_month_description')
        .not('home_of_month_description', 'is', null)
        .neq('home_of_month_description', '');

    if (error) {
        console.error('Error fetching homes:', error.message);
        return;
    }

    console.log(`Found ${homes.length} homes with a featured description.`);

    const updates = [];
    const samples = [];

    for (const home of homes) {
        const original = home.home_of_month_description;

        const cleaned = cleanHtml(original);

        // Only add to updates if it actually changed
        if (original !== cleaned) {
            updates.push({
                id: home.id,
                slug: home.slug,
                old: original,
                new: cleaned
            });

            if (samples.length < 5) {
                samples.push({
                    slug: home.slug,
                    old: original,
                    new: cleaned
                });
            }
        }
    }

    console.log(`\nFound ${updates.length} descriptions that need HTML cleaning.`);

    if (updates.length > 0) {
        console.log(`\nSample of 5 descriptions to clean:`);
        samples.forEach((s, idx) => {
            console.log(`[${idx + 1}] Home: ${s.slug}`);
            console.log(`  Old: ${s.old.substring(0, 150)}...`);
            console.log(`  New: ${s.new.substring(0, 150)}...\n`);
        });

        // Save dry-run to file
        fs.writeFileSync(path.join(__dirname, 'clean_desc_updates.json'), JSON.stringify(updates, null, 2));
        console.log(`Saved full proposed updates to scripts/clean_desc_updates.json`);

        console.log(`\nReady to update ${updates.length} homes.`);
        let successCount = 0;
        let failCount = 0;

        for (const u of updates) {
            const { error: upErr } = await supabase
                .from('homes')
                .update({ home_of_month_description: u.new })
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
    } else {
        console.log('No HTML was found in the descriptions. They appear to be clean already.');
    }
}

run();
