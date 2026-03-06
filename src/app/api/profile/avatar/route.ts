import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { r2Upload, r2Delete, toPublicUrl, filenameFromUrl } from '@/lib/r2';

export async function POST(request: NextRequest) {
    const supabase = createServerSupabase();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Fetch current profile to get existing photo_url for cleanup
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('photo_url')
        .eq('user_id', userId)
        .single();

    // Process image: square crop to 200×200 WebP
    const buffer = Buffer.from(await file.arrayBuffer());
    const webpBuffer = await sharp(buffer)
        .resize(200, 200, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toBuffer();

    // Filename includes timestamp for cache-busting
    const filename = `avatars/avatar-${userId}-${Date.now()}.webp`;

    await r2Upload(filename, webpBuffer, 'image/webp');

    const newUrl = toPublicUrl(filename);

    // Update profile
    const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ photo_url: newUrl, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Delete old avatar from R2 (best-effort)
    if (profile?.photo_url) {
        try {
            const oldFilename = filenameFromUrl(profile.photo_url);
            if (oldFilename.startsWith('avatar-')) {
                await r2Delete(`avatars/${oldFilename}`);
            }
        } catch {
            // Non-fatal
        }
    }

    return NextResponse.json({ photo_url: newUrl });
}
