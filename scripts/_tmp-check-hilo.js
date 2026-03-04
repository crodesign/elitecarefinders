require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Check if any record exists for hilo-1001-big-island-1 with any extension
    const { data, error } = await sb
        .from('media_items')
        .select('id, filename, url, mime_type, width, height, folder_id')
        .like('filename', 'hilo-1001-big-island-1%');
    if (error) { console.error(error.message); return; }
    console.log('Records matching hilo-1001-big-island-1*:');
    data.forEach(i => console.log('  ' + i.filename + ' | ' + i.mime_type + ' | ' + i.width + 'x' + i.height));
    if (data.length === 0) console.log('  (none)');

    // Also verify the file exists on R2
    const url = 'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/hilo-1001-big-island-1.webp';
    const res = await fetch(url, { method: 'HEAD' });
    console.log('\nR2 HEAD ' + url + ': ' + res.status + ' ' + res.statusText);
    if (res.ok) {
        console.log('  Content-Type:', res.headers.get('content-type'));
        console.log('  Content-Length:', res.headers.get('content-length'));
    }
    process.exit(0);
}
run();
