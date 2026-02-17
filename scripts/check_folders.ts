
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    // Print env keys to debug (partially)
    console.log("URL:", supabaseUrl ? "Present" : "Missing");
    console.log("Key:", supabaseKey ? "Present" : "Missing");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFolders() {
    console.log("Fetching folders...");
    const { data: folders, error } = await supabase
        .from("media_folders")
        .select("id, name, slug, parent_id, path")
        .order("path");

    if (error) {
        console.error("Error fetching folders:", error);
        return;
    }

    console.log("DB Folders:");
    folders.forEach((f: any) => {
        console.log(`ID: ${f.id} | Name: ${f.name} | Slug: ${f.slug} | Parent: ${f.parent_id} | Path: ${f.path}`);
    });
}

checkFolders();
