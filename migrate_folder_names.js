// Migration script to standardize folder naming to use hyphens
// Run with: node migrate_folder_names.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local file manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const MEDIA_DIR = path.join(__dirname, 'public', 'images', 'media');

// Convert name to hyphen-separated slug
function toHyphenSlug(name) {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

async function migratePhysicalFolders() {
    console.log('\n=== PHYSICAL FOLDER MIGRATION ===\n');

    const entries = fs.readdirSync(MEDIA_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const oldName = entry.name;
        const newName = toHyphenSlug(oldName);

        if (oldName === newName) {
            console.log(`✓ ${oldName} (already correct)`);
            continue;
        }

        const oldPath = path.join(MEDIA_DIR, oldName);
        const newPath = path.join(MEDIA_DIR, newName);

        // Check if target already exists
        if (fs.existsSync(newPath)) {
            // Merge contents from underscore folder into hyphen folder
            console.log(`⚠ ${oldName} -> ${newName} (merging, target exists)`);

            // Move contents from old to new
            const contents = fs.readdirSync(oldPath, { withFileTypes: true });
            for (const item of contents) {
                const itemOldPath = path.join(oldPath, item.name);
                const itemNewName = toHyphenSlug(item.name);
                const itemNewPath = path.join(newPath, itemNewName);

                if (!fs.existsSync(itemNewPath)) {
                    fs.renameSync(itemOldPath, itemNewPath);
                    console.log(`  - Moved ${item.name} -> ${itemNewName}`);
                }
            }

            // Remove old folder if empty
            try {
                fs.rmdirSync(oldPath);
                console.log(`  - Removed empty folder ${oldName}`);
            } catch (e) {
                console.log(`  - Could not remove ${oldName} (not empty)`);
            }
        } else {
            // Simply rename
            fs.renameSync(oldPath, newPath);
            console.log(`✓ ${oldName} -> ${newName}`);
        }

        // Process subfolders
        if (fs.existsSync(newPath)) {
            const subfolders = fs.readdirSync(newPath, { withFileTypes: true });
            for (const sub of subfolders) {
                if (!sub.isDirectory()) continue;

                const subOldName = sub.name;
                const subNewName = toHyphenSlug(subOldName);

                if (subOldName !== subNewName) {
                    const subOldPath = path.join(newPath, subOldName);
                    const subNewPath = path.join(newPath, subNewName);

                    if (!fs.existsSync(subNewPath)) {
                        fs.renameSync(subOldPath, subNewPath);
                        console.log(`  ✓ ${subOldName} -> ${subNewName}`);
                    }
                }
            }
        }
    }
}

async function migrateDatabaseSlugs() {
    console.log('\n=== DATABASE SLUG MIGRATION ===\n');

    // Get all folders
    const { data: folders, error } = await supabase
        .from('media_folders')
        .select('*');

    if (error) {
        console.error('Error fetching folders:', error);
        return;
    }

    console.log(`Found ${folders.length} folders in database\n`);

    for (const folder of folders) {
        const oldSlug = folder.slug;
        const newSlug = toHyphenSlug(folder.name);

        if (oldSlug === newSlug) {
            console.log(`✓ ${folder.name} (slug: ${oldSlug}) - already correct`);
            continue;
        }

        // Update folder slug
        const { error: updateError } = await supabase
            .from('media_folders')
            .update({ slug: newSlug })
            .eq('id', folder.id);

        if (updateError) {
            console.error(`✗ Failed to update ${folder.name}:`, updateError);
        } else {
            console.log(`✓ ${folder.name}: ${oldSlug} -> ${newSlug}`);
        }
    }
}

async function migrateMediaItemUrls() {
    console.log('\n=== MEDIA ITEM URL MIGRATION ===\n');

    // Get all media items
    const { data: items, error } = await supabase
        .from('media_items')
        .select('id, storage_path, url');

    if (error) {
        console.error('Error fetching media items:', error);
        return;
    }

    console.log(`Found ${items.length} media items\n`);

    for (const item of items) {
        let newStoragePath = item.storage_path;
        let newUrl = item.url;

        // Replace underscores with hyphens in path segments
        // Pattern: /folder_name/ -> /folder-name/
        newStoragePath = newStoragePath.replace(/\/([a-z0-9]+)_([a-z0-9_]+)\//gi, (match, p1, rest) => {
            return '/' + toHyphenSlug(match.slice(1, -1)) + '/';
        });
        newUrl = newUrl.replace(/\/([a-z0-9]+)_([a-z0-9_]+)\//gi, (match, p1, rest) => {
            return '/' + toHyphenSlug(match.slice(1, -1)) + '/';
        });

        if (newStoragePath !== item.storage_path || newUrl !== item.url) {
            const { error: updateError } = await supabase
                .from('media_items')
                .update({ storage_path: newStoragePath, url: newUrl })
                .eq('id', item.id);

            if (updateError) {
                console.error(`✗ Failed to update item ${item.id}:`, updateError);
            } else {
                console.log(`✓ Updated: ${item.storage_path} -> ${newStoragePath}`);
            }
        }
    }
}

async function main() {
    console.log('='.repeat(50));
    console.log('FOLDER NAMING MIGRATION SCRIPT');
    console.log('Converting underscores to hyphens');
    console.log('='.repeat(50));

    try {
        await migratePhysicalFolders();
        await migrateDatabaseSlugs();
        await migrateMediaItemUrls();

        console.log('\n' + '='.repeat(50));
        console.log('MIGRATION COMPLETE');
        console.log('='.repeat(50));
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

main();
