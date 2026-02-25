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

        const supabaseAdmin = createClient();
        const mediaDir = path.join(process.cwd(), "public", "images", "media");
        let physicalDeletedCount = 0;
        let dbDeletedCount = 0;
        const deletedFilenames = new Set<string>();

        // ── Strategy 1: Folder-based deletion (most reliable) ──
        // Look up the media folder by slug and delete ALL items inside it.
        // This handles ALL images associated with the post (gallery, featured, step images)
        // using the direct DB relationship rather than filename prefix guessing.
        const { data: folder } = await supabaseAdmin
            .from("media_folders")
            .select("id, name, slug")
            .eq("slug", slug)
            .maybeSingle();

        if (folder) {
            console.log(`[Delete Entity Media] Found folder: "${folder.name}" (id: ${folder.id})`);

            // Get ALL media items in this folder
            const { data: folderItems } = await supabaseAdmin
                .from("media_items")
                .select("id, filename, url")
                .eq("folder_id", folder.id);

            if (folderItems && folderItems.length > 0) {
                // Delete physical files
                for (const item of folderItems) {
                    const filename = item.filename as string;
                    if (filename) {
                        deletedFilenames.add(filename);
                        if (existsSync(mediaDir)) {
                            const filePath = path.join(mediaDir, filename);
                            if (existsSync(filePath)) {
                                try {
                                    await unlink(filePath);
                                    physicalDeletedCount++;
                                } catch (err) {
                                    console.error(`[Delete Entity Media] Failed to delete file ${filename}:`, err);
                                }
                            }
                        }
                    }
                }

                // Delete all media_items records for this folder
                const { count } = await supabaseAdmin
                    .from("media_items")
                    .delete()
                    .eq("folder_id", folder.id);
                dbDeletedCount += count || folderItems.length;
            }

            // Delete the virtual folder record
            const { error: folderError } = await supabaseAdmin
                .from("media_folders")
                .delete()
                .eq("id", folder.id);

            if (folderError) {
                console.error("[Delete Entity Media] Folder deletion error:", folderError);
            }
        } else {
            console.log(`[Delete Entity Media] No folder found for slug "${slug}", falling back to filename prefix scan.`);
        }

        // ── Strategy 2: Filename prefix scan fallback ──
        // Catch any orphaned physical files or media_items that are not
        // properly linked to the folder (e.g. from legacy data or edge cases).
        if (existsSync(mediaDir)) {
            const files = await readdir(mediaDir);
            const filePrefix = `${slug}-`;

            const orphanedFiles = files.filter(f =>
                f.startsWith(filePrefix) && !deletedFilenames.has(f)
            );

            for (const file of orphanedFiles) {
                try {
                    await unlink(path.join(mediaDir, file));
                    physicalDeletedCount++;
                    console.log(`[Delete Entity Media] Cleaned up orphaned file: ${file}`);
                } catch (err) {
                    console.error(`[Delete Entity Media] Failed to delete orphaned file ${file}:`, err);
                }
            }

            // Also clean up any orphaned media_items records by filename prefix
            if (orphanedFiles.length > 0) {
                const { count } = await supabaseAdmin
                    .from("media_items")
                    .delete()
                    .like("filename", `${slug}-%`);
                dbDeletedCount += count || 0;
            }
        }

        console.log(`[Delete Entity Media] Finished for "${slug}". Physical: ${physicalDeletedCount}, DB: ${dbDeletedCount}`);

        return NextResponse.json({
            success: true,
            physicalDeletedCount,
            dbDeletedCount,
        });

    } catch (error) {
        console.error("[Delete Entity Media] Unexpected error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Deletion failed" },
            { status: 500 }
        );
    }
}
