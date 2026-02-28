'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { count: total } = await supabase.from('media_items')
        .select('id', { count: 'exact', head: true })
        .like('url', '/images/media/%');

    const { count: badMime } = await supabase.from('media_items')
        .select('id', { count: 'exact', head: true })
        .like('filename', '%.webp')
        .neq('mime_type', 'image/webp');

    const { count: noDims } = await supabase.from('media_items')
        .select('id', { count: 'exact', head: true })
        .like('url', '/images/media/%')
        .not('filename', 'like', '%-500x500.webp')
        .not('filename', 'like', '%-200x200.webp')
        .not('filename', 'like', '%-100x100.webp')
        .is('width', null);

    console.log('Total media items:    ', total);
    console.log('Wrong mime_type:      ', badMime);
    console.log('Missing dimensions:   ', noDims);
}
main().catch(e => { console.error(e.message); process.exit(1); });
