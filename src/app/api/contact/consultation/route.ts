import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    const { fullName, phone, email, neighborhood, message } = await request.json();

    if (!fullName || !phone || !email) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
        await resend.emails.send({
            from: 'Elite CareFinders <noreply@elitecarefinders.com>',
            to: 'clients@crodesign.com',
            replyTo: email,
            subject: `Consultation Request from ${fullName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #239ddb;">New Consultation Request</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #666; width: 160px;"><strong>Name</strong></td><td style="padding: 8px 0;">${fullName}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;"><strong>Phone</strong></td><td style="padding: 8px 0;">${phone}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;"><strong>Email</strong></td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
                        <tr><td style="padding: 8px 0; color: #666;"><strong>Neighborhood</strong></td><td style="padding: 8px 0;">${neighborhood || '—'}</td></tr>
                    </table>
                    <h3 style="color: #333; margin-top: 24px;">Message</h3>
                    <p style="color: #444; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Resend error:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
