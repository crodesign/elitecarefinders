import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { r2Rename, toPublicUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const body = await request.json();
        const { mediaId, newFolderId, altText, title } = body;

        console.log("[Media Update] Request body:", { mediaId, newFolderId, altText, title });

        if (!mediaId) {
            return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
        }

        // Get current media item
        const { data: mediaItem, error: fetchError } = await supabase
            .from("media_items")
            .select("*")
            .eq("id", mediaId)
            .single();

        if (fetchError || !mediaItem) {
            return NextResponse.json({ error: "Media item not found" }, { status: 404 });
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        // Handle title change
        if (title !== undefined && title !== mediaItem.title) {
            updates.title = title;
        }

        // Handle caption change with file rename
        if (altText !== undefined && altText !== mediaItem.alt_text) {
            updates.alt_text = altText;

            // Only rename file if caption is not empty
            if (altText.trim() !== "") {
                // Get folder slug for the new filename
                let folderSlug = "media";
                const folderId = mediaItem.folder_id;
                if (folderId) {
                    const { data: folder } = await supabase
                        .from("media_folders")
                        .select("slug")
                        .eq("id", folderId)
                        .single();
                    if (folder) {
                        folderSlug = folder.slug as string;
                    }
                }

                // Create sanitized caption for filename
                const sanitizedCaption = altText
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");

                // Get file extension from current filename
                const currentFilename = mediaItem.filename as string;
                const extension = currentFilename.split('.').pop()?.toLowerCase() || "jpg";

                // Base filename: folder-caption
                const baseFilename = `${folderSlug}-${sanitizedCaption}`;

                // Check if this filename already exists (excluding current file)
                const { data: existingFiles } = await supabase
                    .from("media_items")
                    .select("filename")
                    .eq("folder_id", folderId)
                    .neq("id", mediaId)
                    .like("filename", `${baseFilename}%`);

                // Determine unique filename
                let newFilename = `${baseFilename}.${extension}`;
                if (existingFiles && existingFiles.length > 0) {
                    // Check if exact match exists
                    const exactMatch = existingFiles.some(f => f.filename === newFilename);
                    if (exactMatch) {
                        // Find highest existing number
                        const pattern = new RegExp(`^${baseFilename}-(\\d+)\\.${extension}$`, 'i');
                        const numbers = existingFiles.map(f => {
                            const match = (f.filename as string).match(pattern);
                            return match ? parseInt(match[1]) : 0;
                        });
                        const nextNumber = Math.max(1, ...numbers) + 1;
                        newFilename = `${baseFilename}-${nextNumber}.${extension}`;
                    }
                }

                // Only rename if filename actually changed
                if (newFilename !== currentFilename) {
                    console.log("[Media Update] Caption rename:", { currentFilename, newFilename });

                    // Rename main file in R2
                    try {
                        await r2Rename(currentFilename, newFilename);
                        console.log("[Media Update] File renamed successfully");
                    } catch (renameErr) {
                        console.error("[Media Update] Failed to rename file in R2:", renameErr);
                        // Continue without renaming if file rename fails
                    }

                    const newUrl = toPublicUrl(newFilename);
                    updates.filename = newFilename;
                    updates.url = newUrl;
                    updates.storage_path = newUrl;

                    // Rename variant files in R2 and update variant URL columns
                    const oldStem = currentFilename.replace(/\.[^.]+$/, '');
                    const newStem = newFilename.replace(/\.[^.]+$/, '');
                    const variantDefs = [
                        { suffix: "-500x500.webp", col: "url_large" },
                        { suffix: "-200x200.webp", col: "url_medium" },
                        { suffix: "-100x100.webp", col: "url_thumb" },
                    ];
                    for (const { suffix, col } of variantDefs) {
                        const oldVariant = `${oldStem}${suffix}`;
                        const newVariant = `${newStem}${suffix}`;
                        await r2Rename(oldVariant, newVariant).catch(() => {});
                        updates[col] = toPublicUrl(newVariant);
                    }
                }
            }
        }

        // Handle folder change (DB-only — no physical file move in flat storage)
        if (newFolderId !== undefined && newFolderId !== mediaItem.folder_id) {
            console.log("[Media Update] Folder change detected:", {
                oldFolderId: mediaItem.folder_id,
                newFolderId: newFolderId,
            });

            // RESTRICTION CHECK: Prevent moving to restricted folders
            if (!newFolderId) {
                return NextResponse.json(
                    { error: "Files cannot be moved to the root folder. Please select a subfolder." },
                    { status: 400 }
                );
            }

            const RESTRICTED_PARENT_FOLDERS = ["Home Images", "Facility Images"];
            const { data: folder } = await supabase
                .from("media_folders")
                .select("id, name, path, parent_id")
                .eq("id", newFolderId)
                .single();

            if (folder) {
                if (!folder.parent_id && RESTRICTED_PARENT_FOLDERS.includes(folder.name)) {
                    return NextResponse.json(
                        { error: `Files cannot be moved directly to '${folder.name}'. Please select a subfolder.` },
                        { status: 400 }
                    );
                }
            }

            // FLAT STORAGE: Just update the folder_id in DB — no physical file move needed
            updates.folder_id = newFolderId;
            console.log("[Media Update] Folder move (DB-only):", { newFolderId });
        }

        // Update database
        const { data, error: updateError } = await supabase
            .from("media_items")
            .update(updates)
            .eq("id", mediaId)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            item: {
                id: data.id,
                folderId: data.folder_id,
                filename: data.filename,
                altText: data.alt_text,
                title: data.title,
                url: data.url,
                updatedAt: data.updated_at,
            },
        });
    } catch (error) {
        console.error("Media update error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Update failed" },
            { status: 500 }
        );
    }
}
