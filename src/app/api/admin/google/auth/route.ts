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
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        login_hint: 'denis@crodesign.com'
    });

    return NextResponse.redirect(authorizationUrl);
}
