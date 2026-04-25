import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { r2Delete } from "@/lib/r2";

const VARIANT_SUFFIXES = ["-500x500.webp", "-200x200.webp", "-100x100.webp"];

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const body = await request.json();
        const { mediaIds } = body;

        if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
            return NextResponse.json({ error: "Media IDs are required" }, { status: 400 });
        }

        console.log("[Bulk Delete] Deleting", mediaIds.length, "items");

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

        const filenames: string[] = [];

        for (const mediaItem of mediaItems) {
            const filename = mediaItem.filename as string;
            if (filename) {
                await r2Delete(filename).catch(() => {});
                const stem = filename.replace(/\.[^.]+$/, '');
                for (const suffix of VARIANT_SUFFIXES) {
                    await r2Delete(`${stem}${suffix}`).catch(() => {});
                }
                filenames.push(filename);
            }
        }

        const { error: deleteError } = await supabase
            .from("media_items")
            .delete()
            .in("id", mediaIds);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        console.log("[Bulk Delete] Successfully deleted", filenames.length, "items");

        return NextResponse.json({
            success: true,
            deletedCount: filenames.length,
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
