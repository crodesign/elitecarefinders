import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
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
        const oldSlug = folder.slug as string;

        // Build new path
        const pathParts = oldPath.split("/");
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join("/");

        // Generate new slug from name
        const newSlug = newName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

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

        // FLAT STORAGE: Rename files in flat directory (caption-preserving slug swap)
        const { data: mediaItems } = await supabase
            .from("media_items")
            .select("id, filename, url, storage_path")
            .eq("folder_id", folderId);

        const mediaRoot = path.join(process.cwd(), "public", "images", "media");

        if (mediaItems && mediaItems.length > 0) {
            for (const item of mediaItems) {
                const oldFilename = item.filename as string;

                // Extract suffix: old-slug-living-room.jpg → suffix = "living-room"
                // Or: old-slug-1.jpg → suffix = "1"
                const escapedOldSlug = oldSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const suffixMatch = oldFilename.match(new RegExp(`^${escapedOldSlug}-(.+)$`));

                if (suffixMatch) {
                    const suffix = suffixMatch[1]; // "living-room.jpg" or "1.jpg"
                    const newFilename = `${newSlug}-${suffix}`;

                    // Rename physical file
                    const oldFilePath = path.join(mediaRoot, oldFilename);
                    const newFilePath = path.join(mediaRoot, newFilename);

                    try {
                        await fs.access(oldFilePath);
                        await fs.rename(oldFilePath, newFilePath);
                    } catch {
                        console.log(`[Folder Rename] Could not rename file ${oldFilename}:`, "file may not exist");
                    }

                    // Update media_items record (flat URL)
                    const newUrl = `/images/media/${newFilename}`;
                    await supabase
                        .from("media_items")
                        .update({
                            filename: newFilename,
                            url: newUrl,
                            storage_path: newUrl,
                        })
                        .eq("id", item.id);
                }
            }
        }

        // Update child folders' paths
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
