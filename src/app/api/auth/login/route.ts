
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        console.log('[API Login] Request received for:', email);
        console.log('[API Login] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const supabase = createClient();
        console.log('[API Login] Supabase client created');

        // 1. Connectivity Check (Health Endpoint)
        // This helps us distinguish between "Blocked Login" and "Blocked Connection"
        const healthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`;
        console.log('[API Login] Checking health at:', healthUrl);

        try {
            const healthRes = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    'User-Agent': 'EliteCareFinders-NextJS-Server/1.0',
                    'Cache-Control': 'no-store'
                },
                signal: AbortSignal.timeout(5000) // 5s timeout
            });
            const healthText = await healthRes.text();
            console.log(`[API Login] Health Check: ${healthRes.status} ${healthRes.statusText}`);

            if (!healthRes.ok) {
                console.log('[API Login] WARN: Health check non-200 response:', healthText.substring(0, 200));
            }
        } catch (healthErr: any) {
            console.error('[API Login] Health check FAILED:', healthErr.cause || healthErr.message);
        }

        // 2. Main Login Attempt (Raw Fetch to verify)
        // We do this to catch HTML errors that the supabase client hides
        const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`;
        console.log('[API Login] Attempting login verification at:', verifyUrl);

        try {
            const rawResponse = await fetch(verifyUrl, {
                method: 'POST',
                headers: {
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    'Content-Type': 'application/json',
                    'User-Agent': 'EliteCareFinders-NextJS-Server/1.0',
                    'Cache-Control': 'no-store'
                },
                body: JSON.stringify({ email, password, gotrue_meta_security: {} }),
                signal: AbortSignal.timeout(10000) // 10s timeout
            });
            const rawText = await rawResponse.text();
            console.log('[API Login] Verification status:', rawResponse.status);

            if (!rawResponse.ok && rawText.trim().startsWith('<')) {
                console.error('[API Login] CRITICAL: Received HTML instead of JSON during verification!');
                console.error('[API Login] HTML Preview:', rawText.substring(0, 500));

                return NextResponse.json({
                    error: `Upstream error: Received HTML from Supabase. Status: ${rawResponse.status}. This indicates a network block (e.g. firewall, VPN, or ISP issue).`
                }, { status: 502 });
            }
        } catch (fetchErr: any) {
            console.error('[API Login] Verification fetch failed:', fetchErr.cause || fetchErr.message);
        }

        // 3. Supabase Client Login (Actual processing)
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('[API Login] Supabase auth error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json({
            success: true,
            user: data.user,
            session: data.session
        });

    } catch (err: any) {
        console.error('[API Login] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
