import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import sharp from "sharp";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        // Create session-aware Supabase client for authenticated requests
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const folderId = formData.get("folderId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Get folder info early for auto-naming and redirection
        let folderSlug = "site"; // Default if root
        let selectedFolder = null;
        if (folderId) {
            const { data } = await supabase
                .from("media_folders")
                .select("name, slug, path, parent_id")
                .eq("id", folderId)
                .single();
            if (data) {
                selectedFolder = data;
                folderSlug = data.slug as string;
            }
        }

        // Determine if this is a redirected folder (root or "Images" folder)
        const isRedirectedFolder = !folderId || (folderId && folderSlug === 'images');

        // Restricted folders - cannot upload directly to these parent folders
        const RESTRICTED_PARENT_FOLDERS = ["Home Images", "Facility Images"];

        // Determine storage path and URL based on folder
        let uploadDir = path.join(process.cwd(), "public", "images", "media");
        let publicUrlBase = "/images/media/";

        if (isRedirectedFolder) {
            // Root library or "Images" folder goes directly to /public/images
            uploadDir = path.join(process.cwd(), "public", "images");
            publicUrlBase = "/images/";
            console.log(`[Upload] Redirected folder detected (${folderSlug}), redirecting to /public/images`);
        } else if (selectedFolder) {
            // Check if uploading to a restricted parent folder
            const isRestrictedParent = !selectedFolder.parent_id &&
                RESTRICTED_PARENT_FOLDERS.includes(selectedFolder.name);

            if (isRestrictedParent) {
                return NextResponse.json(
                    { error: `Images cannot be saved directly in "${selectedFolder.name}". Please select or create a subfolder.` },
                    { status: 400 }
                );
            }
        }

        // Determine naming strategy
        let filename: string;

        // Images are always stored as WebP; non-images keep their original extension
        const isImage = file.type.startsWith("image/");
        const outputExt = isImage ? "webp" : (file.name.split('.').pop()?.toLowerCase() || "bin");

        if (isRedirectedFolder) {
            // Use original filename for redirected folders (swap extension to webp for images)
            const baseName = file.name.replace(/\.[^/.]+$/, "");

            // Collision check: append suffix if file exists
            let suffix = 0;
            let currentFilename = `${baseName}.${outputExt}`;

            while (existsSync(path.join(uploadDir, currentFilename))) {
                suffix++;
                currentFilename = `${baseName}-${suffix}.${outputExt}`;
            }
            filename = currentFilename;
            console.log("[Upload] Using original filename (with collision check):", filename);
        } else {
            // Sequential naming for other folders
            // Query existing files in this folder to find highest number
            const query = supabase.from("media_items").select("filename");
            if (folderId) {
                query.eq("folder_id", folderId);
            } else {
                query.is("folder_id", null);
            }
            const { data: filteredFiles } = await query;

            // Parse numbers from existing filenames and find max
            const pattern = new RegExp(`^${folderSlug}-(\\d+)`, 'i');
            const numbers = (filteredFiles || []).map(f => {
                const match = (f.filename as string).match(pattern);
                return match ? parseInt(match[1]) : 0;
            }) || [];
            const nextNumber = Math.max(0, ...numbers) + 1;

            filename = `${folderSlug}-${nextNumber}.${outputExt}`;
            console.log("[Upload] Auto-generated filename:", filename, "from folder:", folderSlug);
        }

        // Ensure directory exists
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate public URL
        const publicUrl = `${publicUrlBase}${filename}`;

        // Image processing with sharp (images only)
        let width: number | undefined;
        let height: number | undefined;
        let urlLarge: string | undefined;
        let urlMedium: string | undefined;
        let urlThumb: string | undefined;

        if (file.type.startsWith("image/")) {
            const img = sharp(buffer);
            const meta = await img.metadata();

            // Resize original if too large (fit inside 1940x1940, proportional, no crop)
            const needsResize = (meta.width ?? 0) > 1940 || (meta.height ?? 0) > 1940;
            const base = needsResize
                ? img.resize(1940, 1940, { fit: "inside", withoutEnlargement: true })
                : img;

            // Write (possibly resized) original in its native format
            const outMeta = await base.clone().toFile(filePath);
            width = outMeta.width;
            height = outMeta.height;

            // Derive variant filenames (WebP for smaller sizes)
            const stem = path.basename(filename, path.extname(filename));
            const largeFilename  = `${stem}-500x500.webp`;
            const mediumFilename = `${stem}-200x200.webp`;
            const thumbFilename  = `${stem}-100x100.webp`;

            await base.clone().resize(500, 500,  { fit: "cover", position: "centre" }).webp({ quality: 85 }).toFile(path.join(uploadDir, largeFilename));
            await base.clone().resize(200, 200,  { fit: "cover", position: "centre" }).webp({ quality: 85 }).toFile(path.join(uploadDir, mediumFilename));
            await base.clone().resize(100, 100,  { fit: "cover", position: "centre" }).webp({ quality: 85 }).toFile(path.join(uploadDir, thumbFilename));

            urlLarge  = `${publicUrlBase}${largeFilename}`;
            urlMedium = `${publicUrlBase}${mediumFilename}`;
            urlThumb  = `${publicUrlBase}${thumbFilename}`;

            console.log(`[Upload] Variants generated: ${largeFilename}, ${mediumFilename}, ${thumbFilename}`);
        } else {
            // Non-image file: write as-is
            await writeFile(filePath, buffer);
        }

        // Create database record
        const { data, error } = await supabase
            .from("media_items")
            .insert({
                folder_id: folderId,
                filename,
                original_filename: file.name,
                title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
                mime_type: file.type,
                file_size: file.size,
                width,
                height,
                storage_path: publicUrl,
                url: publicUrl,
                url_large: urlLarge,
                url_medium: urlMedium,
                url_thumb: urlThumb,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            item: {
                id: data.id,
                folderId: data.folder_id,
                filename: data.filename,
                originalFilename: data.original_filename,
                title: data.title,
                mimeType: data.mime_type,
                fileSize: data.file_size,
                width: data.width,
                height: data.height,
                url: data.url,
                urlLarge: data.url_large,
                urlMedium: data.url_medium,
                urlThumb: data.url_thumb,
                createdAt: data.created_at,
            },
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}
