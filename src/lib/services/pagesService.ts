import { createClientComponentClient } from "@/lib/supabase";

export interface Page {
    id: string;
    slug: string;
    label: string;
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    indexable: boolean;
    ogTitle: string;
    ogDescription: string;
    ogImageUrl: string;
    schemaJson: Record<string, unknown> | null;
    updatedAt: string;
}

function transform(row: Record<string, unknown>): Page {
    return {
        id: row.id as string,
        slug: row.slug as string,
        label: row.label as string,
        metaTitle: (row.meta_title as string) ?? '',
        metaDescription: (row.meta_description as string) ?? '',
        canonicalUrl: (row.canonical_url as string) ?? '',
        indexable: (row.indexable as boolean) ?? true,
        ogTitle: (row.og_title as string) ?? '',
        ogDescription: (row.og_description as string) ?? '',
        ogImageUrl: (row.og_image_url as string) ?? '',
        schemaJson: (row.schema_json as Record<string, unknown>) ?? null,
        updatedAt: row.updated_at as string,
    };
}

export async function getPages(): Promise<Page[]> {
    const supabase = createClientComponentClient();
    const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("label");
    if (error) throw new Error(error.message);
    return (data ?? []).map(transform);
}

export async function createPage(data: { slug: string; label: string } & Partial<Omit<Page, 'id' | 'updatedAt'>>): Promise<Page> {
    const supabase = createClientComponentClient();
    const row: Record<string, unknown> = {
        slug: data.slug,
        label: data.label,
        meta_title: data.metaTitle ?? '',
        meta_description: data.metaDescription ?? '',
        canonical_url: data.canonicalUrl ?? '',
        indexable: data.indexable ?? true,
        og_title: data.ogTitle ?? '',
        og_description: data.ogDescription ?? '',
        og_image_url: data.ogImageUrl ?? '',
        schema_json: data.schemaJson ?? null,
    };
    const { data: inserted, error } = await supabase.from("pages").insert(row).select().single();
    if (error) throw new Error(error.message);
    return transform(inserted);
}

export async function updatePage(
    id: string,
    data: Partial<Omit<Page, 'id' | 'slug' | 'label' | 'updatedAt'>>
): Promise<void> {
    const supabase = createClientComponentClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.metaTitle !== undefined) updates.meta_title = data.metaTitle;
    if (data.metaDescription !== undefined) updates.meta_description = data.metaDescription;
    if (data.canonicalUrl !== undefined) updates.canonical_url = data.canonicalUrl;
    if (data.indexable !== undefined) updates.indexable = data.indexable;
    if (data.ogTitle !== undefined) updates.og_title = data.ogTitle;
    if (data.ogDescription !== undefined) updates.og_description = data.ogDescription;
    if (data.ogImageUrl !== undefined) updates.og_image_url = data.ogImageUrl;
    if (data.schemaJson !== undefined) updates.schema_json = data.schemaJson;
    const { error } = await supabase.from("pages").update(updates).eq("id", id);
    if (error) throw new Error(error.message);
}

export async function deletePage(id: string): Promise<void> {
    const supabase = createClientComponentClient();
    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) throw new Error(error.message);
}
