import { supabase } from "@/lib/supabase";
import type { Facility, SeoFields } from "@/types";

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

function transformFacility(facility: any): Facility {
    return {
        ...facility,
        address: facility.address || { street: "", city: "", state: "", zip: "" },
        licenseNumber: facility.license_number,
        taxonomyIds: facility.taxonomy_ids || [],
        isFeatured: facility.is_featured,
        hasFeaturedVideo: facility.has_featured_video,
        isFacilityOfMonth: facility.is_facility_of_month,
        featuredLabel: facility.featured_label,
        facilityOfMonthDescription: facility.facility_of_month_description,
        excerpt: facility.excerpt || "",
        images: facility.images || [],
        teamImages: facility.team_images || [],
        cuisineImages: facility.cuisine_images || [],
        videos: facility.videos || [],
        roomDetails: facility.room_details || { customFields: {} },
        updatedAt: facility.updated_at,
        seo: mapSeoFromDb(facility),
    };
}

export async function getFacilities(): Promise<Facility[]> {
    const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching facilities:", error);
        throw new Error(error.message);
    }

    return (data || []).map(transformFacility);
}

export async function searchFacilities(query: string): Promise<Facility[]> {
    const { data, error } = await supabase.rpc('search_facilities', { keyword: query });
    if (error) throw new Error(error.message);
    return (data || []).map(transformFacility);
}

export async function getFacility(id: string): Promise<Facility | null> {
    const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error(`Error fetching facility ${id}:`, error);
        return null;
    }

    return transformFacility(data);
}

export type CreateFacilityInput = Omit<Facility, "id" | "createdAt" | "updatedAt" | "images" | "teamImages" | "cuisineImages"> & { images?: string[], teamImages?: string[], cuisineImages?: string[] };

export async function createFacility(facility: CreateFacilityInput): Promise<Facility> {
    const { data: { user } } = await supabase.auth.getUser();

    const dbPayload = {
        title: facility.title,
        slug: facility.slug,
        description: facility.description,
        address: facility.address,
        license_number: facility.licenseNumber,
        capacity: facility.capacity,
        taxonomy_ids: facility.taxonomyIds,
        status: facility.status || 'draft',
        is_featured: (facility as any).isFeatured || false,
        has_featured_video: (facility as any).hasFeaturedVideo || false,
        is_facility_of_month: (facility as any).isFacilityOfMonth || false,
        featured_label: (facility as any).featuredLabel || '',
        facility_of_month_description: (facility as any).facilityOfMonthDescription || '',
        excerpt: (facility as any).excerpt || '',
        images: facility.images || [],
        team_images: facility.teamImages || [],
        cuisine_images: facility.cuisineImages || [],
        videos: facility.videos || [],
        room_details: (facility as any).roomDetails || {},
        created_by: user?.id,
        ...mapSeoToDb((facility as any).seo),
    };

    const { data, error } = await supabase
        .from("facilities")
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        console.error("Error creating facility:", error);
        throw new Error(error.message);
    }

    return transformFacility(data);
}

export async function updateFacility(id: string, updates: Partial<Facility>): Promise<Facility> {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.licenseNumber !== undefined) dbUpdates.license_number = updates.licenseNumber;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.taxonomyIds !== undefined) dbUpdates.taxonomy_ids = updates.taxonomyIds;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.teamImages !== undefined) dbUpdates.team_images = updates.teamImages;
    if (updates.cuisineImages !== undefined) dbUpdates.cuisine_images = updates.cuisineImages;
    if (updates.videos !== undefined) dbUpdates.videos = updates.videos;
    if ((updates as any).roomDetails !== undefined) dbUpdates.room_details = (updates as any).roomDetails;
    if ((updates as any).isFeatured !== undefined) dbUpdates.is_featured = (updates as any).isFeatured;
    if ((updates as any).hasFeaturedVideo !== undefined) dbUpdates.has_featured_video = (updates as any).hasFeaturedVideo;
    if ((updates as any).isFacilityOfMonth !== undefined) dbUpdates.is_facility_of_month = (updates as any).isFacilityOfMonth;
    if ((updates as any).featuredLabel !== undefined) dbUpdates.featured_label = (updates as any).featuredLabel;
    if ((updates as any).facilityOfMonthDescription !== undefined) dbUpdates.facility_of_month_description = (updates as any).facilityOfMonthDescription;
    if (updates.excerpt !== undefined) dbUpdates.excerpt = updates.excerpt;

    const { data, error } = await supabase
        .from("facilities")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error(`Error updating facility ${id}:`, error);
        throw new Error(error.message);
    }

    return transformFacility(data);
}

export async function updateFacilitySeo(id: string, seo: SeoFields): Promise<void> {
    const { error } = await supabase
        .from("facilities")
        .update(mapSeoToDb(seo))
        .eq("id", id);
    if (error) throw new Error(error.message);
}

export async function deleteFacility(id: string, slug?: string): Promise<void> {
    if (slug) {
        try {
            await fetch('/api/media/delete-entity', {
                method: 'POST',
                body: JSON.stringify({ slug }),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error(`Failed to delete media for facility ${slug}:`, e);
        }
    }

    const { error } = await supabase
        .from("facilities")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(`Error deleting facility ${id}:`, error);
        throw new Error(error.message);
    }
}
