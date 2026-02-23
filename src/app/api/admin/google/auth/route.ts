import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
    // Determine the base URL dynamically based on the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const REDIRECT_URI = `${baseUrl}/api/admin/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );

    // Scopes needed to read Google Business Profile reviews
    const scopes = [
        'https://www.googleapis.com/auth/business.manage'
    ];

    const authorizationUrl = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',

        // Pass in the scopes array defined above.
        scope: scopes,

        // Force consent so we always get a fresh refresh_token if needed
        prompt: 'consent'
    });

    return NextResponse.redirect(authorizationUrl);
}
