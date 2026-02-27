const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
    const xmlPath = 'elitecarefinders.reviews.xml';
    if (!fs.existsSync(xmlPath)) {
        console.error(`File ${xmlPath} not found`);
        return;
    }

    const xml = fs.readFileSync(xmlPath, 'utf8');

    // Custom regex-based parser to avoid external dependencies
    const items = xml.split('<item>').slice(1).map(item => {
        const getText = (tag) => {
            const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
            let val = match ? match[1] : '';
            if (val.includes('<![CDATA[')) {
                val = val.split('<![CDATA[').pop().split(']]>')[0];
            }
            return val.trim();
        };

        const getMeta = (key) => {
            // Updated regex to handle meta values better
            const regex = new RegExp(`<wp:meta_key>(?:<!\\[CDATA\\[)?${key}(?:\\]\\]>)?<\\/wp:meta_key>\\s*<wp:meta_value>([\\s\\S]*?)<\\/wp:meta_value>`, 'g');
            const match = regex.exec(item);
            if (!match) return '';
            let val = match[1].trim();
            if (val.includes('<![CDATA[')) {
                val = val.split('<![CDATA[').pop().split(']]>')[0];
            }
            return val.trim();
        };

        const postType = getText('wp:post_type');
        if (postType !== 'reviews') return null;

        const title = getText('title');
        const content = getMeta('review_content') || getText('content:encoded');
        const date = getText('wp:post_date_gmt');
        const status = getText('wp:status') === 'publish' ? 'approved' : 'pending';
        const post_id = getText('wp:post_id');

        // Extract rating
        let rating = 5;
        const starMeta = getMeta('star_rating');
        if (starMeta) {
            const imgMatch = starMeta.match(/star-(\d)/);
            if (imgMatch) {
                rating = parseInt(imgMatch[1]);
            } else if (!isNaN(parseInt(starMeta)) && starMeta.trim().length > 0) {
                rating = parseInt(starMeta);
            }
        }

        // Clean title (remove suffixes)
        const author_name = title.replace(/ - Care Provider| - Client/gi, '').trim();

        return {
            external_id: `wp_${post_id}`,
            author_name,
            content,
            rating,
            status,
            created_at: date && date !== '0000-00-00 00:00:00' ? new Date(date).toISOString() : new Date().toISOString(),
            source: 'wordpress',
            entity_id: '00000000-0000-0000-0000-000000000000' // Placeholder
        };
    }).filter(Boolean);

    console.log(`Found ${items.length} reviews to migrate.`);

    for (const item of items) {
        const { error } = await supabase
            .from('reviews')
            .upsert(item, { onConflict: 'external_id' });

        if (error) {
            console.error(`Error migrating review ${item.external_id}:`, error.message);
        } else {
            console.log(`Migrated: ${item.author_name}`);
        }
    }
}

migrate().catch(console.error);
