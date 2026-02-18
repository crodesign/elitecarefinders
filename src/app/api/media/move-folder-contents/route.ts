import { NextRequest, NextResponse } from "next/server";
import { rename, mkdir, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    const supabase = createClient();

    // Check authentication
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await request.json();
        const { sourceFolderId, destinationFolderId } = body;

        if (!sourceFolderId || !destinationFolderId) {
            return NextResponse.json({ error: "Source and destination folder IDs are required" }, { status: 400 });
        }

        if (sourceFolderId === destinationFolderId) {
            return NextResponse.json({ success: true, count: 0, message: "Source and destination are the same" });
        }

        // 1. Get Source and Destination Folder Details
        const { data: sourceFolder, error: sourceError } = await supabase
            .from("media_folders")
            .select("*")
            .eq("id", sourceFolderId)
            .single();

        if (sourceError || !sourceFolder) {
            return NextResponse.json({ error: "Source folder not found" }, { status: 404 });
        }

        const { data: destFolder, error: destError } = await supabase
            .from("media_folders")
            .select("*")
            .eq("id", destinationFolderId)
            .single();

        if (destError || !destFolder) {
            return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
        }

        // Only proceed if paths are valid strings
        if (!sourceFolder.path || !destFolder.path) {
            return NextResponse.json({ error: "Invalid folder paths" }, { status: 400 });
        }

        const sourcePath = path.join(process.cwd(), "public", "images", "media", sourceFolder.path.replace(/^\//, ''));
        const destPath = path.join(process.cwd(), "public", "images", "media", destFolder.path.replace(/^\//, ''));

        console.log(`[Move Folder] Moving contents from ${sourcePath} to ${destPath}`);

        // 2. Fetch all media items in source folder
        const { data: mediaItems, error: itemsError } = await supabase
            .from("media_items")
            .select("*")
            .eq("folder_id", sourceFolderId);

        if (itemsError) {
            console.error("Error fetching media items:", itemsError);
            return NextResponse.json({ error: "Failed to fetch media items" }, { status: 500 });
        }

        if (!mediaItems || mediaItems.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: "No items to move" });
        }

        // 3. Move Files and Update Database
        let moveCount = 0;
        const errors: any[] = [];
        const updatedItems: any[] = [];

        // Ensure destination directory exists
        if (!existsSync(destPath)) {
            await mkdir(destPath, { recursive: true });
        }

        for (const item of mediaItems) {
            try {
                const filename = item.filename;
                const oldFilePath = path.join(sourcePath, filename);
                const newFilePath = path.join(destPath, filename);

                // Check if file exists in source
                if (existsSync(oldFilePath)) {
                    // Move file
                    await rename(oldFilePath, newFilePath);
                } else {
                    console.warn(`[Move Folder] File not found at ${oldFilePath}, skipping physical move but updating DB.`);
                }

                // Construct new URL and storage path
                // Assumes URL structure: /images/media/Folder/Name/file.jpg
                const cleanDestPath = destFolder.path.replace(/^\//, ''); // Remove leading slash
                const newStoragePath = `/images/media/${cleanDestPath}/${filename}`;
                const newUrl = `/images/media/${cleanDestPath}/${filename}`;

                // Update Database Record
                const { data: updatedItem, error: updateError } = await supabase
                    .from("media_items")
                    .update({
                        folder_id: destinationFolderId,
                        url: newUrl,
                        storage_path: newStoragePath,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", item.id)
                    .select()
                    .single();

                if (updateError) {
                    throw new Error(`DB Update failed: ${updateError.message}`);
                }

                if (updatedItem) {
                    updatedItems.push(updatedItem);
                    moveCount++;
                }

            } catch (err) {
                console.error(`[Move Folder] Failed to move item ${item.id}:`, err);
                errors.push({ id: item.id, error: err instanceof Error ? err.message : String(err) });
            }
        }

        return NextResponse.json({
            success: true,
            count: moveCount,
            total: mediaItems.length,
            errors: errors.length > 0 ? errors : undefined,
            updatedItems
        });

    } catch (error) {
        console.error("Move folder contents error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
