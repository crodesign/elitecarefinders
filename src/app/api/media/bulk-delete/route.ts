import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mediaIds } = body;

        if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
            return NextResponse.json({ error: "Media IDs are required" }, { status: 400 });
        }

        console.log("[Bulk Delete] Deleting", mediaIds.length, "items");

        // Get all media items to delete
        const { data: mediaItems, error: fetchError } = await supabase
            .from("media_items")
            .select("*")
            .in("id", mediaIds);

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!mediaItems || mediaItems.length === 0) {
            return NextResponse.json({ error: "No media items found" }, { status: 404 });
        }

        let deletedCount = 0;
        const filenames: string[] = [];

        // Delete each file
        for (const mediaItem of mediaItems) {
            const filename = mediaItem.filename as string;
            const storagePath = mediaItem.storage_path as string;
            const url = mediaItem.url as string;

            // Determine the physical file path
            let filePath: string;

            if (storagePath && storagePath.startsWith("/images/media/")) {
                filePath = path.join(process.cwd(), "public", storagePath);
            } else if (storagePath && existsSync(storagePath)) {
                filePath = storagePath;
            } else if (url) {
                filePath = path.join(process.cwd(), "public", url);
            } else {
                filePath = "";
            }

            // Delete the physical file
            if (filePath && existsSync(filePath)) {
                try {
                    await unlink(filePath);
                    console.log("[Bulk Delete] Deleted file:", filename);
                } catch (unlinkErr) {
                    console.error("[Bulk Delete] Failed to delete file:", filename, unlinkErr);
                }
            }

            filenames.push(filename);
            deletedCount++;
        }

        // Delete all records from database
        const { error: deleteError } = await supabase
            .from("media_items")
            .delete()
            .in("id", mediaIds);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        console.log("[Bulk Delete] Successfully deleted", deletedCount, "items");

        return NextResponse.json({
            success: true,
            deletedCount,
            filenames,
        });
    } catch (error) {
        console.error("Bulk delete error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Bulk delete failed" },
            { status: 500 }
        );
    }
}
