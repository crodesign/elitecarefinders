// scripts/dump-trigger.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function dumpFunc() {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

    const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

    const { data, error } = await supabase.rpc('debug_get_function_src', { func_name: 'validate_contact_dependencies' });
    if (error) {
        console.error('RPC Error:', error.message);
    } else {
        // Write it to a file directly instead of logging to console to avoid powershell truncation
        fs.writeFileSync('rogue_function.txt', data);
        console.log('Saved to rogue_function.txt');
    }
}
dumpFunc();
