import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// POST /api/profile/listing/[id]/submit — submit draft for admin review
export async function POST(_request: Request, { params }: { params: { id: string } }) {
    const supabase = createServerSupabase();
    const supabaseAdmin = createAdminClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const entityId = params.id;
    const userId = session.user.id;

    // Verify assignment
    const { data: assignment } = await supabaseAdmin
        .from('user_entity_assignments')
        .select('id, entity_type')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .single();

    if (!assignment) return NextResponse.json({ error: 'Not assigned' }, { status: 403 });

    const table = assignment.entity_type === 'home' ? 'homes' : 'facilities';

    // Fetch entity info for the email
    const { data: entity } = await supabaseAdmin
        .from(table)
        .select('title, slug, local_user_draft, local_user_draft_status')
        .eq('id', entityId)
        .single();

    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    if (!entity.local_user_draft) return NextResponse.json({ error: 'No draft to submit' }, { status: 400 });

    // Mark as pending_review
    const { error: updateError } = await supabaseAdmin
        .from(table)
        .update({ local_user_draft_status: 'pending_review', updated_at: new Date().toISOString() })
        .eq('id', entityId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Get submitting user's profile for the email
    const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

    const submitterName = userProfile?.full_name ?? session.user.email ?? 'A local user';
    const entityLabel = assignment.entity_type === 'home' ? 'Care Home' : 'Facility';
    const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://elitecarefinders.com'}/admin/${assignment.entity_type === 'home' ? 'homes' : 'facilities'}?edit=${entity.slug}&tab=information`;

    // Get system admin emails
    const { data: systemAdmins } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .in('role', ['super_admin', 'system_admin']);

    let adminEmails: string[] = ['clients@crodesign.com']; // fallback
    if (systemAdmins && systemAdmins.length > 0) {
        const adminIds = systemAdmins.map((r: any) => r.user_id);
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        if (users) {
            const emails = users
                .filter((u: any) => adminIds.includes(u.id) && u.email)
                .map((u: any) => u.email as string);
            if (emails.length > 0) adminEmails = emails;
        }
    }

    // Send email notification
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: 'Elite CareFinders <noreply@elitecarefinders.com>',
            to: adminEmails,
            subject: `Listing Update Submitted: ${entity.title} (${entityLabel})`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #239ddb;">Listing Update Submitted for Review</h2>
                    <p style="color: #444;">A local user has submitted updates to a listing and is awaiting your approval.</p>

                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr><td style="padding: 8px 0; color: #666; width: 160px;"><strong>Listing</strong></td><td style="padding: 8px 0;">${entity.title}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;"><strong>Type</strong></td><td style="padding: 8px 0;">${entityLabel}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;"><strong>Submitted by</strong></td><td style="padding: 8px 0;">${submitterName}</td></tr>
                    </table>

                    <div style="margin-top: 28px;">
                        <a href="${adminUrl}" style="display: inline-block; background-color: #239ddb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                            Review &amp; Approve in Admin
                        </a>
                    </div>

                    <p style="color: #888; font-size: 12px; margin-top: 32px;">
                        This notification was sent because a local user submitted their listing profile for review on Elite CareFinders.
                    </p>
                </div>
            `,
        });
    } catch (emailError) {
        // Don't fail the submission if email fails — status is already updated
        console.error('Email notification failed:', emailError);
    }

    return NextResponse.json({ success: true });
}
