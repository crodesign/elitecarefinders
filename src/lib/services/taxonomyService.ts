import { supabase } from '@/lib/supabase';
import type { Taxonomy } from '@/types';

// Database row type (matches actual Supabase schema)
interface TaxonomyRow {
    id: string;
    name: string;      // This is the "plural" display name in the DB
    type: string;      // This is the "singular" type identifier in the DB
    slug: string;
    content_types?: string[]; // Array column
    created_at: string;
    updated_at: string;
}

// Convert database row to frontend type
function toTaxonomy(row: TaxonomyRow): Taxonomy {
    return {
        id: row.id,
        singularName: row.type,    // 'type' maps to singularName
        pluralName: row.name,      // 'name' maps to pluralName
        slug: row.slug,
        contentTypes: row.content_types || [], // Map DB column to frontend property
    };
}

export async function getTaxonomies(): Promise<Taxonomy[]> {
    const { data, error } = await supabase
        .from('taxonomies')
        .select('*')
        .order('name');  // Order by 'name' since 'singular_name' doesn't exist

    if (error) throw error;
    return (data as TaxonomyRow[]).map(toTaxonomy);
}

export async function getTaxonomyById(id: string): Promise<Taxonomy | null> {
    const { data, error } = await supabase
        .from('taxonomies')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return toTaxonomy(data as TaxonomyRow);
}

export interface CreateTaxonomyInput {
    singularName: string;
    pluralName: string;
    slug: string;
    contentTypes?: string[];
}

export async function createTaxonomy(input: CreateTaxonomyInput): Promise<Taxonomy> {
    const { data, error } = await supabase
        .from('taxonomies')
        .insert({
            type: input.singularName,   // 'type' column for singular name
            name: input.pluralName,     // 'name' column for plural name
            slug: input.slug,
            content_types: input.contentTypes,
        })
        .select()
        .single();

    if (error) throw error;
    return toTaxonomy(data as TaxonomyRow);
}

export async function updateTaxonomy(id: string, input: Partial<CreateTaxonomyInput>): Promise<Taxonomy> {
    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (input.singularName !== undefined) updateData.type = input.singularName;  // 'type' column
    if (input.pluralName !== undefined) updateData.name = input.pluralName;      // 'name' column
    if (input.pluralName !== undefined) updateData.name = input.pluralName;      // 'name' column
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.contentTypes !== undefined) updateData.content_types = input.contentTypes;

    const { data, error } = await supabase
        .from('taxonomies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return toTaxonomy(data as TaxonomyRow);
}

export async function deleteTaxonomy(id: string): Promise<void> {
    const { error } = await supabase
        .from('taxonomies')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
