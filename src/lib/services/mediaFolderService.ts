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
 * Ensures that the folder structure exists for a given post.
 * Structure: Post Images -> [Post Type] -> [Post Title]
 * 
 * @param postTitle - Title of the post
 * @param postType - The routing slug/type of the post (e.g., 'recipes', 'news_events')
 * @returns The UUID of the post title folder
 */
export async function ensurePostFolder(
    postTitle: string,
    postType: string
): Promise<string | null> {
    try {
        console.log(`Ensuring folder for post: ${postTitle} under type: ${postType}`);

        // 1. Find or Create "Post Images" Folder (at Root)
        const rootFolderName = 'Post Images';
        let rootFolder = await findFolderByName(rootFolderName, null);
        if (!rootFolder) {
            rootFolder = await createFolder(rootFolderName, null);
        }
        if (!rootFolder) throw new Error(`Could not find or create root folder: ${rootFolderName}`);

        // 2. Determine Human-Readable Category Name
        const categoryMap: Record<string, string> = {
            'general': 'General Posts',
            'caregiver_resources': 'Caregiver Resources',
            'caregiving_for_caregivers': 'Caregiving for Caregivers',
            'resident_resources': 'Resident Resources',
            'news_events': 'News & Events',
            'recipes': 'Recipes',
        };
        const categoryName = categoryMap[postType] || postType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        // 3. Find or Create Type Directory
        let typeFolder = await findFolderByName(categoryName, rootFolder.id);
        if (!typeFolder) {
            typeFolder = await createFolder(categoryName, rootFolder.id);
        }
        if (!typeFolder) throw new Error(`Could not find or create category folder: ${categoryName}`);

        // 4. Find or Create Post Directory
        let postFolder = await findFolderByName(postTitle, typeFolder.id);
        if (!postFolder) {
            postFolder = await createFolder(postTitle, typeFolder.id);
        }
        if (!postFolder) throw new Error(`Could not find or create post folder: ${postTitle}`);

        return postFolder.id;

    } catch (error) {
        console.error("Error ensuring post folders:", error);
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
