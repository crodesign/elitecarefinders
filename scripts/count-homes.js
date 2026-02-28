'use strict';
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('homes').select('id', { count: 'exact', head: true })
    .then(({ count }) => { console.log('Total homes in DB:', count); process.exit(0); });
