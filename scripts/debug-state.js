const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const out = [];
    const { data: homes } = await sb.from("homes").select("id,title,slug,address").order("created_at", { ascending: false }).limit(5);
    out.push("Recent homes:");
    for (const h of homes || []) {
        out.push(`  ${h.title} (${h.slug}) ${JSON.stringify(h.address)}`);
    }

    const { data: folders } = await sb.from("media_folders").select("id,name,slug,path").order("created_at", { ascending: false }).limit(15);
    out.push("\nRecent folders:");
    for (const f of folders || []) {
        out.push(`  ${f.name} => ${f.path}`);
    }

    const { data: items } = await sb.from("media_items").select("id,filename,url,folder_id").order("created_at", { ascending: false }).limit(10);
    out.push("\nRecent media items:");
    for (const i of items || []) {
        out.push(`  ${i.filename} => ${i.url} (folder: ${i.folder_id})`);
    }

    fs.writeFileSync(path.join(__dirname, "..", "tmp_state.txt"), out.join("\n"), "utf-8");
    console.log("Done - see tmp_state.txt");
}

run().catch(console.error);
