require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 1. Get the home
    const { data: home, error: homeErr } = await supabase
        .from('homes')
        .select('title, images, videos')
        .eq('slug', 'hilo-1001-big-island')
        .single();

    if (homeErr) {
        console.error('Error fetching home', homeErr);
        return;
    }
    console.log('Home Images:', home);

    if (!home.images || home.images.length === 0) {
        console.log('No images found');
        return;
    }

    // 2. Query media for these images
    const { data: media, error: mediaErr } = await supabase
        .from('media')
        .select('url, caption')
        .in('url', home.images);

    if (mediaErr) {
        console.error('Error fetching media', mediaErr);
        return;
    }

    console.log('Media Captions Found:', media);
}

check();
