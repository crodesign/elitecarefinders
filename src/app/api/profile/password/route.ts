import { createClient as createServerSupabase, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// POST /api/profile/password - Update current user's password
export async function POST(request: Request) {
    const supabaseAdmin = createAdminClient();
    const supabase = createServerSupabase();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 });
    }

    if (newPassword.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    if (!/[A-Z]/.test(newPassword)) return NextResponse.json({ error: 'Password must contain at least one uppercase letter.' }, { status: 400 });
    if (!/[a-z]/.test(newPassword)) return NextResponse.json({ error: 'Password must contain at least one lowercase letter.' }, { status: 400 });
    if (!/[0-9]/.test(newPassword)) return NextResponse.json({ error: 'Password must contain at least one number.' }, { status: 400 });
    if (!/[^A-Za-z0-9]/.test(newPassword)) return NextResponse.json({ error: 'Password must contain at least one special character.' }, { status: 400 });

    // Verify current password by attempting sign-in
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email!,
        password: currentPassword,
    });

    if (signInError) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Update password using admin client
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        session.user.id,
        { password: newPassword }
    );

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Password updated successfully' });
}
