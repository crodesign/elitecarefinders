
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpFolders() {
    console.log("Dumping all folders...");
    const { data: folders, error } = await supabase
        .from("media_folders")
        .select("*")
        .order("path");

    if (error) {
        console.error("Error:", error);
        return;
    }

    fs.writeFileSync("folders_dump.json", JSON.stringify(folders, null, 2));
    console.log(`Dumped ${folders.length} folders to folders_dump.json`);
}

dumpFolders();
