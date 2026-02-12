import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs/promises";
import path from "path";
import { buildPhysicalPath } from "@/lib/mediaUtils";

export async function POST(request: NextRequest) {
    try {
        const { folderId, newName } = await request.json();

        if (!folderId || !newName) {
            return NextResponse.json(
                { error: "Folder ID and new name are required" },
                { status: 400 }
            );
        }

        // Get the current folder
        const { data: folder, error: fetchError } = await supabase
            .from("media_folders")
            .select("*")
            .eq("id", folderId)
            .single();

        if (fetchError || !folder) {
            return NextResponse.json(
                { error: "Folder not found" },
                { status: 404 }
            );
        }

        const oldPath = folder.path as string;
        const oldName = folder.name as string;

        // Build new path
        const pathParts = oldPath.split("/");
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join("/");

        // Generate new slug from name using hyphens
        const newSlug = newName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        const oldSlug = folder.slug as string;

        // Calculate physical paths using slugs
        // Need to build the full physical path including parent folder slugs
        let oldPhysicalPath = oldSlug;
        let newPhysicalPath = newSlug;

        if (folder.parent_id) {
            // Get parent folder to build full path recursively
            const parentPhysicalPath = await buildPhysicalPath(supabase, folder.parent_id);
            oldPhysicalPath = `${parentPhysicalPath}/${oldSlug}`;
            newPhysicalPath = `${parentPhysicalPath}/${newSlug}`;
        }

        // Rename physical folder on disk
        const mediaDir = path.join(process.cwd(), "public", "images", "media");
        const oldFullPath = path.join(mediaDir, oldPhysicalPath);
        const newFullPath = path.join(mediaDir, newPhysicalPath);

        console.log("Renaming folder:", { oldFullPath, newFullPath });

        try {
            await fs.access(oldFullPath);
            await fs.rename(oldFullPath, newFullPath);
            console.log("Physical folder renamed successfully");
        } catch (err) {
            console.log("Could not rename physical folder:", err);
            // Folder might not exist on disk yet, that's OK
        }

        // Update folder in database
        const { data: updatedFolder, error: updateError } = await supabase
            .from("media_folders")
            .update({
                name: newName,
                slug: newSlug,
                path: newPath,
            })
            .eq("id", folderId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json(
                { error: updateError.message },
                { status: 500 }
            );
        }

        // Update URLs for all media items in this folder
        const { data: mediaItems } = await supabase
            .from("media_items")
            .select("id, storage_path, url")
            .eq("folder_id", folderId);

        if (mediaItems && mediaItems.length > 0) {
            for (const item of mediaItems) {
                const itemStoragePath = item.storage_path as string;
                const itemUrl = item.url as string;

                // Replace the old slug with new slug in paths (slugs are used in physical paths)
                const newStoragePath = itemStoragePath.replace(
                    `/${oldSlug}/`,
                    `/${newSlug}/`
                );
                const newUrl = itemUrl.replace(
                    `/${oldSlug}/`,
                    `/${newSlug}/`
                );

                await supabase
                    .from("media_items")
                    .update({
                        storage_path: newStoragePath,
                        url: newUrl,
                    })
                    .eq("id", item.id);
            }
        }

        // Also update child folders' paths
        const { data: childFolders } = await supabase
            .from("media_folders")
            .select("id, path")
            .like("path", `${oldPath}/%`);

        if (childFolders && childFolders.length > 0) {
            for (const child of childFolders) {
                const childPath = child.path as string;
                const newChildPath = childPath.replace(oldPath, newPath);

                await supabase
                    .from("media_folders")
                    .update({ path: newChildPath })
                    .eq("id", child.id);
            }
        }

        return NextResponse.json({
            folder: {
                id: updatedFolder.id,
                name: updatedFolder.name,
                slug: updatedFolder.slug,
                path: updatedFolder.path,
                parentId: updatedFolder.parent_id,
                createdAt: updatedFolder.created_at,
            },
        });
    } catch (error) {
        console.error("Rename folder error:", error);
        return NextResponse.json(
            { error: "Failed to rename folder" },
            { status: 500 }
        );
    }
}
