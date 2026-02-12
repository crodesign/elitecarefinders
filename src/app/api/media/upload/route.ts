import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const folderId = formData.get("folderId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Restricted folders - cannot upload directly to root or these parent folders
        const RESTRICTED_PARENT_FOLDERS = ["Home Images", "Facility Images"];

        // Check if uploading to root (no folder selected)
        if (!folderId) {
            return NextResponse.json(
                { error: "Please select a folder. Images cannot be saved to the root directory." },
                { status: 400 }
            );
        }

        // Check if uploading to a restricted parent folder
        const { data: selectedFolder } = await supabase
            .from("media_folders")
            .select("name, path, parent_id")
            .eq("id", folderId)
            .single();

        if (selectedFolder) {
            // Check if this is a restricted parent folder (no parent and name matches)
            const isRestrictedParent = !selectedFolder.parent_id &&
                RESTRICTED_PARENT_FOLDERS.includes(selectedFolder.name);

            if (isRestrictedParent) {
                return NextResponse.json(
                    { error: `Images cannot be saved directly in "${selectedFolder.name}". Please select or create a subfolder.` },
                    { status: 400 }
                );
            }
        }

        // Get folder info for auto-naming
        let folderSlug = "media"; // Default if no folder
        if (folderId) {
            const { data: folder } = await supabase
                .from("media_folders")
                .select("slug")
                .eq("id", folderId)
                .single();
            if (folder) {
                folderSlug = folder.slug as string;
            }
        }

        // Get file extension
        const extension = file.name.split('.').pop()?.toLowerCase() || "jpg";

        // Query existing files in this folder to find highest number
        const { data: existingFiles } = await supabase
            .from("media_items")
            .select("filename")
            .eq("folder_id", folderId);

        // Parse numbers from existing filenames and find max
        const pattern = new RegExp(`^${folderSlug}-(\\d+)`, 'i');
        const numbers = existingFiles?.map(f => {
            const match = (f.filename as string).match(pattern);
            return match ? parseInt(match[1]) : 0;
        }) || [];
        const nextNumber = Math.max(0, ...numbers) + 1;

        // Create filename based on folder slug and sequential number
        const filename = `${folderSlug}-${nextNumber}.${extension}`;
        console.log("[Upload] Auto-generated filename:", filename, "from existing count:", numbers.length);

        // Determine folder path from database using slug chain
        let folderPath = "";
        if (folderId) {
            // Build physical path by traversing parent folder chain
            const buildPhysicalPath = async (currentFolderId: string): Promise<string> => {
                const pathParts: string[] = [];
                let currentId: string | null = currentFolderId;

                while (currentId) {
                    const { data: f } = await supabase
                        .from("media_folders")
                        .select("slug, parent_id")
                        .eq("id", currentId)
                        .single();

                    if (f) {
                        pathParts.unshift(f.slug as string);
                        currentId = f.parent_id as string | null;
                    } else {
                        break;
                    }
                }

                return pathParts.join("/");
            };

            folderPath = await buildPhysicalPath(folderId);
            console.log("[Upload] Built folder path:", folderPath);
        }

        // Create directory structure
        const uploadDir = path.join(process.cwd(), "public", "images", "media", folderPath);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Write file to disk
        const filePath = path.join(uploadDir, filename);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Generate public URL (relative to public folder)
        const publicUrl = `/images/media/${folderPath ? folderPath + "/" : ""}${filename}`;

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
                storage_path: filePath,
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
