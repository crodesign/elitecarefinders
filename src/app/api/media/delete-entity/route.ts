import { NextRequest, NextResponse } from "next/server";
import { readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug } = body;

        if (!slug || typeof slug !== "string") {
            return NextResponse.json({ error: "A valid slug is required" }, { status: 400 });
        }

        console.log(`[Delete Entity Media] Starting deletion for slug: ${slug}`);

        // 1. Physically delete all files matching `${slug}-*` in public/images/media/
        const mediaDir = path.join(process.cwd(), "public", "images", "media");
        let physicalDeletedCount = 0;

        if (existsSync(mediaDir)) {
            const files = await readdir(mediaDir);
            // Must end with hyphen to avoid prefix collisions (e.g. chan-12 vs chan-123)
            const filePrefix = `${slug}-`;

            const filesToDelete = files.filter(f => f.startsWith(filePrefix));

            for (const file of filesToDelete) {
                try {
                    await unlink(path.join(mediaDir, file));
                    physicalDeletedCount++;
                } catch (err) {
                    console.error(`[Delete Entity Media] Failed to delete file ${file}:`, err);
                }
            }
        }

        // 2. Delete database records in media_items via Admin Client
        const supabaseAdmin = createClient();

        const { count: dbDeletedCount, error: dbError } = await supabaseAdmin
            .from("media_items")
            .delete()
            .like("filename", `${slug}-%`);

        if (dbError) {
            console.error("[Delete Entity Media] Database deletion error:", dbError);
            // We don't throw here because we want to return the physical success even if db fails
        }

        // 3. Delete the virtual folder from media_folders
        const { error: folderError } = await supabaseAdmin
            .from("media_folders")
            .delete()
            .eq("slug", slug);

        if (folderError) {
            console.error("[Delete Entity Media] Folder deletion error:", folderError);
        }

        console.log(`[Delete Entity Media] Finished for ${slug}. Physical: ${physicalDeletedCount}, DB: ${dbDeletedCount || 0}`);

        return NextResponse.json({
            success: true,
            physicalDeletedCount,
            dbDeletedCount: dbDeletedCount || 0
        });

    } catch (error) {
        console.error("[Delete Entity Media] Unexpected error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Deletion failed" },
            { status: 500 }
        );
    }
}
