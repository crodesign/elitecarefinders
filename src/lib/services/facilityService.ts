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

    return (data || []).map(facility => ({
        ...facility,
        address: facility.address || { street: "", city: "", state: "", zip: "" },
        licenseNumber: facility.license_number,
        taxonomyIds: facility.taxonomy_ids || [],
        images: facility.images || [],
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
    };
}

export type CreateFacilityInput = Omit<Facility, "id" | "createdAt" | "updatedAt" | "images"> & { images?: string[] };

export async function createFacility(facility: CreateFacilityInput): Promise<Facility> {
    const dbPayload = {
        title: facility.title,
        slug: facility.slug,
        description: facility.description,
        address: facility.address,
        license_number: facility.licenseNumber,
        capacity: facility.capacity,
        taxonomy_ids: facility.taxonomyIds,
        status: facility.status || 'draft',
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
    };
}

export async function deleteFacility(id: string): Promise<void> {
    const { error } = await supabase
        .from("facilities")
        .delete()
        .eq("id", id);

    if (error) {
        console.error(`Error deleting facility ${id}:`, error);
        throw new Error(error.message);
    }
}
