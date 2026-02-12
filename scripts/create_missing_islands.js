
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ISLANDS = ["Oahu", "Maui", "Hawaii", "Kauai", "Molokai", "Lanai"];
const SUBFOLDERS = ["Home Images", "Facility Images"];

async function createMissingIslands() {
    console.log("Checking for missing Hawaii islands...");

    // 1. Get Hawaii folder
    let hawaii;
    const { data: hawaiiData, error } = await supabase
        .from("media_folders")
        .select("id, path, slug")
        .eq("slug", "hawaii-media")
        .single();

    if (error) {
        const { data: hawaiiName } = await supabase
            .from("media_folders")
            .select("id, path, slug")
            .eq("name", "Hawaii")
            .single();
        hawaii = hawaiiName;
    } else {
        hawaii = hawaiiData;
    }

    if (!hawaii) {
        console.error("Hawaii folder not found!");
        return;
    }

    console.log("Found Hawaii folder:", hawaii);

    // 2. Iterate through islands
    for (const islandName of ISLANDS) {
        // Find island folder
        let { data: island } = await supabase
            .from("media_folders")
            .select("id, slug, path")
            .eq("name", islandName)
            .eq("parent_id", hawaii.id)
            .single();

        if (!island) {
            console.log(`Island '${islandName}' not found. Creating it...`);

            const slug = islandName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
            const islandPath = `${hawaii.path}/${islandName}`;

            const { data: newIsland, error: createError } = await supabase
                .from("media_folders")
                .insert({
                    name: islandName,
                    slug: slug,
                    parent_id: hawaii.id,
                    path: islandPath,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error(`Failed to create island ${islandName}:`, createError);
                continue;
            }

            island = newIsland;
            console.log(`Created DB record for ${islandName}`);

            // Physical folder
            const physicalPath = path.join(
                process.cwd(),
                "public", "images", "media",
                patterns.hawaiiSlug(hawaii.slug),
                slug
            );
            // Wait, helper function isn't available. Just use known logic.
            // Hawaii slug is 'hawaii-media'.
            const targetPhysicalPath = path.join(
                process.cwd(),
                "public", "images", "media",
                hawaii.slug,
                slug
            );
            try {
                if (!fs.existsSync(targetPhysicalPath)) {
                    fs.mkdirSync(targetPhysicalPath, { recursive: true });
                    console.log(`Created physical folder: ${targetPhysicalPath}`);
                }
            } catch (e) { console.error("FS Error", e); }
        } else {
            console.log(`Island '${islandName}' exists.`);
        }

        // 3. Create subfolders
        for (const subName of SUBFOLDERS) {
            const simpleSlug = subName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
            const subPath = `${island.path}/${subName}`;

            const { data: existing } = await supabase
                .from("media_folders")
                .select("id")
                .eq("name", subName)
                .eq("parent_id", island.id)
                .single();

            if (!existing) {
                console.log(`Creating '${subName}' for ${islandName}...`);

                const { error } = await supabase
                    .from("media_folders")
                    .insert({
                        name: subName,
                        slug: simpleSlug,
                        parent_id: island.id,
                        path: subPath,
                        created_at: new Date().toISOString()
                    });

                if (error) {
                    console.error(`Failed to create DB record for ${subName}:`, error);
                } else {
                    const targetPhysicalPath = path.join(
                        process.cwd(),
                        "public", "images", "media",
                        hawaii.slug,
                        island.slug,
                        simpleSlug
                    );

                    try {
                        if (!fs.existsSync(targetPhysicalPath)) {
                            fs.mkdirSync(targetPhysicalPath, { recursive: true });
                            console.log(`Created physical folder: ${targetPhysicalPath}`);
                        }
                    } catch (e) {
                        console.error("FS Error:", e);
                    }
                }
            }
        }
    }
}

// Helper mock
const patterns = {
    hawaiiSlug: (s) => s
};

createMissingIslands();
