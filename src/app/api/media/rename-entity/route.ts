import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { r2Rename, toPublicUrl } from "@/lib/r2";

/**
 * Rename Entity API
 *
 * When an entity's title changes, this API:
 * 1. Renames the entity's media folder (name, slug, path) in DB
 * 2. Renames all R2 files that start with the old slug
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

        const toSlug = (text: string): string =>
            text
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

        if (!oldTitle || !newTitle || oldTitle === newTitle) {
            return NextResponse.json({ success: true, results: ["No title change detected"] });
        }

        const oldSlug = toSlug(oldTitle);
        const newSlug = toSlug(newTitle);
        const oldUrlToNew: Record<string, string> = {};

        console.log(`[Rename] Title: "${oldTitle}" → "${newTitle}" (slug: ${oldSlug} → ${newSlug})`);

        // ── Step 1: Rename folder in DB ──
        let originalFolderSlug = oldSlug;

        if (folderId) {
            const { data: folder, error: folderErr } = await supabase
                .from("media_folders")
                .select("id, name, slug, path")
                .eq("id", folderId)
                .single();

            if (folder && !folderErr) {
                originalFolderSlug = folder.slug as string;

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

        const allUrls: string[] = [];
        if (entity.images && Array.isArray(entity.images)) {
            allUrls.push(...entity.images);
        }
        if (entity.team_images && Array.isArray(entity.team_images)) {
            allUrls.push(...entity.team_images);
        }
        if (entity.metadata && typeof entity.metadata === 'object') {
            const meta = entity.metadata as Record<string, unknown>;
            if (meta.instructions && Array.isArray(meta.instructions)) {
                for (const step of meta.instructions) {
                    if (step.image) allUrls.push(step.image);
                }
            }
        }

        const uniqueUrls = Array.from(new Set(allUrls));
        console.log(`[Rename] Found ${uniqueUrls.length} unique image URLs on entity`);

        // ── Step 3: Rename files in R2 and build URL mapping ──
        for (const url of uniqueUrls) {
            const oldFilename = url.split('/').pop();
            if (!oldFilename) continue;

            const { data: mediaItem } = await supabase
                .from("media_items")
                .select("id, filename, folder_id")
                .eq("url", url)
                .single();

            if (!mediaItem) {
                console.log(`[Rename] No media_items record for URL: ${url}`);
                continue;
            }

            let filePrefix = oldSlug;
            if (mediaItem.folder_id) {
                if (folderId && mediaItem.folder_id === folderId) {
                    filePrefix = originalFolderSlug;
                } else {
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

            const suffix = suffixMatch[1];
            const newFilename = `${newSlug}-${suffix}`;
            const newUrl = toPublicUrl(newFilename);

            // Rename main file in R2
            try {
                await r2Rename(oldFilename, newFilename);
                console.log(`[Rename] File: ${oldFilename} → ${newFilename}`);
            } catch (err) {
                console.warn(`[Rename] Failed to rename ${oldFilename} in R2:`, err);
            }

            // Track URL mapping
            oldUrlToNew[url] = newUrl;

            // Rename variant files in R2
            const oldStem = oldFilename.replace(/\.[^.]+$/, '');
            const newStem = newFilename.replace(/\.[^.]+$/, '');
            const variantDefs = [
                { suffix: "-500x500.webp", col: "url_large" },
                { suffix: "-200x200.webp", col: "url_medium" },
                { suffix: "-100x100.webp", col: "url_thumb" },
            ];
            const variantUpdates: Record<string, string> = {};
            for (const { suffix: varSuffix, col } of variantDefs) {
                const oldVariant = `${oldStem}${varSuffix}`;
                const newVariant = `${newStem}${varSuffix}`;
                await r2Rename(oldVariant, newVariant).catch(() => {});
                variantUpdates[col] = toPublicUrl(newVariant);
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
        const entityUpdates: Record<string, unknown> = {
            title: newTitle,
            slug: newSlug,
        };

        if (entity.images && Array.isArray(entity.images)) {
            entityUpdates.images = entity.images.map(
                (url: string) => oldUrlToNew[url] || url
            );
        }

        if (entity.team_images && Array.isArray(entity.team_images)) {
            entityUpdates.team_images = entity.team_images.map(
                (url: string) => oldUrlToNew[url] || url
            );
        }

        if (entity.metadata && typeof entity.metadata === 'object') {
            const metadata = { ...(entity.metadata as Record<string, unknown>) };
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
