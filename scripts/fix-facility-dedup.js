const { createClient } = require('@supabase/supabase-js');
const fs = require('fs'), path = require('path');
const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

sb.from('taxonomies')
  .update({ content_types: ['facilities'] })
  .eq('id', 'aaff7539-60ec-448d-ae56-5ee8763917f6')
  .select()
  .then(({ data, error }) => {
    if (error) console.error(error);
    else console.log('Updated content_types:', data[0].content_types);
  });
