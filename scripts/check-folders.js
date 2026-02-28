'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('media_folders').select('id,name,slug,path').not('parent_id','is',null).ilike('slug','aiea%')
    .then(({ data }) => { data.forEach(f => console.log(`slug="${f.slug}" name="${f.name}" path="${f.path}"`)); process.exit(0); });
