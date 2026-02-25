import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
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

        if (isRedirectedFolder) {
            // Use original filename for redirected folders
            const originalName = file.name;
            const extension = originalName.split('.').pop()?.toLowerCase() || "jpg";
            const baseName = originalName.replace(/\.[^/.]+$/, "");

            // Collision check: append suffix if file exists
            let suffix = 0;
            let currentFilename = originalName;

            while (existsSync(path.join(uploadDir, currentFilename))) {
                suffix++;
                currentFilename = `${baseName}-${suffix}.${extension}`;
            }
            filename = currentFilename;
            console.log("[Upload] Using original filename (with collision check):", filename);
        } else {
            // Sequential naming for other folders
            const extension = file.name.split('.').pop()?.toLowerCase() || "jpg";

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

            filename = `${folderSlug}-${nextNumber}.${extension}`;
            console.log("[Upload] Auto-generated filename:", filename, "from folder:", folderSlug);
        }

        // Ensure directory exists
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Write file to disk
        const filePath = path.join(uploadDir, filename);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Generate public URL
        const publicUrl = `${publicUrlBase}${filename}`;

        // Get image dimensions (for images only)
        let width: number | undefined;
        let height: number | undefined;
        // Note: For actual dimension detection, you'd use a library like sharp
        // For now, we skip this on server side

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
                url: data.url,
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
