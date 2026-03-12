import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Optional: Security to prevent unauthorized triggering
const CRON_SECRET = process.env.CRON_SECRET || 'sync-override';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const authHeader = request.headers.get('authorization');
    const override = url.searchParams.get('secret');

    // Secure the route: Require standard cron auth OR a valid secret param for manual triggers
    if (authHeader !== `Bearer ${CRON_SECRET}` && override !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!, // Need service role to bypass RLS for crons
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        // 1. Get the stored integration / refresh token
        const { data: integration, error: intError } = await supabase
            .from('google_integrations')
            .select('*')
            .limit(1)
            .single();

        if (intError || !integration?.refresh_token) {
            console.log('No active Google integration found. Skipping sync.');
            return NextResponse.json({ message: 'No integration configured' }, { status: 200 });
        }

        // 2. Setup Google Auth Client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: integration.refresh_token });

        // Instantiate Google My Business API 
        // Note: mybusinessbusinessinformation is used to get the location ID
        const mybusinessinfo = google.mybusinessbusinessinformation({ version: 'v1', auth: oauth2Client });
        const mybusinessaccountmanagement = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client });

        // 3. Get or find the Location ID (Account ID -> Location ID)
        let accountId = integration.account_id;
        let locationId = integration.location_id;

        // If we haven't stored the account/location IDs yet, find them automatically
        if (!accountId || !locationId) {
            const mybusinessaccountmanagement = google.mybusinessaccountmanagement({ version: 'v1', auth: oauth2Client });

            // Get first account
            const accountsList = await mybusinessaccountmanagement.accounts.list();
            if (!accountsList.data.accounts || accountsList.data.accounts.length === 0) {
                return NextResponse.json({ error: 'No Google Business accounts found for this user.' }, { status: 400 });
            }

            // Use the primary/first account
            accountId = accountsList.data.accounts[0].name;

            // Get first location under this account
            const locationsList = await mybusinessinfo.accounts.locations.list({
                parent: accountId,
                readMask: 'name,title'
            });

            if (!locationsList.data.locations || locationsList.data.locations.length === 0) {
                return NextResponse.json({ error: 'No Google Business locations found for this account.' }, { status: 400 });
            }

            locationId = locationsList.data.locations[0].name;

            // Save for future runs
            await supabase
                .from('google_integrations')
                .update({ account_id: accountId, location_id: locationId })
                .eq('id', integration.id);
        }

        // 4. Fetch Reviews
        // The Node.js client library doesn't expose mybusinessreviews natively in this version,
        // so we fetch directly using the standard Google API URL and our fresh access token.
        const { token } = await oauth2Client.getAccessToken();
        if (!token) throw new Error("Could not retrieve access token for syncing");

        // Reviews API parent: locations/{locationId}
        // locationId from mybusinessbusinessinformation is already "locations/{id}"
        const reviewsParent = locationId.startsWith('locations/') ? locationId : `locations/${locationId}`;
        const reviewsUrl = `https://mybusinessreviews.googleapis.com/v1/${reviewsParent}/reviews?pageSize=50&orderBy=updateTime desc`;

        console.log('[reviews sync] accountId:', accountId);
        console.log('[reviews sync] locationId:', locationId);
        console.log('[reviews sync] reviewsUrl:', reviewsUrl);

        const reviewsRes = await fetch(reviewsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('[reviews sync] response status:', reviewsRes.status);

        if (!reviewsRes.ok) {
            const errBody = await reviewsRes.text();
            throw new Error(`Google API error fetching reviews (${reviewsRes.status}): ${errBody}`);
        }

        const reviewsData = await reviewsRes.json();
        const externalReviews = reviewsData.reviews || [];

        if (externalReviews.length === 0) {
            return NextResponse.json({ message: 'Sync complete. No reviews found on Google.', syncedCount: 0 });
        }

        // 5. Transform and Upsert into Supabase
        const transformedReviews = externalReviews.map((rev: any) => {
            // Google names reviews like "accounts/X/locations/Y/reviews/Z"
            const externalId = rev.name;

            // Convert Google rating enum (e.g. "FIVE") to integer
            const ratingMap: Record<string, number> = {
                'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
            };
            const rating = ratingMap[rev.starRating || 'FIVE'] || 5;

            return {
                external_id: externalId,
                author_name: rev.reviewer?.displayName || 'Unknown',
                author_photo_url: rev.reviewer?.profilePhotoUrl || null,
                rating: rating,
                content: rev.comment || '',
                source: 'google',
                source_link: null, // GMB API doesn't provide a direct link easily here
                status: 'approved',
                entity_id: '00000000-0000-0000-0000-000000000000',
                created_at: rev.createTime || new Date().toISOString()
            };
        });

        // Upsert matching on external_id
        const { error: upsertError } = await supabase
            .from('reviews')
            .upsert(transformedReviews, { onConflict: 'external_id' });

        if (upsertError) throw upsertError;

        return NextResponse.json({
            message: 'Sync successful',
            syncedCount: transformedReviews.length
        });

    } catch (error: any) {
        console.error('Error syncing Google reviews:', error);

        // Specific error message for Quota Exceeded
        if (error.message?.includes('Quota exceeded') || error.code === 429) {
            return NextResponse.json(
                {
                    error: 'API Quota Exceeded',
                    details: 'Google Business Profile API quota exceeded. Please ensure the My Business API is fully approved/enabled in Google Cloud Console. This often happens if the project is in a restricted state or API approval is pending.'
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to sync reviews', details: error.message },
            { status: 500 }
        );
    }
}
