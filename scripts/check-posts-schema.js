const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkSchema() {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

    const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

    // Trying to fetch one post and its author to see the error
    const { data: posts, error: postError } = await supabase
        .from('posts')
        .select(`
            *,
            author:author_id(id, email)
        `)
        .limit(1);

    console.log("Joined fetch result:", postError ? postError.message : "Success");

    // Also let's try calling Postgres functions if we can, or just get column definitions
    const { data, error } = await supabase.rpc('get_table_columns_debug', { table_name: 'posts' });
    if (error) {
        console.log("Could not rpc schema, let's just insert one locally with postService to see exact error.");
    }
}

checkSchema();
