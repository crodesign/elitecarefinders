import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { fullName, phone, email, state, location, listingName, listingType, description, careProvider } = await request.json();

    if (!fullName || !phone || !email || !state || !listingName || !listingType || !description) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        await resend.emails.send({
            from: 'Elite CareFinders <noreply@elitecarefinders.com>',
            to: 'clients@crodesign.com',
            replyTo: email,
            subject: `Network Application: ${listingName} (${listingType}) — ${state}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #239ddb;">New Network Application</h2>

                    <h3 style="color: #333; margin-top: 24px; margin-bottom: 8px;">Contact</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 6px 0; color: #666; width: 160px;"><strong>Name</strong></td><td style="padding: 6px 0;">${fullName}</td></tr>
                        <tr><td style="padding: 6px 0; color: #666;"><strong>Phone</strong></td><td style="padding: 6px 0;">${phone}</td></tr>
                        <tr><td style="padding: 6px 0; color: #666;"><strong>Email</strong></td><td style="padding: 6px 0;"><a href="mailto:${email}">${email}</a></td></tr>
                    </table>

                    <h3 style="color: #333; margin-top: 24px; margin-bottom: 8px;">Location</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 6px 0; color: #666; width: 160px;"><strong>State</strong></td><td style="padding: 6px 0;">${state}</td></tr>
                        <tr><td style="padding: 6px 0; color: #666;"><strong>${state === 'Hawaii' ? 'Island' : 'City'}</strong></td><td style="padding: 6px 0;">${location || '—'}</td></tr>
                    </table>

                    <h3 style="color: #333; margin-top: 24px; margin-bottom: 8px;">Listing</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 6px 0; color: #666; width: 160px;"><strong>Name</strong></td><td style="padding: 6px 0;">${listingName}</td></tr>
                        <tr><td style="padding: 6px 0; color: #666;"><strong>Type</strong></td><td style="padding: 6px 0;">${listingType}</td></tr>
                    </table>
                    <h4 style="color: #555; margin-top: 16px;">Description</h4>
                    <p style="color: #444; line-height: 1.6;">${description.replace(/\n/g, '<br>')}</p>

                    ${careProvider ? `
                    <h3 style="color: #333; margin-top: 24px; margin-bottom: 8px;">Care Provider</h3>
                    <p style="color: #444; line-height: 1.6;">${careProvider.replace(/\n/g, '<br>')}</p>
                    ` : ''}
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Resend error:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
