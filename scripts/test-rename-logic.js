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

async function testRename() {
    const out = [];
    out.push("Starting logic test...");

    const { data: homes } = await supabase
        .from("homes")
        .select("id, title, slug, images")
        .not("images", "eq", "{}")
        .order("created_at", { ascending: false })
        .limit(1);

    if (!homes || homes.length === 0) {
        out.push("No homes with images found");
        fs.writeFileSync(path.join(__dirname, "..", "tmp_rename_log.txt"), out.join("\n"));
        return;
    }

    const home = homes[0];
    out.push(`Testing with home: ${home.title} (${home.slug})`);
    out.push(`Images: ${JSON.stringify(home.images)}`);

    for (const url of home.images) {
        const oldFilename = url.split('/').pop();
        out.push(`\nProcessing URL: ${url} -> filename: ${oldFilename}`);

        const { data: mediaItem } = await supabase
            .from("media_items")
            .select("id, filename, folder_id")
            .eq("url", url)
            .single();

        if (!mediaItem) {
            out.push(`  No media_items record found for URL`);
            continue;
        }

        out.push(`  Found media item: ${mediaItem.filename} in folder ${mediaItem.folder_id}`);

        let filePrefix = home.slug;
        if (mediaItem.folder_id) {
            const { data: folder } = await supabase
                .from("media_folders")
                .select("slug")
                .eq("id", mediaItem.folder_id)
                .single();
            if (folder) {
                filePrefix = folder.slug;
                out.push(`  Folder slug prefix: ${filePrefix}`);
            }
        }

        const escapedPrefix = filePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = oldFilename.match(new RegExp(`^${escapedPrefix}-(.+)$`));

        if (match) {
            out.push(`  Match SUCCESS! Suffix: ${match[1]}`);
            out.push(`  New filename would be: new-slug-${match[1]}`);
        } else {
            out.push(`  Match FAILED! Escaped prefix ^${escapedPrefix}-(.+)$ did not match ${oldFilename}`);
        }
    }

    fs.writeFileSync(path.join(__dirname, "..", "tmp_rename_log.txt"), out.join("\n"));
    console.log("Done. Check tmp_rename_log.txt");
}

testRename().catch(console.error);
