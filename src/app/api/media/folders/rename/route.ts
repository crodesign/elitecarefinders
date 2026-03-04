import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { r2Rename, toPublicUrl } from "@/lib/r2";

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

        // Rename files in R2 (caption-preserving slug swap)
        const { data: mediaItems } = await supabase
            .from("media_items")
            .select("id, filename, url, storage_path")
            .eq("folder_id", folderId);

        if (mediaItems && mediaItems.length > 0) {
            for (const item of mediaItems) {
                const oldFilename = item.filename as string;

                // Extract suffix: old-slug-living-room.jpg → suffix = "living-room"
                const escapedOldSlug = oldSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const suffixMatch = oldFilename.match(new RegExp(`^${escapedOldSlug}-(.+)$`));

                if (suffixMatch) {
                    const suffix = suffixMatch[1]; // "living-room.jpg" or "1.jpg"
                    const newFilename = `${newSlug}-${suffix}`;

                    // Rename main file in R2
                    await r2Rename(oldFilename, newFilename).catch(() => {
                        console.log(`[Folder Rename] Could not rename file ${oldFilename} in R2`);
                    });

                    const newUrl = toPublicUrl(newFilename);
                    const variantUpdates: Record<string, string> = {};

                    // Rename variant files in R2
                    const oldStem = oldFilename.replace(/\.[^.]+$/, '');
                    const newStem = newFilename.replace(/\.[^.]+$/, '');
                    const variantDefs = [
                        { suffix: "-500x500.webp", col: "url_large" },
                        { suffix: "-200x200.webp", col: "url_medium" },
                        { suffix: "-100x100.webp", col: "url_thumb" },
                    ];
                    for (const { suffix: varSuffix, col } of variantDefs) {
                        const oldVariant = `${oldStem}${varSuffix}`;
                        const newVariant = `${newStem}${varSuffix}`;
                        await r2Rename(oldVariant, newVariant).catch(() => {});
                        variantUpdates[col] = toPublicUrl(newVariant);
                    }

                    // Update media_items record
                    await supabase
                        .from("media_items")
                        .update({
                            filename: newFilename,
                            url: newUrl,
                            storage_path: newUrl,
                            ...variantUpdates,
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
