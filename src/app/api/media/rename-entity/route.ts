import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { rename } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * Rename Entity API
 * 
 * When an entity's title changes, this API:
 * 1. Renames the entity's media folder (name, slug, path) in DB
 * 2. Renames all physical files in flat dir that start with the old slug
 * 3. Updates media_items records (filename, url, storage_path) 
 * 4. Updates entity images[] / team_images[] / metadata with new URLs
 * 5. Updates child folder paths
 */
export async function POST(request: NextRequest) {
    const supabase = createAdminClient();

    try {
        const body = await request.json();
        const {
            entityType,  // 'home' | 'facility' | 'post'
            entityId,
            oldTitle,
            newTitle,
            folderId,    // Direct folder ID from form (most reliable)
        } = body;

        if (!entityType || !entityId) {
            return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
        }

        const results: string[] = [];

        // ── Helper: Generate slug from title ──
        const toSlug = (text: string): string =>
            text
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

        // ── Title Rename ──
        if (!oldTitle || !newTitle || oldTitle === newTitle) {
            return NextResponse.json({ success: true, results: ["No title change detected"] });
        }

        const oldSlug = toSlug(oldTitle);
        const newSlug = toSlug(newTitle);
        const mediaRoot = path.join(process.cwd(), "public", "images", "media");
        const oldUrlToNew: Record<string, string> = {};

        console.log(`[Rename] Title: "${oldTitle}" → "${newTitle}" (slug: ${oldSlug} → ${newSlug})`);

        // ── Step 1: Rename folder in DB ──
        let originalFolderSlug = oldSlug; // save for file renaming logic

        if (folderId) {
            const { data: folder, error: folderErr } = await supabase
                .from("media_folders")
                .select("id, name, slug, path")
                .eq("id", folderId)
                .single();

            if (folder && !folderErr) {
                originalFolderSlug = folder.slug as string; // save the original slug for file renaming later!

                const oldPath = folder.path as string;
                const pathParts = oldPath.split("/");
                pathParts[pathParts.length - 1] = newTitle;
                const newPath = pathParts.join("/");

                const { error: updateErr } = await supabase
                    .from("media_folders")
                    .update({ name: newTitle, slug: newSlug, path: newPath })
                    .eq("id", folderId);

                if (updateErr) {
                    console.error(`[Rename] Folder update failed:`, updateErr.message);
                    results.push(`Folder update failed: ${updateErr.message}`);
                } else {
                    results.push(`Folder renamed: ${folder.name} → ${newTitle}`);
                }

                // Update child folder paths
                const { data: childFolders } = await supabase
                    .from("media_folders")
                    .select("id, path")
                    .like("path", `${oldPath}/%`);

                if (childFolders && childFolders.length > 0) {
                    for (const child of childFolders) {
                        const childPath = child.path as string;
                        await supabase
                            .from("media_folders")
                            .update({ path: childPath.replace(oldPath, newPath) })
                            .eq("id", child.id);
                    }
                    results.push(`Updated ${childFolders.length} child folder paths`);
                }
            } else {
                console.log(`[Rename] Folder ${folderId} not found:`, folderErr?.message);
            }
        }

        // ── Step 2: Get entity's current image URLs ──
        const entityTable = entityType === 'home' ? 'homes'
            : entityType === 'facility' ? 'facilities'
                : 'posts';

        const { data: entity, error: entityErr } = await supabase
            .from(entityTable)
            .select("*")
            .eq("id", entityId)
            .single();

        if (!entity) {
            return NextResponse.json({ error: "Entity not found", details: entityErr }, { status: 404 });
        }

        // Collect ALL image URLs from the entity
        const allUrls: string[] = [];
        if (entity.images && Array.isArray(entity.images)) {
            allUrls.push(...entity.images);
        }
        if (entity.team_images && Array.isArray(entity.team_images)) {
            allUrls.push(...entity.team_images);
        }
        if (entity.metadata && typeof entity.metadata === 'object') {
            const meta = entity.metadata as Record<string, any>;
            if (meta.instructions && Array.isArray(meta.instructions)) {
                for (const step of meta.instructions) {
                    if (step.image) allUrls.push(step.image);
                }
            }
        }

        // Deduplicate
        const uniqueUrls = Array.from(new Set(allUrls));
        console.log(`[Rename] Found ${uniqueUrls.length} unique image URLs on entity`);

        // ── Step 3: Rename physical files and build URL mapping ──
        // For each referenced URL, look up its media_items record and folder
        // to find the actual filename prefix (folder slug), then swap it with newSlug
        for (const url of uniqueUrls) {
            const oldFilename = url.split('/').pop();
            if (!oldFilename) continue;

            // Look up the media_items record by URL to find its folder
            const { data: mediaItem } = await supabase
                .from("media_items")
                .select("id, filename, folder_id")
                .eq("url", url)
                .single();

            if (!mediaItem) {
                console.log(`[Rename] No media_items record for URL: ${url}`);
                continue;
            }

            // Get the folder's slug to know what prefix the filename uses
            let filePrefix = oldSlug; // fallback: try entity's old slug
            if (mediaItem.folder_id) {
                // If it's the exact same folder we just renamed, use the cached original slug!
                if (folderId && mediaItem.folder_id === folderId) {
                    filePrefix = originalFolderSlug;
                } else {
                    // Otherwise it's in a different folder, so looking it up dynamically is fine
                    const { data: itemFolder } = await supabase
                        .from("media_folders")
                        .select("slug")
                        .eq("id", mediaItem.folder_id)
                        .single();
                    if (itemFolder?.slug) {
                        filePrefix = itemFolder.slug as string;
                    }
                }
            }

            let suffixMatch = null;
            try {
                const escapedPrefix = filePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                suffixMatch = oldFilename.match(new RegExp(`^${escapedPrefix}-(.+)$`));
            } catch (regErr) {
                console.error(`Regex error for filePrefix ${filePrefix}:`, regErr);
            }

            if (!suffixMatch) {
                console.log(`[Rename] File "${oldFilename}" doesn't match prefix "${filePrefix}", skipping`);
                continue;
            }

            const suffix = suffixMatch[1]; // e.g., "dining-room.jpg" or "1-c6bf1b.jpg"
            const newFilename = `${newSlug}-${suffix}`;
            const newUrl = `/images/media/${newFilename}`;

            // Rename physical file
            const oldFilePath = path.join(mediaRoot, oldFilename);
            const newFilePath = path.join(mediaRoot, newFilename);

            // LOG TRACE
            try {
                const traceLog = `Renaming: ${oldFilePath} -> ${newFilePath}\n`;
                require('fs').appendFileSync(path.join(process.cwd(), 'tmp_api_trace.log'), traceLog);
            } catch (e) { }

            if (existsSync(oldFilePath)) {
                try {
                    await rename(oldFilePath, newFilePath);
                    console.log(`[Rename] File: ${oldFilename} → ${newFilename}`);
                } catch (err) {
                    console.warn(`[Rename] Failed to rename ${oldFilename}:`, err);
                }
            } else {
                console.log(`[Rename] File not on disk: ${oldFilename}`);
            }

            // Track URL mapping
            oldUrlToNew[url] = newUrl;

            // Rename variant files and build variant URL updates
            const oldStem = path.basename(oldFilename, path.extname(oldFilename));
            const newStem = path.basename(newFilename, path.extname(newFilename));
            const variantDefs = [
                { suffix: "-500x500.webp", col: "url_large" },
                { suffix: "-200x200.webp", col: "url_medium" },
                { suffix: "-100x100.webp", col: "url_thumb" },
            ];
            const variantUpdates: Record<string, string> = {};
            for (const { suffix, col } of variantDefs) {
                const oldVariant = `${oldStem}${suffix}`;
                const newVariant = `${newStem}${suffix}`;
                const oldVariantPath = path.join(mediaRoot, oldVariant);
                const newVariantPath = path.join(mediaRoot, newVariant);
                if (existsSync(oldVariantPath)) {
                    await rename(oldVariantPath, newVariantPath).catch((err) =>
                        console.warn(`[Rename] Failed to rename variant ${oldVariant}:`, err)
                    );
                }
                variantUpdates[col] = `/images/media/${newVariant}`;
            }

            // Update media_items record
            const { error: mediaUpdateErr } = await supabase
                .from("media_items")
                .update({
                    filename: newFilename,
                    url: newUrl,
                    storage_path: newUrl,
                    ...variantUpdates,
                })
                .eq("id", mediaItem.id);

            if (mediaUpdateErr) {
                console.warn(`[Rename] media_items update error:`, mediaUpdateErr.message);
            }
        }

        const renamedCount = Object.keys(oldUrlToNew).length;
        if (renamedCount > 0) {
            results.push(`Renamed ${renamedCount} files`);
        }

        // ── Step 4: Update entity record ──
        const entityUpdates: Record<string, any> = {
            title: newTitle,
            slug: newSlug,
        };

        // Update images[]
        if (entity.images && Array.isArray(entity.images)) {
            entityUpdates.images = entity.images.map(
                (url: string) => oldUrlToNew[url] || url
            );
        }

        // Update team_images[]
        if (entity.team_images && Array.isArray(entity.team_images)) {
            entityUpdates.team_images = entity.team_images.map(
                (url: string) => oldUrlToNew[url] || url
            );
        }

        // Update recipe step images in metadata
        if (entity.metadata && typeof entity.metadata === 'object') {
            const metadata = { ...(entity.metadata as Record<string, any>) };
            if (metadata.instructions && Array.isArray(metadata.instructions)) {
                let metaChanged = false;
                for (const step of metadata.instructions) {
                    if (step.image && oldUrlToNew[step.image]) {
                        step.image = oldUrlToNew[step.image];
                        metaChanged = true;
                    }
                }
                if (metaChanged) {
                    entityUpdates.metadata = metadata;
                }
            }
        }

        const { error: entityUpdateErr } = await supabase
            .from(entityTable)
            .update(entityUpdates)
            .eq("id", entityId);

        if (entityUpdateErr) {
            console.error(`[Rename] Entity update failed:`, entityUpdateErr.message);
            results.push(`Entity update failed: ${entityUpdateErr.message}`);
        } else {
            results.push(`Entity updated: title, slug, ${renamedCount} image URLs`);
        }

        console.log(`[Rename] Complete:`, results);

        return NextResponse.json({
            success: true,
            results,
            renamedFiles: oldUrlToNew,
        });

    } catch (error) {
        console.error("[Rename Entity] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Rename failed" },
            { status: 500 }
        );
    }
}
