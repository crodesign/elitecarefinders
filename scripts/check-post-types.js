const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('posts').select('id, title, post_type, images, status').then(({ data }) => {
    data.forEach(p => console.log(p.post_type, '|', p.title, '| images:', (p.images || []).length, '| status:', p.status));
}).catch(console.error);
