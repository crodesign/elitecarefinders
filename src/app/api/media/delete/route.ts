import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { r2Delete, filenameFromUrl } from "@/lib/r2";

const VARIANT_SUFFIXES = ["-500x500.webp", "-200x200.webp", "-100x100.webp"];

export async function DELETE(request: NextRequest) {
    try {
        const supabase = createClient();
        const body = await request.json();
        const { mediaId } = body;

        if (!mediaId) {
            return NextResponse.json({ error: "Media ID is required" }, { status: 400 });
        }

        const { data: mediaItem, error: fetchError } = await supabase
            .from("media_items")
            .select("*")
            .eq("id", mediaId)
            .single();

        if (fetchError || !mediaItem) {
            return NextResponse.json({ error: "Media item not found" }, { status: 404 });
        }

        const filename = (mediaItem.filename as string) || filenameFromUrl(mediaItem.url as string);

        console.log("[Media Delete] Deleting:", { mediaId, filename });

        if (filename) {
            await r2Delete(filename).catch((err) =>
                console.warn("[Media Delete] R2 delete failed:", err)
            );
            const stem = filename.replace(/\.[^.]+$/, '');
            for (const suffix of VARIANT_SUFFIXES) {
                await r2Delete(`${stem}${suffix}`).catch(() => {});
            }
        }

        const { error: deleteError } = await supabase
            .from("media_items")
            .delete()
            .eq("id", mediaId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, filename });
    } catch (error) {
        console.error("Media delete error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Delete failed" },
            { status: 500 }
        );
    }
}
