import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { r2Upload, r2Exists, toPublicUrl } from "@/lib/r2";

export async function POST(request: NextRequest) {
    try {
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
        // Optional slug prefix override — e.g. post title slug so files are named
        // "sugar-cookies-1.webp" instead of "posts-1.webp"
        const namePrefix = (formData.get("namePrefix") as string | null)?.trim() || null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Get folder info early for auto-naming
        let folderSlug = "site";
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

        const isRedirectedFolder = !folderId || (folderId && folderSlug === 'images');

        // Restricted folders - cannot upload directly to these parent folders
        const RESTRICTED_PARENT_FOLDERS = ["Home Images", "Facility Images"];

        if (!isRedirectedFolder && selectedFolder) {
            const isRestrictedParent = !selectedFolder.parent_id &&
                RESTRICTED_PARENT_FOLDERS.includes(selectedFolder.name);
            if (isRestrictedParent) {
                return NextResponse.json(
                    { error: `Images cannot be saved directly in "${selectedFolder.name}". Please select or create a subfolder.` },
                    { status: 400 }
                );
            }
        }

        const PASSTHROUGH_TYPES = new Set(["image/png", "image/gif", "image/svg+xml"]);
        const isImage = file.type.startsWith("image/");
        const isConvertible = isImage && !PASSTHROUGH_TYPES.has(file.type);
        const outputExt = isConvertible ? "webp" : (file.name.split('.').pop()?.toLowerCase() || "bin");

        let filename: string;

        if (isRedirectedFolder) {
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            let suffix = 0;
            let currentFilename = `${baseName}.${outputExt}`;
            while (await r2Exists(currentFilename)) {
                suffix++;
                currentFilename = `${baseName}-${suffix}.${outputExt}`;
            }
            filename = currentFilename;
            console.log("[Upload] Using original filename (with collision check):", filename);
        } else {
            const query = supabase.from("media_items").select("filename");
            if (folderId) {
                query.eq("folder_id", folderId);
            } else {
                query.is("folder_id", null);
            }
            const { data: filteredFiles } = await query;
            const namingBase = namePrefix || folderSlug;
            const pattern = new RegExp(`^${namingBase}-(\\d+)`, 'i');
            const numbers = (filteredFiles || []).map(f => {
                const match = (f.filename as string).match(pattern);
                return match ? parseInt(match[1]) : 0;
            }) || [];
            const nextNumber = Math.max(0, ...numbers) + 1;
            filename = `${namingBase}-${nextNumber}.${outputExt}`;
            console.log("[Upload] Auto-generated filename:", filename, "from naming base:", namingBase);
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const publicUrl = toPublicUrl(filename);

        let width: number | undefined;
        let height: number | undefined;
        let urlLarge: string | undefined;
        let urlMedium: string | undefined;
        let urlThumb: string | undefined;

        if (isConvertible) {
            // Auto-rotate based on EXIF orientation, then resize (capped at 1940px) + convert to webp
            const COPYRIGHT = 'Elite CareFinders';
            const EXIF = { exif: { IFD0: { Copyright: COPYRIGHT } } };
            const { data: origBuf, info: origInfo } = await sharp(buffer)
                .rotate()
                .resize(1940, 1940, { fit: "inside" })
                .webp({ quality: 90 })
                .withMetadata(EXIF)
                .toBuffer({ resolveWithObject: true });

            width = origInfo.width;
            height = origInfo.height;
            console.log(`[Upload] Stored: ${width}x${height}`);
            await r2Upload(filename, origBuf, "image/webp");

            const stem = filename.replace(/\.[^.]+$/, '');
            const largeFilename  = `${stem}-500x500.webp`;
            const mediumFilename = `${stem}-200x200.webp`;
            const thumbFilename  = `${stem}-100x100.webp`;

            const [largeBuf, mediumBuf, thumbBuf] = await Promise.all([
                sharp(buffer).rotate().resize(500, 500,  { fit: "cover", position: "centre" }).webp({ quality: 85 }).withMetadata(EXIF).toBuffer(),
                sharp(buffer).rotate().resize(200, 200,  { fit: "cover", position: "centre" }).webp({ quality: 85 }).withMetadata(EXIF).toBuffer(),
                sharp(buffer).rotate().resize(100, 100,  { fit: "cover", position: "centre" }).webp({ quality: 85 }).withMetadata(EXIF).toBuffer(),
            ]);

            await Promise.all([
                r2Upload(largeFilename,  largeBuf,  "image/webp"),
                r2Upload(mediumFilename, mediumBuf, "image/webp"),
                r2Upload(thumbFilename,  thumbBuf,  "image/webp"),
            ]);

            urlLarge  = toPublicUrl(largeFilename);
            urlMedium = toPublicUrl(mediumFilename);
            urlThumb  = toPublicUrl(thumbFilename);

            console.log(`[Upload] Variants uploaded: ${largeFilename}, ${mediumFilename}, ${thumbFilename}`);
        } else {
            // PNG, GIF, SVG, and non-images: upload as-is, no conversion or variants
            await r2Upload(filename, buffer, file.type || "application/octet-stream");
        }

        const { data, error } = await supabase
            .from("media_items")
            .insert({
                folder_id: folderId,
                filename,
                original_filename: file.name,
                title: null,
                mime_type: isConvertible ? "image/webp" : file.type,
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
