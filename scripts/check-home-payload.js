import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHomesPayload() {
    console.log("Fetching a sample Home (the first one) to inspect its exact payload shape...");

    const { data: home, error } = await supabase
        .from('homes')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error("Error fetching home:", error);
        return;
    }

    console.log("Full Home Record:");
    console.log(JSON.stringify(home, null, 2));

    console.log("\nInspecting properties matched by HomeForm checkIsDirty():");
    console.log("title:", home.title, typeof home.title);
    console.log("slug:", home.slug, typeof home.slug);
    console.log("description:", home.description, typeof home.description);
    console.log("phone:", home.phone, typeof home.phone);
    console.log("email:", home.email, typeof home.email);
    console.log("displayReferenceNumber:", home.display_reference_number, typeof home.display_reference_number);
    console.log("showAddress:", home.show_address, typeof home.show_address);
    // Note: frontend maps display_reference_number to displayReferenceNumber etc.
    console.log("address:", home.address, typeof home.address);
    console.log("roomDetails:", home.room_details, typeof home.room_details);
    console.log("images:", home.images, typeof home.images);
    console.log("taxonomyEntryIds:", home.taxonomy_entry_ids, typeof home.taxonomy_entry_ids);
}

checkHomesPayload();
