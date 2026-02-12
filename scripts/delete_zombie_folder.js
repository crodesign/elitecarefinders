
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteZombieFolder() {
    console.log("Deleting zombie 'Oahu' folder...");

    // First, verify it is the one we think it is
    const { data: folder } = await supabase
        .from("media_folders")
        .select("id, name, path")
        .eq("name", "Oahu")
        .eq("path", "/Hawaii/Oahu")
        .single();

    if (!folder) {
        console.log("Folder not found matching criteria.");
        return;
    }

    console.log("Found folder:", folder);

    // Delete it
    const { error } = await supabase
        .from("media_folders")
        .delete()
        .eq("id", folder.id);

    if (error) {
        console.error("Error deleting folder:", error);
    } else {
        console.log("Folder deleted successfully from DB.");
    }
}

deleteZombieFolder();
