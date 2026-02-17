const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

// Parse URL manually to handle special chars in password if formatted as url
let config;
try {
    const url = new URL(dbUrl);
    config = {
        user: url.username,
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: parseInt(url.port || '5432'),
        database: url.pathname.slice(1),
        ssl: { rejectUnauthorized: false }
    };
} catch (e) {
    console.error("Failed to parse URL, using string directly");
    config = {
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    };
}

const client = new Client(config);

async function inspect() {
    console.log('Connecting to database...');
    try {
        await client.connect();

        console.log('\n--- Media Tables (public) ---');
        const resTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'media%'
        `);
        console.table(resTables.rows);

        console.log('\n--- Policies on media_items ---');
        const resPoliciesItems = await client.query(`
            SELECT policyname, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename = 'media_items'
        `);
        console.table(resPoliciesItems.rows);

        console.log('\n--- Policies on media_folders ---');
        const resPoliciesFolders = await client.query(`
            SELECT policyname, cmd, qual, with_check
            FROM pg_policies 
            WHERE tablename = 'media_folders'
        `);
        console.table(resPoliciesFolders.rows);

        console.log('\n--- Triggers on media_items (raw) ---');
        // information_schema.triggers doesn't always show body
        // pg_trigger is better but harder to query without joins
        // We'll stick to info schema first
        const resTriggersItems = await client.query(`
            SELECT trigger_name, event_manipulation, action_statement 
            FROM information_schema.triggers 
            WHERE event_object_table = 'media_items'
        `);
        console.table(resTriggersItems.rows);

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

inspect();
