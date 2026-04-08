import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
    try {
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { data: profile } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (!profile || !['super_admin', 'system_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const serviceSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data: integration } = await serviceSupabase
            .from('google_integrations')
            .select('*')
            .limit(1)
            .single();

        if (!integration?.refresh_token) {
            return NextResponse.json({ error: 'No Google integration found' }, { status: 404 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: integration.refresh_token });

        const mybusinessinfo = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client });
        const mybusinessaccountmanagement = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client });

        const accountsList = await mybusinessaccountmanagement.accounts.list();
        if (!accountsList.data.accounts?.length) {
            return NextResponse.json({ error: 'No Google Business accounts found' }, { status: 404 });
        }

        const locations: Array<{
            accountId: string;
            accountName: string;
            locationId: string;
            locationTitle: string;
        }> = [];

        for (const account of accountsList.data.accounts) {
            try {
                const locationsList = await mybusinessinfo.accounts.locations.list({
                    parent: account.name!,
                    readMask: 'name,title'
                });

                for (const loc of (locationsList as any).data?.locations || []) {
                    locations.push({
                        accountId: account.name!,
                        accountName: account.accountName || account.name!,
                        locationId: loc.name!,
                        locationTitle: loc.title || loc.name!,
                    });
                }
            } catch (e: any) {
                console.error(`Error listing locations for ${account.name}:`, e.message);
            }
        }

        return NextResponse.json({ locations });
    } catch (error: any) {
        console.error('Error fetching Google locations:', error);
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }
}
