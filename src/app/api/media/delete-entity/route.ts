import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { r2Delete, r2List } from "@/lib/r2";

const VARIANT_SUFFIXES = ["-500x500.webp", "-200x200.webp", "-100x100.webp"];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug } = body;

        if (!slug || typeof slug !== "string") {
            return NextResponse.json({ error: "A valid slug is required" }, { status: 400 });
        }

        console.log(`[Delete Entity Media] Starting deletion for slug: ${slug}`);

        const supabaseAdmin = createClient();
        let r2DeletedCount = 0;
        let dbDeletedCount = 0;
        const deletedFilenames = new Set<string>();

        // ── Strategy 1: Folder-based deletion (most reliable) ──
        const { data: folder } = await supabaseAdmin
            .from("media_folders")
            .select("id, name, slug")
            .eq("slug", slug)
            .maybeSingle();

        if (folder) {
            console.log(`[Delete Entity Media] Found folder: "${folder.name}" (id: ${folder.id})`);

            const { data: folderItems } = await supabaseAdmin
                .from("media_items")
                .select("id, filename, url")
                .eq("folder_id", folder.id);

            if (folderItems && folderItems.length > 0) {
                for (const item of folderItems) {
                    const filename = item.filename as string;
                    if (filename) {
                        deletedFilenames.add(filename);
                        await r2Delete(filename).catch(() => {});
                        r2DeletedCount++;
                        const stem = filename.replace(/\.[^.]+$/, '');
                        for (const suffix of VARIANT_SUFFIXES) {
                            await r2Delete(`${stem}${suffix}`).catch(() => {});
                        }
                    }
                }

                const { count } = await supabaseAdmin
                    .from("media_items")
                    .delete()
                    .eq("folder_id", folder.id);
                dbDeletedCount += count || folderItems.length;
            }

            const { error: folderError } = await supabaseAdmin
                .from("media_folders")
                .delete()
                .eq("id", folder.id);

            if (folderError) {
                console.error("[Delete Entity Media] Folder deletion error:", folderError);
            }
        } else {
            console.log(`[Delete Entity Media] No folder found for slug "${slug}", falling back to R2 prefix scan.`);
        }

        // ── Strategy 2: R2 prefix scan fallback ──
        const filePrefix = `${slug}-`;
        const r2Files = await r2List(filePrefix).catch(() => [] as string[]);
        const orphanedFiles = r2Files.filter(f => !deletedFilenames.has(f));

        for (const file of orphanedFiles) {
            await r2Delete(file).catch(() => {});
            r2DeletedCount++;
            console.log(`[Delete Entity Media] Cleaned up orphaned file: ${file}`);
        }

        if (orphanedFiles.length > 0) {
            const { count } = await supabaseAdmin
                .from("media_items")
                .delete()
                .like("filename", `${slug}-%`);
            dbDeletedCount += count || 0;
        }

        console.log(`[Delete Entity Media] Finished for "${slug}". R2 deleted: ${r2DeletedCount}, DB: ${dbDeletedCount}`);

        return NextResponse.json({
            success: true,
            physicalDeletedCount: r2DeletedCount,
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
