
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SUBFOLDERS = ["Home Images", "Facility Images"];

async function findAndSeed() {
    console.log("Searching for 'Oahu' folder globally...");

    const { data: oahu, error } = await supabase
        .from("media_folders")
        .select("id, name, slug, path, parent_id")
        .ilike("name", "Oahu") // Case insensitive match
        .single();

    if (error) {
        console.error("Error finding Oahu:", error);

        // Try to list all containing Oahu
        const { data: oahus } = await supabase
            .from("media_folders")
            .select("id, name, slug, path, parent_id")
            .ilike("name", "%Oahu%");
        console.log("All matching folders:", oahus);
        return;
    }

    if (!oahu) {
        console.log("Oahu folder clearly not found.");
        return;
    }

    console.log("Found Oahu:", oahu);

    // Check its parent
    const { data: parent } = await supabase
        .from("media_folders")
        .select("id, name, slug, path")
        .eq("id", oahu.parent_id)
        .single();

    console.log("Parent of Oahu:", parent);

    console.log("Seeding subfolders for Oahu...");

    for (const subName of SUBFOLDERS) {
        const simpleSlug = subName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const subPath = `${oahu.path}/${subName}`;

        // Check if subfolder exists
        const { data: existing } = await supabase
            .from("media_folders")
            .select("id")
            .eq("name", subName)
            .eq("parent_id", oahu.id)
            .single();

        if (!existing) {
            console.log(`Creating '${subName}' for Oahu...`);

            const { error: insertError } = await supabase
                .from("media_folders")
                .insert({
                    name: subName,
                    slug: simpleSlug,
                    parent_id: oahu.id,
                    path: subPath,
                    created_at: new Date().toISOString()
                });

            if (insertError) {
                console.error(`Failed to create DB record for ${subName}:`, insertError);
            } else {
                // Create physical folder
                // We need the full physical path chain.
                // Assuming we can trust path/slugs for now or just force it for Oahu
                // Path: .../hawaii-media/oahu/simple-slug

                // We need to know parent slug (Hawaii) + Oahu slug
                if (parent) {
                    const targetPhysicalPath = path.join(
                        process.cwd(),
                        "public", "images", "media",
                        parent.slug, // hawaii-media
                        oahu.slug,   // oahu
                        simpleSlug   // home-images
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
        } else {
            console.log(`'${subName}' already exists for Oahu.`);
        }
    }
}

findAndSeed();
