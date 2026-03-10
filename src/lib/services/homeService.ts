import { supabase } from "@/lib/supabase";
import type { Home, SeoFields } from "@/types";

function mapSeoFromDb(row: any): SeoFields {
    return {
        metaTitle: row.meta_title ?? null,
        metaDescription: row.meta_description ?? null,
        canonicalUrl: row.canonical_url ?? null,
        indexable: row.indexable ?? true,
        ogTitle: row.og_title ?? null,
        ogDescription: row.og_description ?? null,
        ogImageUrl: row.og_image_url ?? null,
        schemaJson: row.schema_json ?? null,
    };
}

function mapSeoToDb(seo: SeoFields | undefined): Record<string, unknown> {
    if (!seo) return {};
    return {
        meta_title: seo.metaTitle ?? null,
        meta_description: seo.metaDescription ?? null,
        canonical_url: seo.canonicalUrl ?? null,
        indexable: seo.indexable ?? true,
        og_title: seo.ogTitle ?? null,
        og_description: seo.ogDescription ?? null,
        og_image_url: seo.ogImageUrl ?? null,
        schema_json: seo.schemaJson ?? null,
    };
}

function transformHome(home: any): Home {
    return {
        ...home,
        address: home.address || { street: "", city: "", state: "", zip: "" },
        displayReferenceNumber: home.display_reference_number,
        showAddress: home.show_address,
        taxonomyEntryIds: home.taxonomy_entry_ids || [],
        isFeatured: home.is_featured,
        hasFeaturedVideo: home.has_featured_video,
        isHomeOfMonth: home.is_home_of_month,
        featuredLabel: home.featured_label,
        homeOfMonthDescription: home.home_of_month_description,
        excerpt: home.excerpt || "",
        images: home.images || [],
        teamImages: home.team_images || [],
        cuisineImages: home.cuisine_images || [],
        videos: home.videos || [],
        roomDetails: { customFields: {}, ...(home.room_details || {}) },
        updatedAt: home.updated_at,
        seo: mapSeoFromDb(home),
    };
}

export async function getHomes(): Promise<Home[]> {
    const { data, error } = await supabase
        .from("homes")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching homes:", error);
        throw new Error(error.message);
    }

    return (data || []).map(transformHome);
}

export async function searchHomes(query: string): Promise<Home[]> {
    const { data, error } = await supabase.rpc('search_homes', { keyword: query });
    if (error) throw new Error(error.message);
    return (data || []).map(transformHome);
}

export async function getHome(id: string): Promise<Home | null> {
    const { data, error } = await supabase
        .from("homes")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error(`Error fetching home ${id}:`, error);
        return null;
    }

    return transformHome(data);
}

export type CreateHomeInput = Omit<Home, "id" | "createdAt" | "updatedAt" | "images" | "teamImages" | "cuisineImages"> & { images?: string[], teamImages?: string[], cuisineImages?: string[] };

export async function createHome(home: CreateHomeInput): Promise<Home> {
    const dbPayload = {
        title: home.title,
        slug: home.slug,
        description: home.description,
        address: home.address,
        display_reference_number: home.displayReferenceNumber,
        show_address: home.showAddress,
        phone: home.phone,
        email: home.email,
        status: home.status,
        taxonomy_entry_ids: home.taxonomyEntryIds,
        is_featured: home.isFeatured,
        has_featured_video: home.hasFeaturedVideo,
        is_home_of_month: home.isHomeOfMonth,
        featured_label: home.featuredLabel,
        home_of_month_description: home.homeOfMonthDescription,
        excerpt: home.excerpt || "",
        images: home.images || [],
        team_images: home.teamImages || [],
        cuisine_images: home.cuisineImages || [],
        videos: home.videos || [],
        room_details: home.roomDetails || {},
        ...mapSeoToDb(home.seo),
    };

    const { data, error } = await supabase
        .from("homes")
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        console.error("Error creating home:", error);
        throw new Error(error.message);
    }

    return transformHome(data);
}

export async function updateHome(id: string, updates: Partial<Home>): Promise<Home> {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.displayReferenceNumber !== undefined) dbUpdates.display_reference_number = updates.displayReferenceNumber;
    if (updates.showAddress !== undefined) dbUpdates.show_address = updates.showAddress;
    if (updates.taxonomyEntryIds !== undefined) dbUpdates.taxonomy_entry_ids = updates.taxonomyEntryIds;
    if (updates.isFeatured !== undefined) dbUpdates.is_featured = updates.isFeatured;
    if (updates.hasFeaturedVideo !== undefined) dbUpdates.has_featured_video = updates.hasFeaturedVideo;
    if (updates.isHomeOfMonth !== undefined) dbUpdates.is_home_of_month = updates.isHomeOfMonth;
    if (updates.featuredLabel !== undefined) dbUpdates.featured_label = updates.featuredLabel;
    if (updates.homeOfMonthDescription !== undefined) dbUpdates.home_of_month_description = updates.homeOfMonthDescription;
    if (updates.excerpt !== undefined) dbUpdates.excerpt = updates.excerpt;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.teamImages !== undefined) dbUpdates.team_images = updates.teamImages;
    if (updates.cuisineImages !== undefined) dbUpdates.cuisine_images = updates.cuisineImages;
    if (updates.videos !== undefined) dbUpdates.videos = updates.videos;
    if (updates.roomDetails !== undefined) dbUpdates.room_details = updates.roomDetails;
    const { data, error } = await supabase
        .from("homes")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating home ${id}:`, error);
        throw new Error(error.message);
    }

    return transformHome(data);
}

export async function updateHomeSeo(id: string, seo: SeoFields): Promise<void> {
    const { error } = await supabase
        .from("homes")
        .update(mapSeoToDb(seo))
        .eq("id", id);
    if (error) throw new Error(error.message);
}

export async function deleteHome(id: string, slug?: string): Promise<void> {
    if (slug) {
        try {
            await fetch('/api/media/delete-entity', {
                method: 'POST',
                body: JSON.stringify({ slug }),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error(`Failed to delete media for home ${slug}:`, e);
        }
    }

    const { error } = await supabase
        .from("homes")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(`Error deleting home ${id}:`, error);
        throw new Error(error.message);
    }
}
