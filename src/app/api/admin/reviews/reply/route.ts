import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
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

        const { reviewId, externalId, comment } = await request.json();

        if (!externalId || comment === undefined) {
            return NextResponse.json({ error: 'externalId and comment are required' }, { status: 400 });
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
            return NextResponse.json({ error: 'Google integration not configured' }, { status: 404 });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: integration.refresh_token });

        const { token } = await oauth2Client.getAccessToken();
        if (!token) throw new Error('Could not retrieve access token');

        // Google API: PUT /v4/{reviewName}/reply with body { comment }
        const replyUrl = `https://mybusiness.googleapis.com/v4/${externalId}/reply`;

        if (comment.trim()) {
            // Post or update reply
            const res = await fetch(replyUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ comment: comment.trim() }),
            });

            if (!res.ok) {
                const errBody = await res.text();
                throw new Error(`Google API error (${res.status}): ${errBody}`);
            }
        } else {
            // Delete reply if comment is empty
            const res = await fetch(replyUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!res.ok && res.status !== 404) {
                const errBody = await res.text();
                throw new Error(`Google API error (${res.status}): ${errBody}`);
            }
        }

        // Update the response in our database
        if (reviewId) {
            await serviceSupabase
                .from('reviews')
                .update({ response: comment.trim() || null })
                .eq('id', reviewId);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error posting Google reply:', error);
        return NextResponse.json({ error: 'Failed to post reply', details: error.message }, { status: 500 });
    }
}
