
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recursively builds the full physical path for a folder by traversing up the parent tree.
 * Returns a path string like "grandparent-slug/parent-slug/folder-slug".
 */
export async function buildPhysicalPath(supabase: SupabaseClient, folderId: string): Promise<string> {
    const pathParts: string[] = [];
    let currentId: string | null = folderId;

    // Safety limit to prevent infinite loops in case of circular references (though DB constraints should prevent this)
    let depth = 0;
    const MAX_DEPTH = 20;

    interface MediaFolder {
        slug: string;
        parent_id: string | null;
    }

    while (currentId && depth < MAX_DEPTH) {
        const { data } = await supabase
            .from("media_folders")
            .select("slug, parent_id")
            .eq("id", currentId)
            .single();

        const f = data as unknown as MediaFolder;

        if (!f) {
            // Folders might be missing if concurrently deleted
            break;
        }

        if (f.slug) {
            pathParts.unshift(f.slug);
        }

        currentId = f.parent_id;
        depth++;
    }

    return pathParts.join("/");
}
