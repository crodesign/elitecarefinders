import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { fullName, email, phone, entityName, entityType } = await request.json();

    if (!fullName || !email || !phone) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const entityLabel = entityType === 'facility' ? 'Facility' : 'Home';

    try {
        await resend.emails.send({
            from: 'Elite CareFinders <noreply@elitecarefinders.com>',
            to: 'clients@crodesign.com',
            replyTo: email,
            subject: `Monthly Rates Request — ${entityName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #239ddb;">Monthly Rates Request</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px 0; color: #666; width: 160px;"><strong>${entityLabel}</strong></td><td style="padding: 8px 0;">${entityName}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;"><strong>Name</strong></td><td style="padding: 8px 0;">${fullName}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;"><strong>Phone</strong></td><td style="padding: 8px 0;">${phone}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;"><strong>Email</strong></td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
                    </table>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Resend error:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}
