
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role to see everything
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log("Checking public.user_roles...");
    const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

    if (rolesError) console.error("Error fetching roles:", rolesError);
    else console.log("Roles:", JSON.stringify(roles, null, 2));

    console.log("\nChecking public.user_profiles...");
    const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*");

    if (profilesError) console.error("Error fetching profiles:", profilesError);
    else console.log("Profiles:", JSON.stringify(profiles, null, 2));

    console.log("\nChecking auth.users (via admin api)...");
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) console.error("Error fetching auth users:", authError);
    else {
        console.log(`Found ${users.length} auth users.`);
        users.forEach(u => console.log(`- ${u.email} (${u.id})`));
    }
}

checkUsers();
