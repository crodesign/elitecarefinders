require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await sb
        .from('media_items')
        .select('filename, width, height, mime_type, url, created_at')
        .not('filename', 'like', '%-500x500%')
        .not('filename', 'like', '%-200x200%')
        .not('filename', 'like', '%-100x100%')
        .order('created_at', { ascending: false })
        .limit(10);
    if (error) { console.error(error.message); return; }
    console.log('10 most recent uploads:');
    data.forEach(i => console.log(`  ${i.filename} | ${i.width}x${i.height} | ${i.mime_type} | ${i.created_at}`));
    process.exit(0);
}
run();
