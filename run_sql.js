// Script to run SQL migrations against Supabase
// Usage: node run_sql.js

const fs = require('fs');
const path = require('path');

// Load .env.local manually
function loadEnv() {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=');
            process.env[key] = value;
        }
    }
}

loadEnv();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
    console.log('Checking taxonomy_entries table...\n');

    // Check if table exists by trying to query it
    const { data, error: checkError } = await supabase
        .from('taxonomy_entries')
        .select('id')
        .limit(1);

    if (checkError && checkError.code === '42P01') {
        console.log('❌ Table does not exist.');
        console.log('\nSupabase JS client cannot create tables directly.');
        console.log('Please run the SQL in Supabase SQL Editor or install Supabase CLI.\n');
        console.log('SQL to run:');
        console.log('─'.repeat(60));
        console.log(`
CREATE TABLE IF NOT EXISTS taxonomy_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    taxonomy_id UUID NOT NULL REFERENCES taxonomies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(taxonomy_id, slug)
);

ALTER TABLE taxonomy_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to taxonomy_entries"
ON taxonomy_entries FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous write access to taxonomy_entries"
ON taxonomy_entries FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_taxonomy_entries_taxonomy_id ON taxonomy_entries(taxonomy_id);
`);
        console.log('─'.repeat(60));
    } else if (checkError) {
        console.error('Error:', checkError.message);
    } else {
        console.log('✅ taxonomy_entries table already exists!');
        console.log(`Found ${data?.length || 0} entries.`);
    }
}

runMigration().catch(console.error);
