import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const baseUrl = `${url.protocol}//${url.host}`;

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/admin/reviews?error=No+code+provided`);
    }

    const REDIRECT_URI = `${baseUrl}/api/admin/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );

    try {
        const { tokens } = await oauth2Client.getToken(code);

        // Ensure we got a refresh token
        if (!tokens.refresh_token) {
            return NextResponse.redirect(`${baseUrl}/admin/reviews?error=No+refresh+token+received.+Go+to+Google+Account+Permissions,+remove+the+app,+and+try+again.`);
        }

        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        // Security check: Must be admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: profile } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (!profile || !['super_admin', 'system_admin'].includes(profile.role)) {
            throw new Error("Unauthorized");
        }

        // Drop any existing integrations and insert the new one
        await supabase.from('google_integrations').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

        const { error: insertError } = await supabase
            .from('google_integrations')
            .insert([{ refresh_token: tokens.refresh_token }]);

        if (insertError) throw insertError;

        return NextResponse.redirect(`${baseUrl}/admin/reviews?success=Google+account+connected+successfully`);

    } catch (error: any) {
        console.error('Error during Google callback:', error);
        return NextResponse.redirect(`${baseUrl}/admin/reviews?error=Authentication+failed`);
    }
}
