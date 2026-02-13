
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', url);
console.log('Key length:', key ? key.length : 'MISSING');

async function test() {
    // Test 1: Health endpoint
    console.log('\n--- Test 1: Health Check ---');
    try {
        const res = await fetch(`${url}/auth/v1/health`, {
            headers: { 'apikey': key }
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${text.substring(0, 200)}`);
        console.log(`Is HTML: ${text.trim().startsWith('<')}`);
    } catch (e) {
        console.error('Health check failed:', e.message);
    }

    // Test 2: Login endpoint  
    console.log('\n--- Test 2: Login (token endpoint) ---');
    try {
        const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'clients@crodesign.com',
                password: 'test123',
                gotrue_meta_security: {}
            })
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Body: ${text.substring(0, 200)}`);
        console.log(`Is HTML: ${text.trim().startsWith('<')}`);
    } catch (e) {
        console.error('Login test failed:', e.message);
    }

    // Test 3: REST endpoint (different service)
    console.log('\n--- Test 3: REST API ---');
    try {
        const res = await fetch(`${url}/rest/v1/`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Body preview: ${text.substring(0, 100)}`);
        console.log(`Is HTML: ${text.trim().startsWith('<')}`);
    } catch (e) {
        console.error('REST test failed:', e.message);
    }
}

test();
