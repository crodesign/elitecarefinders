const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const R2 = process.env.R2_PUBLIC_URL;

async function main() {
    const [r2, local, { data: other }] = await Promise.all([
        supabase.from('media_items').select('*', { count: 'exact', head: true }).like('url', R2 + '%'),
        supabase.from('media_items').select('*', { count: 'exact', head: true }).like('url', '/images/media/%'),
        supabase.from('media_items').select('id, filename, url')
            .not('url', 'like', R2 + '%')
            .not('url', 'like', '/images/media/%'),
    ]);
    console.log('R2 URLs:   ', r2.count);
    console.log('Local URLs:', local.count);
    if (other && other.length > 0) {
        console.log('Other URLs:');
        other.forEach(i => console.log(' ', i.url));
    }
}
main().catch(console.error);
