import { NextRequest, NextResponse } from "next/server";
import { rename, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const body = await request.json();
        const { mediaId, newFolderId, altText } = body;

        console.log("[Media Update] Request body:", { mediaId, newFolderId, altText });

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

                    // Build physical path for current folder
                    const buildPhysicalPath = async (currentFolderId: string): Promise<string> => {
                        const pathParts: string[] = [];
                        let currentId: string | null = currentFolderId;

                        while (currentId) {
                            const { data: f } = await supabase
                                .from("media_folders")
                                .select("slug, parent_id")
                                .eq("id", currentId)
                                .single();

                            if (f) {
                                pathParts.unshift(f.slug as string);
                                currentId = f.parent_id as string | null;
                            } else {
                                break;
                            }
                        }

                        return pathParts.join("/");
                    };

                    const folderPath = folderId ? await buildPhysicalPath(folderId) : "";
                    const mediaRoot = path.join(process.cwd(), "public", "images", "media");

                    const oldFilePath = path.join(mediaRoot, folderPath, currentFilename);
                    const newFilePath = path.join(mediaRoot, folderPath, newFilename);

                    // Rename physical file
                    if (existsSync(oldFilePath)) {
                        try {
                            await rename(oldFilePath, newFilePath);
                            console.log("[Media Update] File renamed successfully");

                            // Update database fields
                            updates.filename = newFilename;
                            updates.url = `/images/media/${folderPath}/${newFilename}`;
                            updates.storage_path = `/images/media/${folderPath}/${newFilename}`;
                        } catch (renameErr) {
                            console.error("[Media Update] Failed to rename file:", renameErr);
                            // Continue without renaming if file rename fails
                        }
                    } else {
                        console.warn("[Media Update] File not found for rename:", oldFilePath);
                    }
                }
            }
        }

        // Handle folder change
        if (newFolderId !== undefined && newFolderId !== mediaItem.folder_id) {
            console.log("[Media Update] Folder change detected:", {
                oldFolderId: mediaItem.folder_id,
                newFolderId: newFolderId,
            });

            // RESTRICTION CHECK: Prevent moving to restricted folders
            // 1. Root folder check (newFolderId is null/undefined but different from old)
            // Note: newFolderId coming as null means "Root"
            if (!newFolderId) {
                return NextResponse.json(
                    { error: "Files cannot be moved to the root folder. Please select a subfolder." },
                    { status: 400 }
                );
            }

            // 2. Restricted parent folder check
            const RESTRICTED_PARENT_FOLDERS = ["Home Images", "Facility Images"];
            // Get new folder details to check name
            const { data: folder } = await supabase
                .from("media_folders")
                .select("id, name, path, parent_id")
                .eq("id", newFolderId)
                .single();

            if (folder) {
                // If it's a top-level folder (no parent) AND it's in the restricted list
                // OR if it's the root folder (id check failed earlier but just in case)
                if ((!folder.parent_id && RESTRICTED_PARENT_FOLDERS.includes(folder.name))) {
                    return NextResponse.json(
                        { error: `Files cannot be moved directly to '${folder.name}'. Please select a subfolder.` },
                        { status: 400 }
                    );
                }
            }

            // Get new folder path (logic continues...)
            let newFolderPath = "";
            if (newFolderId) {
                const { data: folder } = await supabase
                    .from("media_folders")
                    .select("path, slug")
                    .eq("id", newFolderId)
                    .single();
                if (folder) {
                    // Build physical path by getting slugs from parent chain
                    const buildPhysicalPath = async (folderId: string): Promise<string> => {
                        const pathParts: string[] = [];
                        let currentId: string | null = folderId;

                        while (currentId) {
                            const { data: f } = await supabase
                                .from("media_folders")
                                .select("slug, parent_id")
                                .eq("id", currentId)
                                .single();

                            if (f) {
                                pathParts.unshift(f.slug as string);
                                currentId = f.parent_id as string | null;
                            } else {
                                break;
                            }
                        }

                        return pathParts.join("/");
                    };

                    newFolderPath = await buildPhysicalPath(newFolderId);
                }
            }

            // Calculate old and new physical paths
            const filename = mediaItem.filename;
            const mediaRoot = path.join(process.cwd(), "public", "images", "media");

            // Get old file path from storage_path or URL
            let oldFilePath: string;
            const storagePath = mediaItem.storage_path as string;

            if (storagePath && storagePath.startsWith("/images/media/")) {
                // storage_path is relative like /images/media/folder/file.jpg
                oldFilePath = path.join(process.cwd(), "public", storagePath);
            } else if (storagePath && existsSync(storagePath)) {
                // storage_path is absolute
                oldFilePath = storagePath;
            } else {
                // Fallback: derive from URL
                const currentUrl = mediaItem.url as string;
                const urlPath = currentUrl.replace("/images/media/", "");
                const oldRelativePath = urlPath.substring(0, urlPath.lastIndexOf("/"));
                oldFilePath = path.join(mediaRoot, oldRelativePath, filename);
            }

            const newFilePath = path.join(mediaRoot, newFolderPath, filename);
            const newStoragePath = `/images/media/${newFolderPath}/${filename}`;

            console.log("[Media Update] File paths:", {
                storagePath: storagePath,
                oldFilePath: oldFilePath,
                newFolderPath: newFolderPath,
                newFilePath: newFilePath,
                newStoragePath: newStoragePath,
            });

            // Ensure new folder exists
            const newFolderDir = path.join(mediaRoot, newFolderPath);
            if (!existsSync(newFolderDir)) {
                console.log("[Media Update] Creating directory:", newFolderDir);
                await mkdir(newFolderDir, { recursive: true });
            }

            // Move the file
            if (existsSync(oldFilePath)) {
                console.log("[Media Update] Moving file from", oldFilePath, "to", newFilePath);
                try {
                    await rename(oldFilePath, newFilePath);
                    console.log("[Media Update] File moved successfully");
                } catch (moveErr) {
                    console.error("[Media Update] Failed to move file:", moveErr);
                    return NextResponse.json({ error: "Failed to move file on disk" }, { status: 500 });
                }
            } else {
                console.error("[Media Update] WARNING: Source file not found at", oldFilePath);
                return NextResponse.json({ error: "Source file not found on disk" }, { status: 404 });
            }

            // Update database with new paths
            const newUrl = `/images/media/${newFolderPath}/${filename}`;
            updates.folder_id = newFolderId;
            updates.url = newUrl;
            updates.storage_path = newStoragePath;

            console.log("[Media Update] Database updates:", updates);
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
