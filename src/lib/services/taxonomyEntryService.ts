import { supabase } from '@/lib/supabase';

// Types
export interface TaxonomyEntry {
    id: string;
    taxonomyId: string;
    name: string;
    slug: string;
    parentId: string | null;
    displayOrder: number;
    children?: TaxonomyEntry[];
}

interface TaxonomyEntryRow {
    id: string;
    taxonomy_id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    display_order: number;
    created_at: string;
    updated_at: string;
}

function toTaxonomyEntry(row: TaxonomyEntryRow): TaxonomyEntry {
    return {
        id: row.id,
        taxonomyId: row.taxonomy_id,
        name: row.name,
        slug: row.slug,
        parentId: row.parent_id,
        displayOrder: row.display_order,
    };
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Build nested tree structure from flat array
function buildTree(entries: TaxonomyEntry[]): TaxonomyEntry[] {
    const map = new Map<string, TaxonomyEntry>();
    const roots: TaxonomyEntry[] = [];

    // First pass: create map and initialize children arrays
    entries.forEach(entry => {
        map.set(entry.id, { ...entry, children: [] });
    });

    // Second pass: build tree relationships
    entries.forEach(entry => {
        const node = map.get(entry.id)!;
        if (entry.parentId && map.has(entry.parentId)) {
            map.get(entry.parentId)!.children!.push(node);
        } else {
            roots.push(node);
        }
    });

    // Sort roots by display_order (user-controlled sort)
    roots.sort((a, b) => a.displayOrder - b.displayOrder);

    // Sort all children alphabetically (always alphabetical for nested entries)
    const sortChildrenAlphabetically = (nodes: TaxonomyEntry[]) => {
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                node.children.sort((a, b) => a.name.localeCompare(b.name));
                sortChildrenAlphabetically(node.children);
            }
        });
    };
    sortChildrenAlphabetically(roots);

    return roots;
}

// Get depth of an entry in the tree
export function getEntryDepth(entries: TaxonomyEntry[], entryId: string): number {
    const findDepth = (nodes: TaxonomyEntry[], id: string, depth: number): number => {
        for (const node of nodes) {
            if (node.id === id) return depth;
            if (node.children) {
                const found = findDepth(node.children, id, depth + 1);
                if (found >= 0) return found;
            }
        }
        return -1;
    };
    return findDepth(entries, entryId, 0);
}

export async function getTaxonomyEntries(taxonomyId: string): Promise<TaxonomyEntry[]> {
    const { data, error } = await supabase
        .from('taxonomy_entries')
        .select('*')
        .eq('taxonomy_id', taxonomyId)
        .order('display_order')
        .order('name');

    if (error) throw error;
    const flat = (data as TaxonomyEntryRow[]).map(toTaxonomyEntry);
    return buildTree(flat);
}

// Get all entries across all taxonomies (just id + parentId) for building hierarchy maps
export async function getAllTaxonomyEntriesParentMap(): Promise<{ id: string; parentId: string | null }[]> {
    const { data, error } = await supabase
        .from('taxonomy_entries')
        .select('id, parent_id');
    if (error) throw error;
    return (data || []).map((e: any) => ({ id: e.id, parentId: e.parent_id }));
}

// Get flat list (for cases where you need all entries without hierarchy)
export async function getTaxonomyEntriesFlat(taxonomyId: string): Promise<TaxonomyEntry[]> {
    const { data, error } = await supabase
        .from('taxonomy_entries')
        .select('*')
        .eq('taxonomy_id', taxonomyId)
        .order('name');

    if (error) throw error;
    return (data as TaxonomyEntryRow[]).map(toTaxonomyEntry);
}

export async function createTaxonomyEntry(
    taxonomyId: string,
    name: string,
    parentId?: string
): Promise<TaxonomyEntry> {
    const slug = generateSlug(name);

    // Get max display_order for siblings
    const { data: siblings } = await supabase
        .from('taxonomy_entries')
        .select('display_order')
        .eq('taxonomy_id', taxonomyId)
        .eq('parent_id', parentId || null)
        .order('display_order', { ascending: false })
        .limit(1);

    const maxOrder = siblings && siblings.length > 0 ? siblings[0].display_order : -1;

    const { data, error } = await supabase
        .from('taxonomy_entries')
        .insert({
            taxonomy_id: taxonomyId,
            name: name.trim(),
            slug,
            parent_id: parentId || null,
            display_order: maxOrder + 1,
        })
        .select()
        .single();

    if (error) throw error;
    return toTaxonomyEntry(data as TaxonomyEntryRow);
}

export async function updateTaxonomyEntry(id: string, name: string): Promise<TaxonomyEntry> {
    const slug = generateSlug(name);

    const { data, error } = await supabase
        .from('taxonomy_entries')
        .update({
            name: name.trim(),
            slug,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return toTaxonomyEntry(data as TaxonomyEntryRow);
}

export async function updateEntryParent(id: string, newParentId: string | null): Promise<TaxonomyEntry> {
    const { data, error } = await supabase
        .from('taxonomy_entries')
        .update({
            parent_id: newParentId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return toTaxonomyEntry(data as TaxonomyEntryRow);
}

export async function deleteTaxonomyEntry(id: string): Promise<void> {
    const { error } = await supabase
        .from('taxonomy_entries')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Update display_order for multiple entries (used for sorting)
export async function updateEntriesDisplayOrder(
    updates: { id: string; displayOrder: number }[]
): Promise<void> {
    // Update all entries in parallel for better performance
    const updatePromises = updates.map(update =>
        supabase
            .from('taxonomy_entries')
            .update({
                display_order: update.displayOrder,
                updated_at: new Date().toISOString(),
            })
            .eq('id', update.id)
    );

    const results = await Promise.all(updatePromises);

    // Check for any errors
    for (const result of results) {
        if (result.error) throw result.error;
    }
}
