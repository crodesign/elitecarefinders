import { supabase } from '@/lib/supabase';
import type { Taxonomy, TaxonomyType } from '@/types';

// Database row type (snake_case from Supabase)
interface TaxonomyRow {
    id: string;
    type: TaxonomyType;
    name: string;
    slug: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

// Convert database row to frontend type
function toTaxonomy(row: TaxonomyRow): Taxonomy {
    return {
        id: row.id,
        type: row.type,
        name: row.name,
        slug: row.slug,
        description: row.description || undefined,
    };
}

export async function getTaxonomies(): Promise<Taxonomy[]> {
    const { data, error } = await supabase
        .from('taxonomies')
        .select('*')
        .order('name');

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
    type: TaxonomyType;
    name: string;
    slug: string;
    description?: string;
}

export async function createTaxonomy(input: CreateTaxonomyInput): Promise<Taxonomy> {
    const { data, error } = await supabase
        .from('taxonomies')
        .insert({
            type: input.type,
            name: input.name,
            slug: input.slug,
            description: input.description || null,
        })
        .select()
        .single();

    if (error) throw error;
    return toTaxonomy(data as TaxonomyRow);
}

export async function updateTaxonomy(id: string, input: Partial<CreateTaxonomyInput>): Promise<Taxonomy> {
    const { data, error } = await supabase
        .from('taxonomies')
        .update({
            ...input,
            updated_at: new Date().toISOString(),
        })
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
