
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkPolicies() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'media_items'");
        console.log("Policies for media_items:");
        console.table(res.rows);
    } catch (err) {
        console.error("Error connected to DB:", err);
    } finally {
        await client.end();
    }
}

checkPolicies();
