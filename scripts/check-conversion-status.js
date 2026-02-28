'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { count: totalJpg } = await supabase.from('media_items')
        .select('id', { count: 'exact', head: true })
        .like('url', '/images/media/%')
        .not('url', 'like', '%.webp');

    const { count: noVariants } = await supabase.from('media_items')
        .select('id', { count: 'exact', head: true })
        .like('url', '/images/media/%')
        .is('url_large', null);

    const { count: total } = await supabase.from('media_items')
        .select('id', { count: 'exact', head: true })
        .like('url', '/images/media/%');

    console.log(`Total media items:       ${total}`);
    console.log(`Still needs conversion:  ${totalJpg}`);
    console.log(`Missing variants:        ${noVariants}`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
