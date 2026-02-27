/**
 * generate-image-variants.js
 *
 * Generates missing image variants (500x500, 200x200, 100x100 WebP) for all
 * existing media_items that live in /images/media/ and don't yet have url_large set.
 *
 * Usage:
 *   node scripts/generate-image-variants.js           # live run
 *   node scripts/generate-image-variants.js --dry-run # preview only
 */

require("dotenv").config({ path: ".env.local" });
const sharp = require("sharp");
const path = require("path");
const { existsSync } = require("fs");
const { createClient } = require("@supabase/supabase-js");

const DRY_RUN = process.argv.includes("--dry-run");
const MEDIA_DIR = path.join(process.cwd(), "public", "images", "media");
const VARIANT_DEFS = [
    { suffix: "-500x500.webp", col: "url_large",  width: 500, height: 500 },
    { suffix: "-200x200.webp", col: "url_medium", width: 200, height: 200 },
    { suffix: "-100x100.webp", col: "url_thumb",  width: 100, height: 100 },
];

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log(DRY_RUN ? "[DRY RUN] No files will be written or DB updated.\n" : "[LIVE] Processing images...\n");

    // Fetch all media_items in /images/media/ missing url_large
    const { data: items, error } = await supabase
        .from("media_items")
        .select("id, filename, url, url_large")
        .like("url", "/images/media/%")
        .is("url_large", null)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Failed to fetch media_items:", error.message);
        process.exit(1);
    }

    console.log(`Found ${items.length} items to process.\n`);

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of items) {
        const filename = item.filename;
        const filePath = path.join(MEDIA_DIR, filename);
        const stem = path.basename(filename, path.extname(filename));

        if (!existsSync(filePath)) {
            console.log(`  [SKIP] File not on disk: ${filename}`);
            skipped++;
            continue;
        }

        // Skip non-image files (rough check by extension)
        const ext = path.extname(filename).toLowerCase();
        if (![".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"].includes(ext)) {
            console.log(`  [SKIP] Not an image: ${filename}`);
            skipped++;
            continue;
        }

        try {
            const img = sharp(filePath);
            const meta = await img.metadata();

            // Resize base if original is oversized
            const needsResize = (meta.width ?? 0) > 1940 || (meta.height ?? 0) > 1940;
            const base = needsResize
                ? img.resize(1940, 1940, { fit: "inside", withoutEnlargement: true })
                : img;

            const updates = {};

            for (const { suffix, col, width, height } of VARIANT_DEFS) {
                const variantFilename = `${stem}${suffix}`;
                const variantPath = path.join(MEDIA_DIR, variantFilename);
                const variantUrl = `/images/media/${variantFilename}`;

                if (DRY_RUN) {
                    console.log(`  [DRY] Would generate: ${variantFilename}`);
                } else {
                    await base.clone()
                        .resize(width, height, { fit: "cover", position: "centre" })
                        .webp({ quality: 85 })
                        .toFile(variantPath);
                }

                updates[col] = variantUrl;
            }

            if (!DRY_RUN) {
                const { error: updateErr } = await supabase
                    .from("media_items")
                    .update(updates)
                    .eq("id", item.id);

                if (updateErr) {
                    console.error(`  [FAIL] DB update for ${filename}:`, updateErr.message);
                    failed++;
                    continue;
                }
            }

            console.log(`  [OK] ${filename}`);
            success++;
        } catch (err) {
            console.error(`  [FAIL] ${filename}:`, err.message);
            failed++;
        }
    }

    console.log(`\nDone. Success: ${success} | Skipped: ${skipped} | Failed: ${failed}`);
}

run();
