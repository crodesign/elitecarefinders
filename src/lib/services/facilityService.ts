import { supabase } from "@/lib/supabase";
import type { Facility } from "@/types";

export async function getFacilities(): Promise<Facility[]> {
    const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching facilities:", error);
        throw new Error(error.message);
    }

    return (data || []).map((facility: any) => ({
        ...facility,
        address: facility.address || { street: "", city: "", state: "", zip: "" },
        licenseNumber: facility.license_number,
        taxonomyIds: facility.taxonomy_ids || [],
        images: facility.images || [],
        teamImages: facility.team_images || [],
        videos: facility.videos || [],
        roomDetails: facility.room_details || { customFields: {} },
        updatedAt: facility.updated_at,
    }));
}

export async function searchFacilities(query: string): Promise<Facility[]> {
    const { data, error } = await supabase.rpc('search_facilities', { keyword: query });
    if (error) throw new Error(error.message);
    return (data || []).map((facility: any) => ({
        ...facility,
        address: facility.address || { street: "", city: "", state: "", zip: "" },
        licenseNumber: facility.license_number,
        taxonomyIds: facility.taxonomy_ids || [],
        images: facility.images || [],
        teamImages: facility.team_images || [],
        videos: facility.videos || [],
        roomDetails: facility.room_details || { customFields: {} },
        updatedAt: facility.updated_at,
    }));
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

    return {
        ...data,
        address: data.address || { street: "", city: "", state: "", zip: "" },
        licenseNumber: data.license_number,
        taxonomyIds: data.taxonomy_ids || [],
        images: data.images || [],
        teamImages: data.team_images || [],
        videos: data.videos || [],
        roomDetails: data.room_details || { customFields: {} },
        updatedAt: data.updated_at,
    };
}

export type CreateFacilityInput = Omit<Facility, "id" | "createdAt" | "updatedAt" | "images" | "teamImages"> & { images?: string[], teamImages?: string[] };

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
        images: facility.images || [],
        team_images: facility.teamImages || [],
        videos: facility.videos || [],
        room_details: (facility as any).roomDetails || {},
        created_by: user?.id,
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

    return {
        ...data,
        address: data.address || { street: "", city: "", state: "", zip: "" },
        licenseNumber: data.license_number,
        taxonomyIds: data.taxonomy_ids || [],
        images: data.images || [],
        teamImages: data.team_images || [],
        videos: data.videos || [],
        roomDetails: data.room_details || { customFields: {} },
        updatedAt: data.updated_at,
    };
}

export async function updateFacility(id: string, updates: Partial<Facility>): Promise<Facility> {
    // Map updates to snake_case
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
    if (updates.videos !== undefined) dbUpdates.videos = updates.videos;
    if ((updates as any).roomDetails !== undefined) dbUpdates.room_details = (updates as any).roomDetails;

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

    return {
        ...data,
        address: data.address || { street: "", city: "", state: "", zip: "" },
        licenseNumber: data.license_number,
        taxonomyIds: data.taxonomy_ids || [],
        images: data.images || [],
        teamImages: data.team_images || [],
        videos: data.videos || [],
        roomDetails: data.room_details || { customFields: {} },
        updatedAt: data.updated_at,
    };
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
