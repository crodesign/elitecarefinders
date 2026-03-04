const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const imgKey = (obj) => Object.keys(obj || {}).filter(k =>
    k.includes('image') || k.includes('photo') || k.includes('media') || k.includes('logo') || k.includes('cover')
);

async function main() {
    const [h, f, p] = await Promise.all([
        s.from('homes').select('*').limit(1).single(),
        s.from('facilities').select('*').limit(1).single(),
        s.from('posts').select('*').limit(1).single(),
    ]);
    console.log('homes image cols:', imgKey(h.data));
    console.log('facilities image cols:', imgKey(f.data));
    console.log('posts image cols:', imgKey(p.data));

    // Also check team_images and metadata on facilities
    const { data: fac } = await s.from('facilities').select('id, team_images, metadata').limit(3);
    fac?.forEach(f => {
        if (f.team_images?.length) console.log('facility team_images sample:', f.team_images[0]);
        if (f.metadata) {
            const meta = f.metadata;
            const metaKeys = Object.keys(meta).filter(k => k.includes('image') || k.includes('photo'));
            if (metaKeys.length) console.log('facility metadata image keys:', metaKeys);
        }
    });

    // Check posts for featured_image or metadata
    const { data: posts } = await s.from('posts').select('id, metadata').limit(3);
    posts?.forEach(p => {
        if (p.metadata) {
            const meta = p.metadata;
            const metaKeys = Object.keys(meta).filter(k => k.includes('image') || k.includes('photo') || k.includes('featured'));
            if (metaKeys.length) console.log('post metadata image keys:', metaKeys, '→', metaKeys.map(k => meta[k]).join(', '));
        }
    });
}
main().catch(console.error);
