import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/room-fields/public — public field definitions (isPublic + isActive)
export async function GET() {
    const supabase = createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [{ data: fields }, { data: categories }] = await Promise.all([
        supabase
            .from('room_field_definitions')
            .select('id, name, slug, type, options, category_id, display_order, is_active, is_public, target_type')
            .eq('is_public', true)
            .eq('is_active', true)
            .order('display_order'),
        supabase
            .from('room_field_categories')
            .select('id, name, slug, section, display_order')
            .order('display_order'),
    ]);

    const mapped = (fields ?? []).map((f: any) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        type: f.type,
        options: f.options,
        categoryId: f.category_id,
        displayOrder: f.display_order,
        isActive: f.is_active,
        isPublic: f.is_public,
        targetType: f.target_type,
    }));

    return NextResponse.json({ fields: mapped, categories: categories ?? [] });
}
