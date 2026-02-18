import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createClient } from "@/lib/supabase-server";

export async function DELETE(request: NextRequest) {
    try {
        const supabase = createClient();
        const body = await request.json();
        const { mediaId } = body;

        if (!mediaId) {
            return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
        }

        // Get the media item to get file path
        const { data: mediaItem, error: fetchError } = await supabase
            .from("media_items")
            .select("*")
            .eq("id", mediaId)
            .single();

        if (fetchError || !mediaItem) {
            return NextResponse.json({ error: "Media item not found" }, { status: 404 });
        }

        const filename = mediaItem.filename as string;
        const storagePath = mediaItem.storage_path as string;
        const url = mediaItem.url as string;

        // Determine the physical file path
        let filePath: string;

        if (storagePath && storagePath.startsWith("/images/media/")) {
            // storage_path is relative like /images/media/folder/file.jpg
            filePath = path.join(process.cwd(), "public", storagePath);
        } else if (storagePath && existsSync(storagePath)) {
            // storage_path is absolute
            filePath = storagePath;
        } else if (url) {
            // Fallback: derive from URL
            filePath = path.join(process.cwd(), "public", url);
        } else {
            filePath = "";
        }

        console.log("[Media Delete] Deleting file:", {
            mediaId,
            filename,
            storagePath,
            url,
            filePath,
        });

        // Delete the physical file
        if (filePath && existsSync(filePath)) {
            try {
                await unlink(filePath);
                console.log("[Media Delete] File deleted successfully:", filePath);
            } catch (unlinkErr) {
                console.error("[Media Delete] Failed to delete file:", unlinkErr);
                // Continue with database deletion even if file deletion fails
            }
        } else {
            console.warn("[Media Delete] File not found on disk:", filePath);
        }

        // Delete from database
        const { error: deleteError } = await supabase
            .from("media_items")
            .delete()
            .eq("id", mediaId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            filename: filename
        });
    } catch (error) {
        console.error("Media delete error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Delete failed" },
            { status: 500 }
        );
    }
}
