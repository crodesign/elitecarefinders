const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testDelete() {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

    const supabase = createClient(urlMatch[1], serviceKeyMatch[1]);

    // Create a dummy post
    const { data: post, error: createError } = await supabase
        .from('posts')
        .insert({ title: 'Test Delete', slug: 'test-delete-' + Date.now(), post_type: 'general' })
        .select()
        .single();

    if (createError) {
        console.error('Failed to create test post:', createError);
        return;
    }

    console.log(`Created test post: ${post.id}`);

    // Attempt delete
    const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

    if (deleteError) {
        console.error('Failed to delete post via service role (Constraint issue):', deleteError);
    } else {
        console.log('Successfully deleted post via service role.');
    }

    // Let's also check foreign keys targeting posts table
    const { Client } = require('pg');
    const dbUrlMatch = envContent.match(/DATABASE_URL="?(.*?)"?$/m);
    if (dbUrlMatch) {
        const client = new Client({ connectionString: dbUrlMatch[1] });
        await client.connect();

        const fks = await client.query(`
            SELECT
                tc.constraint_name,
                tc.table_name AS referencing_table,
                kcu.column_name AS referencing_column
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'posts';
        `);
        console.log("Tables referencing posts:", fks.rows);
        await client.end();
    }
}

testDelete();
