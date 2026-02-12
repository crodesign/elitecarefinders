import { NextRequest, NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { supabase } from "@/lib/supabase";

import { buildPhysicalPath } from "@/lib/mediaUtils";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, parentId } = body;

        if (!name) {
            return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
        }

        // Generate clean slug
        let slug = name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        // Special handling for standard system folders to keep slugs short and clean
        if (slug === "home-images") slug = "home";
        if (slug === "facility-images") slug = "facility";
        if (slug === "site-images") slug = "site";
        if (slug === "blog-images") slug = "blog";

        // Determine path - use slug for physical path, name for display path
        let dbPath = `/${name}`;
        let physicalPath = slug;

        if (parentId) {
            const { data: parent } = await supabase
                .from("media_folders")
                .select("path, slug")
                .eq("id", parentId)
                .single();
            if (parent) {
                dbPath = `${parent.path}/${name}`;
                // Build physical path recursively
                const parentPhysicalPath = await buildPhysicalPath(supabase, parentId);
                physicalPath = `${parentPhysicalPath}/${slug}`;
            }
        }

        // Check if folder already exists
        const { data: existingFolder } = await supabase
            .from("media_folders")
            .select("id")
            .eq("path", dbPath)
            .single();

        if (existingFolder) {
            return NextResponse.json(
                { error: "A folder with this name already exists in this location." },
                { status: 409 }
            );
        }

        // Create physical directory
        const uploadDir = path.join(process.cwd(), "public", "images", "media", physicalPath);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Create database record
        const { data, error } = await supabase
            .from("media_folders")
            .insert({
                name,
                slug,
                parent_id: parentId || null,
                path: dbPath
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            folder: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                parentId: data.parent_id,
                path: data.path,
                createdAt: data.created_at,
            },
        });
    } catch (error) {
        console.error("Folder creation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Folder creation failed" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { folderId } = body;

        if (!folderId) {
            return NextResponse.json({ error: "Folder ID is required" }, { status: 400 });
        }

        // Get the folder info
        const { data: folder, error: fetchError } = await supabase
            .from("media_folders")
            .select("*")
            .eq("id", folderId)
            .single();

        if (fetchError || !folder) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }

        const folderPath = folder.path as string;

        // Get all media items in this folder
        const { data: mediaItems } = await supabase
            .from("media_items")
            .select("id, storage_path")
            .eq("folder_id", folderId);

        // Delete media files from disk
        if (mediaItems && mediaItems.length > 0) {
            const { unlink } = await import("fs/promises");
            for (const item of mediaItems) {
                try {
                    const filePath = path.join(process.cwd(), "public", item.storage_path as string);
                    await unlink(filePath);
                } catch {
                    // File may not exist, continue
                }
            }

            // Delete media items from database
            await supabase
                .from("media_items")
                .delete()
                .eq("folder_id", folderId);
        }

        // Get and delete child folders recursively
        const { data: childFolders } = await supabase
            .from("media_folders")
            .select("id")
            .like("path", `${folderPath}/%`);

        if (childFolders && childFolders.length > 0) {
            for (const child of childFolders) {
                // Delete media items in child folders
                await supabase
                    .from("media_items")
                    .delete()
                    .eq("folder_id", child.id);
            }

            // Delete child folders
            await supabase
                .from("media_folders")
                .delete()
                .in("id", childFolders.map(c => c.id));
        }

        // Delete the physical folder from disk
        const { rm } = await import("fs/promises");

        // Strategy 1: Try recursive path (Correct logic)
        const fullPhysicalPath = await buildPhysicalPath(supabase, folderId);
        const correctPhysicalPath = path.join(process.cwd(), "public", "images", "media", fullPhysicalPath);

        console.log("----------------------------------------");
        console.log("DEBUG: Attempting to delete physical folder");
        console.log("DEBUG: Path 1 (Correct):", correctPhysicalPath);

        let deleted = false;

        try {
            if (existsSync(correctPhysicalPath)) {
                await rm(correctPhysicalPath, { recursive: true, force: true });
                console.log("DEBUG: Deleted via correct path");
                deleted = true;
            }
        } catch (err) {
            console.error("DEBUG: Failed to delete correct path:", err);
        }

        // Strategy 2: Try legacy/fragmented path (Fallback for folders created with old bug)
        // If the folder was created deeply nested but with shallow parent logic, it might be at parentSlug/slug
        if (!deleted && folder.parent_id) {
            const { data: parent } = await supabase
                .from("media_folders")
                .select("slug")
                .eq("id", folder.parent_id)
                .single();

            if (parent && folder.slug) {
                const legacyPath = path.join(process.cwd(), "public", "images", "media", parent.slug, folder.slug);
                console.log("DEBUG: Path 2 (Legacy/Fragmented):", legacyPath);

                try {
                    if (existsSync(legacyPath)) {
                        await rm(legacyPath, { recursive: true, force: true });
                        console.log("DEBUG: Deleted via legacy path");
                        deleted = true;
                    }
                } catch (err) {
                    console.error("DEBUG: Failed to delete legacy path:", err);
                }
            }
        }

        // Strategy 3: Try really shallow path (Just slug at root - if parent was missed)
        if (!deleted && folder.slug) {
            const shallowPath = path.join(process.cwd(), "public", "images", "media", folder.slug);
            console.log("DEBUG: Path 3 (Shallow):", shallowPath);
            try {
                // Be careful not to delete root folders like 'home-images' if we are deleting 'home-images'
                // But since folderId matches, it should be fine.
                // Only do this if it's NOT a root folder in DB, but exists at root on disk (orphan)
                if (folder.parent_id && existsSync(shallowPath)) {
                    await rm(shallowPath, { recursive: true, force: true });
                    console.log("DEBUG: Deleted via shallow path");
                }
            } catch (err) {
                console.error("DEBUG: Failed to delete shallow path:", err);
            }
        }
        console.log("----------------------------------------");
        console.log("----------------------------------------");

        // Delete the folder from database
        const { error: deleteError } = await supabase
            .from("media_folders")
            .delete()
            .eq("id", folderId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Folder deletion error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Folder deletion failed" },
            { status: 500 }
        );
    }
}
