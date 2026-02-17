
const fs = require('fs');
const path = require('path');

function getProjectRef() {
    try {
        const envPath = path.resolve(__dirname, '.env.local');
        if (!fs.existsSync(envPath)) {
            console.log('No .env.local found');
            return;
        }
        const envFile = fs.readFileSync(envPath, 'utf8');
        const match = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=https:\/\/([^.]+)\.supabase\.co/);
        if (match && match[1]) {
            console.log(`Configured Project Ref: ${match[1]}`);
        } else {
            console.log('Could not parse Project Ref from NEXT_PUBLIC_SUPABASE_URL');
            // Print the URL (masked) to help debug
            const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
            if (urlMatch) console.log(`URL found: ${urlMatch[1]}`);
        }
    } catch (e) {
        console.error('Error reading .env.local', e);
    }
}

getProjectRef();
