import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: roleRow } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).single();
    if (roleRow?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (!body.serviceAccountJson) {
        return NextResponse.json({ error: 'serviceAccountJson is required' }, { status: 400 });
    }

    let credentials: object;
    try {
        credentials = JSON.parse(body.serviceAccountJson);
    } catch {
        return NextResponse.json({ error: 'Invalid service account JSON' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    try {
        const admin = google.analyticsadmin({ version: 'v1beta', auth });

        // List all accounts, then their properties
        const accountsRes = await admin.accounts.list();
        const accounts = accountsRes.data.accounts || [];

        const propertyLists = await Promise.all(
            accounts.map(account =>
                admin.properties.list({ filter: `parent:${account.name}` })
                    .then(r => (r.data.properties || []).map(p => ({
                        id: p.name?.replace('properties/', '') ?? '',
                        name: p.displayName ?? 'Unnamed',
                        account: account.displayName ?? account.name ?? '',
                    })))
                    .catch(() => [])
            )
        );

        const properties = propertyLists.flat();
        return NextResponse.json({ properties });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to list properties';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
