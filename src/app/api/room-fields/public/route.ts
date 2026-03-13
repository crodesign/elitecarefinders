import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/room-fields/public — public field definitions (isPublic + isActive)
export async function GET() {
    const supabase = createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [{ data: fields }, { data: categories }, { data: fixedOptions }] = await Promise.all([
        supabase
            .from('room_field_definitions')
            .select('id, name, slug, type, options, category_id, display_order, is_active, is_public, target_type')
            .eq('is_public', true)
            .eq('is_active', true)
            .order('display_order'),
        supabase
            .from('room_field_categories')
            .select('id, name, slug, section, display_order, column_number, public_column_number')
            .order('display_order'),
        supabase
            .from('room_fixed_field_options')
            .select('id, field_type, value, display_order')
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

    const mappedCategories = (categories ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        section: c.section,
        displayOrder: c.display_order,
        columnNumber: c.column_number ?? 1,
        publicColumnNumber: c.public_column_number ?? null,
    }));

    const fixedFieldOptions = (fixedOptions ?? []).map((o: any) => ({
        id: o.id,
        fieldType: o.field_type,
        value: o.value,
        displayOrder: o.display_order,
    }));

    return NextResponse.json({ fields: mapped, categories: mappedCategories, fixedFieldOptions });
}
