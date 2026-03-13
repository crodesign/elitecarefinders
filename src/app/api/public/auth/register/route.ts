import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { mergeFavorites } from '@/lib/services/favoritesService';
import type { Favorite } from '@/types';

// POST /api/public/auth/register
// Body: { email, password, nickname?, phone?, favorites?: Favorite[] }
export async function POST(request: Request) {
    const body = await request.json();
    const { email, password, nickname, phone, favorites } = body;

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    if (!/[A-Z]/.test(password)) return NextResponse.json({ error: 'Password must contain at least one uppercase letter.' }, { status: 400 });
    if (!/[a-z]/.test(password)) return NextResponse.json({ error: 'Password must contain at least one lowercase letter.' }, { status: 400 });
    if (!/[0-9]/.test(password)) return NextResponse.json({ error: 'Password must contain at least one number.' }, { status: 400 });
    if (!/[^A-Za-z0-9]/.test(password)) return NextResponse.json({ error: 'Password must contain at least one special character.' }, { status: 400 });

    const admin = createAdminClient();

    // Create the Supabase auth user (email confirmed immediately for simplicity)
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (createError || !createData.user) {
        return NextResponse.json(
            { error: createError?.message ?? 'Registration failed' },
            { status: 400 }
        );
    }

    const userId = createData.user.id;
    const displayName = nickname?.trim() || email.split('@')[0];

    // Create user_profiles record
    const { error: profileError } = await admin
        .from('user_profiles')
        .insert({
            user_id: userId,
            full_name: displayName,
            nickname: nickname?.trim() || null,
            phone: phone?.trim() || null,
        });

    if (profileError) {
        // Non-fatal — user was created, profile failed. Log and continue.
        console.error('[register] profile insert error:', profileError.message);
    }

    // Merge any cookie favorites passed from the client
    if (Array.isArray(favorites) && favorites.length > 0) {
        try {
            await mergeFavorites(userId, favorites as Favorite[]);
        } catch (err) {
            console.error('[register] merge favorites error:', err);
        }
    }

    // Sign in to return a session the client can use
    const { data: signInData, error: signInError } = await admin.auth.signInWithPassword({
        email,
        password,
    });

    if (signInError || !signInData.session) {
        // User was created but sign-in failed — tell client to sign in manually
        return NextResponse.json({ ok: true, session: null });
    }

    return NextResponse.json({ ok: true, session: signInData.session });
}
