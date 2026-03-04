const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    // Check homes
    const { data: home, error: homeErr } = await s.from('homes')
        .select('id, title, slug, images, team_images')
        .eq('slug', 'aiea-care-home-coming-soon')
        .single();
    if (homeErr) { console.error('homes error:', homeErr.message); }
    else {
        console.log('Home: id=%s title=%s images=%d team_images=%d',
            home.id, home.title, home.images?.length, home.team_images?.length);
        console.log('images:', home.images);
    }

    // Check what columns exist by fetching one row with *
    const { data: row } = await s.from('homes').select('*').limit(1).single();
    if (row) {
        const cols = Object.keys(row);
        const imageCols = cols.filter(c => c.includes('image') || c.includes('photo') || c.includes('cuisine'));
        console.log('\nhomes table image-related columns:', imageCols);
    }

    // Check facilities
    const { data: frow } = await s.from('facilities').select('*').limit(1).single();
    if (frow) {
        const cols = Object.keys(frow);
        const imageCols = cols.filter(c => c.includes('image') || c.includes('photo') || c.includes('cuisine'));
        console.log('facilities table image-related columns:', imageCols);
    }
}
main().catch(console.error);
