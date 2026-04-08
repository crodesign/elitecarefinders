import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

interface ImportReview {
    name: string;
    rating: number;
    text: string;
    date: string;
    photoUrl: string | null;
}

function generateExternalId(review: ImportReview): string {
    const raw = `facebook:${review.name}:${review.date}`;
    return 'fb_' + crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

export async function POST(request: Request) {
    try {
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { data: profile } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (!profile || !['super_admin', 'system_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const serviceSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const { reviews } = await request.json() as { reviews: ImportReview[] };

        if (!reviews?.length) {
            return NextResponse.json({ error: 'No reviews provided' }, { status: 400 });
        }

        const transformed = reviews.map(rev => ({
            external_id: generateExternalId(rev),
            author_name: rev.name,
            author_photo_url: rev.photoUrl,
            rating: Math.round(rev.rating),
            content: rev.text,
            source: 'facebook',
            source_link: null,
            status: 'approved',
            entity_id: '00000000-0000-0000-0000-000000000000',
            created_at: rev.date,
        }));

        const { error: upsertError } = await serviceSupabase
            .from('reviews')
            .upsert(transformed, { onConflict: 'external_id' });

        if (upsertError) throw upsertError;

        return NextResponse.json({
            imported: transformed.length,
            message: `Successfully imported ${transformed.length} Facebook reviews`,
        });
    } catch (error: any) {
        console.error('Error importing reviews:', error);
        return NextResponse.json({ error: 'Failed to import reviews', details: error.message }, { status: 500 });
    }
}
