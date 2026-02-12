
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function renameFoldersStructure() {
    console.log("Starting folder structure rename...");

    // 1. Rename State Folders (remove -media suffix)
    // Fetch all folders that end with -media and have no parent (Assuming states are root)
    // Actually, check if they are states? Or just rename all root folders with -media?
    const { data: stateFolders } = await supabase
        .from("media_folders")
        .select("*")
        .is("parent_id", null)
        .like("slug", "%-media");

    console.log(`Found ${stateFolders?.length || 0} state folders to rename.`);

    if (stateFolders) {
        for (const folder of stateFolders) {
            const oldSlug = folder.slug;
            const newSlug = oldSlug.replace(/-media$/, "");

            if (oldSlug === newSlug) continue;

            console.log(`Renaming State: ${folder.name} (${oldSlug} -> ${newSlug})`);

            // Physical Rename
            const oldPhysPath = path.join(process.cwd(), "public", "images", "media", oldSlug);
            const newPhysPath = path.join(process.cwd(), "public", "images", "media", newSlug);

            try {
                if (fs.existsSync(oldPhysPath)) {
                    if (fs.existsSync(newPhysPath)) {
                        console.log(`Target path ${newPhysPath} already exists. Merging/Moving contents.`);
                        // Move contents of old to new
                        const files = fs.readdirSync(oldPhysPath);
                        for (const file of files) {
                            const oldFile = path.join(oldPhysPath, file);
                            const newFile = path.join(newPhysPath, file);
                            // If directory, we need recursive move? 
                            // fs.renameSync moves directories too.
                            if (!fs.existsSync(newFile)) {
                                fs.renameSync(oldFile, newFile);
                            } else {
                                console.log(`Conflict: ${file} exists in both. Skipping overwrite.`);
                            }
                        }
                        // Remove old dir if empty
                        if (fs.readdirSync(oldPhysPath).length === 0) {
                            fs.rmdirSync(oldPhysPath);
                        }
                    } else {
                        fs.renameSync(oldPhysPath, newPhysPath);
                    }
                    console.log("Physical rename success.");
                } else {
                    console.log("Physical folder not found, skipping fs rename.");
                }
            } catch (e) {
                console.error("FS Rename Error:", e);
            }

            // DB Update
            const { error } = await supabase
                .from("media_folders")
                .update({ slug: newSlug })
                .eq("id", folder.id);

            if (error) console.error("DB Update Error:", error);
        }
    }

    // 2. Rename Standard Subfolders (remove -images suffix)
    // This affects Home Images, Facility Images, Site Images, Blog Images
    // Logic: If slug ends in -images, truncated it.
    // Also specific mapping: home-images -> home, facility-images -> facility

    // We need to fetch ALL folders to handle nested ones too (like Hawaii > Oahu > Home Images)
    // But we process them carefully.

    const { data: subFolders } = await supabase
        .from("media_folders")
        .select("*")
        .like("slug", "%-images");

    console.log(`Found ${subFolders?.length || 0} subfolders to rename.`);

    if (subFolders) {
        // Sort by depth (path length) descending safely?
        // Actually, renaming slug only affects the folder's own name in path.
        // But physical path depends on PARENT.
        // If we renamed parent (State), we need to know the NEW parent physical path.

        // Strategy:
        // We already renamed State roots.
        // Now we rename children.
        // We need to re-fetch the parent's slug to build correct old/new paths.

        for (const folder of subFolders) {
            let newSlug = folder.slug;
            // Specific replacements based on our new rule
            if (folder.slug.endsWith("-home-images") || folder.slug === "home-images") newSlug = "home";
            else if (folder.slug.endsWith("-facility-images") || folder.slug === "facility-images") newSlug = "facility";
            else if (folder.slug.endsWith("-site-images") || folder.slug === "site-images") newSlug = "site";
            else if (folder.slug.endsWith("-blog-images") || folder.slug === "blog-images") newSlug = "blog";
            // Also handle the case where it might just be "oahu-facility-images" -> "facility"
            // Using strict mapping to user request:
            // "Home Images" -> "home"
            // "Facility Images" -> "facility"
            // So if name is "Home Images", slug becomes "home".

            if (folder.name === "Home Images") newSlug = "home";
            else if (folder.name === "Facility Images") newSlug = "facility";
            else if (folder.name === "Site Images") newSlug = "site";
            else if (folder.name === "Blog Images") newSlug = "blog";

            if (newSlug === folder.slug) continue;

            console.log(`Renaming Subfolder: ${folder.name} (Parent: ${folder.parent_id}) - ${folder.slug} -> ${newSlug}`);

            // Build Physical Paths
            // We need to reconstruct the full path to the folder to rename it.
            // AND the parent path might have changed (if it was a state).

            // Helper to build path
            const buildPath = async (id) => {
                let parts = [];
                let curr = id;
                while (curr) {
                    const { data } = await supabase.from("media_folders").select("slug, parent_id").eq("id", curr).single();
                    if (data) {
                        parts.unshift(data.slug);
                        curr = data.parent_id;
                    } else break;
                }
                return parts.join("/");
            };

            // The old path in DB (folder.path) is display path "/State/Sub".
            // We need physical path.
            // The DB slug for this folder is CURRENTLY the old slug.
            // The parent slug might have ALREADY been updated in step 1.

            // So, to find the CURRENT location on disk:
            // Get parent hierarchy slugs.
            // Append OLD slug of this folder.

            let parentPath = "";
            if (folder.parent_id) {
                // Get parent's current slug (fresh fetch)
                const parentParts = [];
                let curr = folder.parent_id;
                while (curr) {
                    const { data } = await supabase.from("media_folders").select("slug, parent_id").eq("id", curr).single();
                    if (data) {
                        parentParts.unshift(data.slug);
                        curr = data.parent_id;
                    } else break;
                }
                parentPath = parentParts.join("/");
            }

            const oldPhysicalPath = path.join(process.cwd(), "public", "images", "media", parentPath, folder.slug);
            const newPhysicalPath = path.join(process.cwd(), "public", "images", "media", parentPath, newSlug);

            console.log(`Renaming: ${oldPhysicalPath} -> ${newPhysicalPath}`);

            try {
                if (fs.existsSync(oldPhysicalPath)) {
                    if (fs.existsSync(newPhysicalPath)) {
                        // Merge
                        const files = fs.readdirSync(oldPhysicalPath);
                        for (const file of files) {
                            const oldFile = path.join(oldPhysicalPath, file);
                            const newFile = path.join(newPhysicalPath, file);
                            if (!fs.existsSync(newFile)) {
                                fs.renameSync(oldFile, newFile);
                            }
                        }
                        if (fs.readdirSync(oldPhysicalPath).length === 0) {
                            fs.rmdirSync(oldPhysicalPath);
                        }
                    } else {
                        fs.renameSync(oldPhysicalPath, newPhysicalPath);
                    }
                }
            } catch (e) { console.error("FS Error", e); }

            // Update DB
            await supabase
                .from("media_folders")
                .update({ slug: newSlug })
                .eq("id", folder.id);
        }
    }

    // 3. Update paths in DB for all children
    // Since we changed slugs, the 'path' column (used for finding children?) might be just display path 
    // Wait, 'path' column is usually Display Path e.g. "/Hawaii/Oahu".
    // Does 'path' column change?
    // User wants `\media\hawaii\oahu\facility\` -> This looks like physical path.
    // Display path usually stays "Hawaii", "Oahu".
    // If I changed SLUG, physical path changes.
    // Does DB `path` column rely on slug? 
    // In `route.ts`: `dbPath = ${parent.path}/${name}`. It uses NAME.
    // So DB `path` (Display Path) does NOT change if we only change slug.
    // EXCEPT if we renamed the folder NAME?
    // User requested "Correct folder structure".
    // "\media\hawaii\..."
    // If they mean physical, then ONLY slugs change.
    // If they mean "Facility Images" should be renamed "Facility" in the UI too?
    // "it is supposed to be: ... \facility\..."
    // Usually systems keep descriptive names in UI ("Facility Images") and short names in FS ("facility").
    // I will assume Name stays "Facility Images" (clearer for UI) but Slug becomes "facility".

    console.log("Renaming complete.");
}

renameFoldersStructure();
