const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function checkSchema() {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

    // To hit postgres directly, try to parse a potential connection string if it exists in .env
    const dbUrlMatch = envContent.match(/DATABASE_URL="?(.*?)"?$/m);

    if (dbUrlMatch) {
        const client = new Client({ connectionString: dbUrlMatch[1] });
        await client.connect();

        const res = await client.query(`
           SELECT column_name, data_type 
           FROM information_schema.columns 
           WHERE table_name = 'posts';
       `);
        console.log("Columns:", res.rows);

        const fks = await client.query(`
           SELECT
               tc.constraint_name,
               kcu.column_name,
               ccu.table_schema AS foreign_table_schema,
               ccu.table_name AS foreign_table_name,
               ccu.column_name AS foreign_column_name 
           FROM 
               information_schema.table_constraints AS tc 
               JOIN information_schema.key_column_usage AS kcu
                 ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
               JOIN information_schema.constraint_column_usage AS ccu
                 ON ccu.constraint_name = tc.constraint_name
                 AND ccu.table_schema = tc.table_schema
           WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='posts';
       `);
        console.log("Foreign Keys:", fks.rows);

        await client.end();
    } else {
        console.log("No DATABASE_URL found.");
    }
}

checkSchema();
