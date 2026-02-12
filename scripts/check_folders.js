
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFolders() {
    const { data: folders, error } = await supabase
        .from("media_folders")
        .select("id, name, slug, parent_id, path")
        .order("path");

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(JSON.stringify(folders, null, 2));
}

checkFolders();
