import { supabase } from '@/lib/supabase';
import type {
    RoomFieldCategory,
    RoomFieldDefinition,
    RoomFixedFieldOption,
    FixedFieldType
} from '@/types';

// ============================================================================
// Database Row Types
// ============================================================================

interface CategoryRow {
    id: string;
    name: string;
    slug: string;
    display_order: number;
    section: 'room_details' | 'location_details' | 'care_provider_details';
    column_number: number;
    public_column_number: number | null;
    icon: string | null;
    created_at: string;
}

interface FieldDefinitionRow {
    id: string;
    name: string;
    slug: string;
    type: 'boolean' | 'single' | 'multi' | 'text' | 'textarea' | 'number' | 'currency' | 'phone' | 'email' | 'dropdown';
    target_type: 'home' | 'facility' | 'both';
    options: string[] | null;
    category_id: string;
    display_order: number;
    is_active: boolean;
    is_public: boolean;
    created_at: string;
}

interface FixedFieldOptionRow {
    id: string;
    field_type: FixedFieldType;
    value: string;
    display_order: number;
    is_active: boolean;
    icon: string | null;
}

interface FixedFieldTypeRow {
    field_type: string;
    icon: string | null;
}

// ============================================================================
// Converters
// ============================================================================

function toCategory(row: CategoryRow): RoomFieldCategory {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        displayOrder: row.display_order,
        section: row.section || 'room_details',
        columnNumber: row.column_number || 1,
        publicColumnNumber: row.public_column_number ?? null,
        icon: row.icon || undefined,
        createdAt: row.created_at,
    };
}

function toFieldDefinition(row: FieldDefinitionRow): RoomFieldDefinition {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        type: row.type,
        targetType: row.target_type,
        options: row.options || undefined,
        categoryId: row.category_id,
        displayOrder: row.display_order,
        isActive: row.is_active,
        isPublic: row.is_public ?? true,
        createdAt: row.created_at,
    };
}

function toFixedFieldOption(row: FixedFieldOptionRow): RoomFixedFieldOption {
    return {
        id: row.id,
        fieldType: row.field_type,
        value: row.value,
        displayOrder: row.display_order,
        isActive: row.is_active,
        icon: row.icon || undefined,
    };
}

// ============================================================================
// Categories CRUD
// ============================================================================

export async function getRoomFieldCategories(): Promise<RoomFieldCategory[]> {
    const { data, error } = await supabase
        .from('room_field_categories')
        .select('*')
        .order('display_order');

    if (error) throw error;
    return (data as CategoryRow[]).map(toCategory);
}

export async function createRoomFieldCategory(
    name: string,
    section: 'room_details' | 'location_details' | 'care_provider_details' = 'room_details',
    columnNumber: number = 1,
    icon?: string
): Promise<RoomFieldCategory> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Get max display order
    const { data: existing } = await supabase
        .from('room_field_categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

    const displayOrder = existing && existing.length > 0
        ? (existing[0] as CategoryRow).display_order + 1
        : 1;

    const { data, error } = await supabase
        .from('room_field_categories')
        .insert({ name, slug, display_order: displayOrder, section, column_number: columnNumber, icon: icon || null })
        .select()
        .single();

    if (error) throw error;
    return toCategory(data as CategoryRow);
}

export async function updateRoomFieldCategory(
    id: string,
    name: string,
    section: 'room_details' | 'location_details' | 'care_provider_details',
    columnNumber?: number,
    icon?: string | null,
    publicColumnNumber?: number | null
): Promise<RoomFieldCategory> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const updates: any = { name, slug, section };
    if (columnNumber !== undefined) updates.column_number = columnNumber;
    if (icon !== undefined) updates.icon = icon || null;
    if (publicColumnNumber !== undefined) updates.public_column_number = publicColumnNumber;

    const { data, error } = await supabase
        .from('room_field_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return toCategory(data as CategoryRow);
}

export async function deleteRoomFieldCategory(id: string): Promise<void> {
    const { error } = await supabase
        .from('room_field_categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function reorderRoomFieldCategories(
    orderedIds: string[]
): Promise<void> {
    const updates = orderedIds.map((id, index) =>
        supabase
            .from('room_field_categories')
            .update({ display_order: index + 1 })
            .eq('id', id)
    );

    await Promise.all(updates);
}

// ============================================================================
// Field Definitions CRUD
// ============================================================================

export async function getRoomFieldDefinitions(): Promise<RoomFieldDefinition[]> {
    const { data, error } = await supabase
        .from('room_field_definitions')
        .select('*')
        .order('display_order');

    if (error) throw error;
    return (data as FieldDefinitionRow[]).map(toFieldDefinition);
}

export async function getRoomFieldDefinitionsByCategory(
    categoryId: string
): Promise<RoomFieldDefinition[]> {
    const { data, error } = await supabase
        .from('room_field_definitions')
        .select('*')
        .eq('category_id', categoryId)
        .order('display_order');

    if (error) throw error;
    return (data as FieldDefinitionRow[]).map(toFieldDefinition);
}

export interface CreateFieldDefinitionInput {
    name: string;
    type: 'boolean' | 'single' | 'multi' | 'text' | 'textarea' | 'number' | 'currency' | 'phone' | 'email' | 'dropdown';
    targetType: 'home' | 'facility' | 'both';
    options?: string[];
    categoryId: string;
}

export async function createRoomFieldDefinition(
    input: CreateFieldDefinitionInput
): Promise<RoomFieldDefinition> {
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Get max display order for this category to insert at bottom
    const { data: existing } = await supabase
        .from('room_field_definitions')
        .select('display_order')
        .eq('category_id', input.categoryId)
        .order('display_order', { ascending: false })
        .limit(1);

    const displayOrder = existing && existing.length > 0
        ? (existing[0] as FieldDefinitionRow).display_order + 1
        : 0;

    const { data, error } = await supabase
        .from('room_field_definitions')
        .insert({
            name: input.name,
            slug,
            type: input.type,
            target_type: input.targetType,
            options: input.options || [],
            category_id: input.categoryId,
            display_order: displayOrder,
            is_active: true,
        })
        .select()
        .single();

    if (error) throw error;
    return toFieldDefinition(data as FieldDefinitionRow);
}

export async function updateRoomFieldDefinition(
    id: string,
    input: Partial<CreateFieldDefinitionInput>
): Promise<RoomFieldDefinition> {
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) {
        updateData.name = input.name;
        updateData.slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (input.type !== undefined) updateData.type = input.type;
    if (input.targetType !== undefined) updateData.target_type = input.targetType;
    if (input.options !== undefined) updateData.options = input.options;
    if (input.categoryId !== undefined) updateData.category_id = input.categoryId;

    const { data, error } = await supabase
        .from('room_field_definitions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return toFieldDefinition(data as FieldDefinitionRow);
}

export async function toggleRoomFieldDefinition(
    id: string,
    isActive: boolean
): Promise<void> {
    const { error } = await supabase
        .from('room_field_definitions')
        .update({ is_active: isActive })
        .eq('id', id);

    if (error) throw error;
}

export async function toggleRoomFieldPublic(id: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase
        .rpc('set_field_public', { field_id: id, new_value: isPublic });

    if (error) throw error;
}

export async function deleteRoomFieldDefinition(id: string): Promise<void> {
    const { error } = await supabase
        .from('room_field_definitions')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================================================
// Fixed Field Options CRUD
// ============================================================================

export async function getFixedFieldOptions(
    fieldType?: FixedFieldType
): Promise<RoomFixedFieldOption[]> {
    let query = supabase
        .from('room_fixed_field_options')
        .select('*')
        .order('display_order');

    if (fieldType) {
        query = query.eq('field_type', fieldType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as FixedFieldOptionRow[]).map(toFixedFieldOption);
}

export async function createFixedFieldOption(
    fieldType: FixedFieldType,
    value: string,
    icon?: string
): Promise<RoomFixedFieldOption> {
    // Get max display order for this field type
    const { data: existing } = await supabase
        .from('room_fixed_field_options')
        .select('display_order')
        .eq('field_type', fieldType)
        .order('display_order', { ascending: false })
        .limit(1);

    const displayOrder = existing && existing.length > 0
        ? (existing[0] as FixedFieldOptionRow).display_order + 1
        : 1;

    const { data, error } = await supabase
        .from('room_fixed_field_options')
        .insert({
            field_type: fieldType,
            value,
            display_order: displayOrder,
            is_active: true,
            icon: icon || null,
        })
        .select()
        .single();

    if (error) throw error;
    return toFixedFieldOption(data as FixedFieldOptionRow);
}

export async function updateFixedFieldOption(
    id: string,
    value: string,
    icon?: string | null
): Promise<RoomFixedFieldOption> {
    const updates: any = { value };
    if (icon !== undefined) updates.icon = icon || null;
    const { data, error } = await supabase
        .from('room_fixed_field_options')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return toFixedFieldOption(data as FixedFieldOptionRow);
}

export async function deleteFixedFieldOption(id: string): Promise<void> {
    const { error } = await supabase
        .from('room_fixed_field_options')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// ============================================================================
// Fixed Field Types (Icons)
// ============================================================================

export async function getFixedFieldTypeIcons(): Promise<Record<string, string>> {
    const { data, error } = await supabase
        .from('room_fixed_field_types')
        .select('*');

    if (error) throw error;

    const iconMap: Record<string, string> = {};
    (data as FixedFieldTypeRow[]).forEach(row => {
        if (row.icon) {
            iconMap[row.field_type] = row.icon;
        }
    });

    return iconMap;
}

export async function updateFixedFieldTypeIcon(
    fieldType: string,
    icon: string | null
): Promise<void> {
    const { error } = await supabase
        .from('room_fixed_field_types')
        .upsert({
            field_type: fieldType,
            icon: icon,
            updated_at: new Date().toISOString(),
        });

    if (error) throw error;
}

export async function reorderRoomFields(updates: { id: string; display_order: number }[]): Promise<void> {
    const promises = updates.map(update =>
        supabase
            .from('room_field_definitions')
            .update({ display_order: update.display_order })
            .eq('id', update.id)
    );

    const results = await Promise.all(promises);

    // Check for errors
    const error = results.find(r => r.error)?.error;
    if (error) {
        console.error('Error reordering fields:', error);
        throw error;
    }
}

export async function reorderFixedFieldOptions(updates: { id: string; display_order: number }[]): Promise<void> {
    const promises = updates.map(update =>
        supabase
            .from('room_fixed_field_options')
            .update({ display_order: update.display_order })
            .eq('id', update.id)
    );

    const results = await Promise.all(promises);

    // Check for errors
    const error = results.find(r => r.error)?.error;
    if (error) {
        console.error('Error reordering fixed field options:', error);
        throw error;
    }
}
