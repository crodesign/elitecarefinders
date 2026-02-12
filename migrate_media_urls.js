// Script to update media URLs from old folder structure to new
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrateMediaUrls() {
    // Get all media items
    const { data: items, error } = await supabase
        .from('media_items')
        .select('id, url, storage_path');

    if (error) {
        console.error('Error fetching media items:', error);
        return;
    }

    console.log(`Found ${items.length} media items to check`);

    for (const item of items) {
        // Convert old path format to new (lowercase, underscores)
        let newUrl = item.url;
        let newStoragePath = item.storage_path;

        // Replace "Home Images" with "home_images"
        newUrl = newUrl.replace(/\/Home Images\//g, '/home_images/');
        newUrl = newUrl.replace(/\/New Temp House\//g, '/new_temp_house/');
        newUrl = newUrl.replace(/\/Temp House\//g, '/temp_house/');
        newUrl = newUrl.replace(/\/Facility Images\//g, '/facility_images/');
        newUrl = newUrl.replace(/\/Blog Images\//g, '/blog_images/');
        newUrl = newUrl.replace(/\/Site Images\//g, '/site_images/');

        // Same for storage path
        newStoragePath = newStoragePath.replace(/\\Home Images\\/g, '\\home_images\\');
        newStoragePath = newStoragePath.replace(/\\New Temp House\\/g, '\\new_temp_house\\');
        newStoragePath = newStoragePath.replace(/\\Temp House\\/g, '\\temp_house\\');
        newStoragePath = newStoragePath.replace(/\\Facility Images\\/g, '\\facility_images\\');
        newStoragePath = newStoragePath.replace(/\\Blog Images\\/g, '\\blog_images\\');
        newStoragePath = newStoragePath.replace(/\\Site Images\\/g, '\\site_images\\');

        if (newUrl !== item.url || newStoragePath !== item.storage_path) {
            console.log(`Updating: ${item.url} -> ${newUrl}`);

            const { error: updateError } = await supabase
                .from('media_items')
                .update({ url: newUrl, storage_path: newStoragePath })
                .eq('id', item.id);

            if (updateError) {
                console.error(`Error updating ${item.id}:`, updateError);
            }
        }
    }

    console.log('Migration complete!');
}

migrateMediaUrls();
