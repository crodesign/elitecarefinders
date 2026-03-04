import { supabase } from "@/lib/supabase";
import { getHawaiiIsland } from "@/lib/constants/hawaiiIslands";
import { MediaFolder } from "@/types";

/**
 * Ensures that the folder structure exists for a given location property.
 * Structure: State -> [Island] -> [Type] -> City -> Property
 * 
 * @param stateName - Full state name (e.g. "Hawaii", "California")
 * @param cityName - City name
 * @param propertyName - Property name / Title
 * @param propertyType - 'home' or 'facility'
 * @returns The UUID of the property name folder
 */
export async function ensureLocationFolders(
    stateName: string,
    cityName: string,
    propertyName: string,
    propertyType: 'home' | 'facility',
    existingFolderId?: string | null
): Promise<string | null> {
    try {
        console.log(`Ensuring folders for: ${stateName} -> ${cityName} -> ${propertyName} (${propertyType})`);

        // 1. Find or Create State Folder (at Root)
        let stateFolder = await findFolderByName(stateName, null);
        if (!stateFolder) {
            stateFolder = await createFolder(stateName, null);
        }
        if (!stateFolder) throw new Error(`Could not find or create state folder: ${stateName}`);

        let parentFolderId = stateFolder.id;

        // 2. Special Case: Hawaii (Insert Island Folder)
        if (stateName === "Hawaii") {
            const islandName = getHawaiiIsland(cityName);

            if (islandName) {
                console.log(`Hawaii location detected. ensuring island folder: ${islandName}`);
                let islandFolder = await findFolderByName(islandName, stateFolder.id);
                if (!islandFolder) {
                    islandFolder = await createFolder(islandName, stateFolder.id);
                }
                if (islandFolder) {
                    parentFolderId = islandFolder.id;
                }
            } else {
                console.warn(`Could not determine island for city: ${cityName}, skipping island folder level.`);
            }
        }

        // 3. Find or Create Type Folder (home-images/facility-images)
        const typeFolderName = propertyType === 'home' ? 'Home Images' : 'Facility Images';

        let typeFolder = await findFolderByName(typeFolderName, parentFolderId);
        if (!typeFolder) {
            typeFolder = await createFolder(typeFolderName, parentFolderId);
        }
        if (typeFolder) {
            parentFolderId = typeFolder.id;
        }

        // 4. Find or Create City Folder
        let cityFolder = await findFolderByName(cityName, parentFolderId);
        if (!cityFolder) {
            cityFolder = await createFolder(cityName, parentFolderId);
        }
        if (!cityFolder) throw new Error(`Could not find or create city folder: ${cityName}`);

        // 5. If existingFolderId is provided, MOVE it to the new parent
        if (existingFolderId) {
            const { data: existingFolder } = await supabase
                .from("media_folders")
                .select("*")
                .eq("id", existingFolderId)
                .single();

            if (existingFolder) {
                // Check if already in the right place with the right name
                if (existingFolder.parent_id === cityFolder.id && existingFolder.name === propertyName) {
                    return existingFolderId;
                }

                const newPath = `${cityFolder.path}/${propertyName}`;
                const newSlug = propertyName
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");

                const { error: moveError } = await supabase
                    .from("media_folders")
                    .update({
                        parent_id: cityFolder.id,
                        name: propertyName,
                        path: newPath,
                        slug: newSlug
                    })
                    .eq("id", existingFolderId);

                if (moveError) throw new Error(`Failed to move existing folder: ${moveError.message}`);
                return existingFolderId;
            }
        }

        // 6. Otherwise, Find or Create Property Folder
        let propertyFolder = await findFolderByName(propertyName, cityFolder.id);
        if (!propertyFolder) {
            propertyFolder = await createFolder(propertyName, cityFolder.id);
        }
        if (!propertyFolder) throw new Error(`Could not find or create property folder: ${propertyName}`);

        return propertyFolder.id;

    } catch (error) {
        console.error("Error ensuring location folders:", error);
        throw error;
    }
}

/**
 * Returns the ID of the shared "posts" media folder, creating it if needed.
 * All post images are stored flat in this single folder regardless of post type.
 */
export async function ensurePostFolder(
    _postTitle: string,
    _postType: string
): Promise<string | null> {
    try {
        let folder = await findFolderByName('posts', null);
        if (!folder) {
            folder = await createFolder('posts', null);
        }
        return folder?.id ?? null;
    } catch (error) {
        console.error("Error ensuring posts folder:", error);
        throw error;
    }
}

/**
 * Helper to find a folder by name and parent ID.
 */
async function findFolderByName(name: string, parentId: string | null): Promise<MediaFolder | null> {
    let query = supabase
        .from("media_folders")
        .select("*")
        .eq("name", name);

    if (parentId) {
        query = query.eq("parent_id", parentId);
    } else {
        query = query.is("parent_id", null);
    }

    // Use limit(1).maybeSingle() to handle potential duplicates gracefully to avoid crashing.
    // Ideally duplicates shouldn't exist, but if they do, we'll take the first one.
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
        // PGRST116 is not relevant for maybeSingle (it returns null), but keeping check for safety
        if (error.code === 'PGRST116') return null;
        console.error(`Error finding folder ${name}:`, error);
        return null;
    }

    return data as MediaFolder;
}

/**
 * Helper to create a folder.
 * Uses the existing API route to ensure physical folder creation logic is consistent.
 */
async function createFolder(name: string, parentId: string | null): Promise<MediaFolder | null> {
    try {
        const isServer = typeof window === 'undefined';
        const baseUrl = isServer ? 'http://localhost:3000' : '';
        const response = await fetch(`${baseUrl}/api/media/folders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, parentId }),
        });

        if (!response.ok) {
            const error = await response.json();
            // If it already exists (race condition), try to find it again
            if (response.status === 409) {
                return findFolderByName(name, parentId);
            }
            throw new Error(error.error || "Failed to create folder");
        }

        const result = await response.json();
        return result.folder;
    } catch (error) {
        console.error(`Error creating folder ${name}:`, error);
        throw error;
    }
}

/**
 * Find a folder by slug. Pass parentSlug to restrict to a specific parent folder.
 * If no parentSlug is given, only root-level folders are searched.
 */
export async function getFolderBySlug(slug: string, parentSlug?: string): Promise<MediaFolder | null> {
    let parentId: string | null = null;

    if (parentSlug) {
        const { data: parent } = await supabase
            .from('media_folders')
            .select('id')
            .eq('slug', parentSlug)
            .is('parent_id', null)
            .limit(1)
            .maybeSingle();
        if (!parent) return null;
        parentId = parent.id;
    }

    let query = supabase.from('media_folders').select('*').eq('slug', slug);
    if (parentId) {
        query = query.eq('parent_id', parentId);
    } else {
        query = query.is('parent_id', null);
    }

    const { data } = await query.limit(1).maybeSingle();
    return data as MediaFolder | null;
}
