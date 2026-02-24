const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
}

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
    // 1. Pick the home we just dumped: CHAN-000012240
    const { data: home } = await supabase
        .from("homes")
        .select("id, title, slug, images")
        .eq("slug", "chan-000012240")
        .single();

    if (!home) return console.log("Home not found");

    console.log("Calling API to rename 'CHAN-000012240' -> 'Testing-Rename-API'");

    const payload = {
        entityType: 'home',
        entityId: home.id,
        oldTitle: "CHAN-000012240",
        newTitle: "Testing-Rename-API",
        folderId: "2d06933d-398a-4046-83d3-909ff58ab78e",
    };

    const res = await fetch("http://localhost:3000/api/media/rename-entity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const body = await res.json();
    console.log("API STATUS:", res.status);
    console.log("API RESPONSE:", JSON.stringify(body, null, 2));
}

runTest();
