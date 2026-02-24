const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectData() {
    const out = [];

    // 1. Get the most recently updated home or one with images
    const { data: homes } = await supabase
        .from("homes")
        .select("id, title, slug, images")
        .not("images", "eq", "{}")
        .order("updated_at", { ascending: false })
        .limit(1);

    if (!homes || homes.length === 0) {
        return console.log("No homes found");
    }

    const home = homes[0];
    out.push(`Home: ${home.title} (slug: ${home.slug})`);
    out.push(`Images: ${JSON.stringify(home.images, null, 2)}`);

    for (const url of home.images) {
        out.push(`\nChecking URL: ${url}`);
        const filename = url.split('/').pop();
        out.push(`Filename extracted: ${filename}`);

        const { data: mediaItem } = await supabase
            .from("media_items")
            .select("*")
            .eq("url", url)
            .single();

        if (!mediaItem) {
            out.push(`  ❌ No media_items record found for this URL!`);
            continue;
        }

        out.push(`  ✅ Found media item:`);
        out.push(`     id: ${mediaItem.id}`);
        out.push(`     filename: ${mediaItem.filename}`);
        out.push(`     url: ${mediaItem.url}`);
        out.push(`     folder_id: ${mediaItem.folder_id}`);

        if (mediaItem.folder_id) {
            const { data: folder } = await supabase
                .from("media_folders")
                .select("id, name, slug, path")
                .eq("id", mediaItem.folder_id)
                .single();

            if (folder) {
                out.push(`  📂 Inside Folder:`);
                out.push(`     name: ${folder.name}`);
                out.push(`     slug: ${folder.slug}`);
                out.push(`     path: ${folder.path}`);
            } else {
                out.push(`  ❌ Folder not found in DB`);
            }
        }
    }

    fs.writeFileSync(path.join(__dirname, "..", "tmp_rename_debug.txt"), out.join("\n"));
    console.log("Done checking, see tmp_rename_debug.txt");
}

inspectData().catch(console.error);
