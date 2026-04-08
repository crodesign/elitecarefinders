import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { accountId, locationId, mapsUri } = await request.json();

        if (!accountId || !locationId) {
            return NextResponse.json({ error: 'accountId and locationId are required' }, { status: 400 });
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
            .select('id')
            .limit(1)
            .single();

        if (!integration) {
            return NextResponse.json({ error: 'No Google integration found' }, { status: 404 });
        }

        const updateData: any = { account_id: accountId, location_id: locationId };
        if (mapsUri) {
            updateData.google_maps_url = mapsUri;
        }

        const { error: updateError } = await serviceSupabase
            .from('google_integrations')
            .update(updateData)
            .eq('id', integration.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error selecting Google location:', error);
        return NextResponse.json({ error: 'Failed to save location' }, { status: 500 });
    }
}
