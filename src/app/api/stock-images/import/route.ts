import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { r2Upload, toPublicUrl } from "@/lib/r2";

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

        const { imageUrl, folderId, namePrefix, downloadLocation } = await request.json();

        if (!imageUrl || !folderId) {
            return NextResponse.json({ error: "imageUrl and folderId are required" }, { status: 400 });
        }

        // Trigger Unsplash download event for attribution (required by API terms)
        const accessKey = process.env.UNSPLASH_ACCESS_KEY;
        if (accessKey && downloadLocation) {
            fetch(`${downloadLocation}?client_id=${accessKey}`).catch(() => {});
        }

        // Fetch the image
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
            return NextResponse.json({ error: "Failed to fetch image" }, { status: 400 });
        }
        const buffer = Buffer.from(await imageRes.arrayBuffer());

        // Get folder info for naming
        const { data: folderData } = await supabase
            .from("media_folders")
            .select("slug")
            .eq("id", folderId)
            .single();

        const namingBase = namePrefix || folderData?.slug || "stock";

        // Find next available number
        const { data: existingFiles } = await supabase
            .from("media_items")
            .select("filename")
            .eq("folder_id", folderId);

        const pattern = new RegExp(`^${namingBase}-(\\d+)`, "i");
        const numbers = (existingFiles || []).map((f) => {
            const match = (f.filename as string).match(pattern);
            return match ? parseInt(match[1]) : 0;
        });
        const nextNumber = Math.max(0, ...numbers) + 1;
        const filename = `${namingBase}-${nextNumber}.webp`;

        // Process image with sharp
        const { data: origBuf, info: origInfo } = await sharp(buffer)
            .resize(1940, 1940, { fit: "inside" })
            .webp({ quality: 90 })
            .toBuffer({ resolveWithObject: true });

        await r2Upload(filename, origBuf, "image/webp");

        const stem = filename.replace(/\.[^.]+$/, "");
        const largeFilename = `${stem}-500x500.webp`;
        const mediumFilename = `${stem}-200x200.webp`;
        const thumbFilename = `${stem}-100x100.webp`;

        const [largeBuf, mediumBuf, thumbBuf] = await Promise.all([
            sharp(buffer).resize(500, 500, { fit: "cover", position: "centre" }).webp({ quality: 85 }).toBuffer(),
            sharp(buffer).resize(200, 200, { fit: "cover", position: "centre" }).webp({ quality: 85 }).toBuffer(),
            sharp(buffer).resize(100, 100, { fit: "cover", position: "centre" }).webp({ quality: 85 }).toBuffer(),
        ]);

        await Promise.all([
            r2Upload(largeFilename, largeBuf, "image/webp"),
            r2Upload(mediumFilename, mediumBuf, "image/webp"),
            r2Upload(thumbFilename, thumbBuf, "image/webp"),
        ]);

        const publicUrl = toPublicUrl(filename);
        const urlLarge = toPublicUrl(largeFilename);
        const urlMedium = toPublicUrl(mediumFilename);
        const urlThumb = toPublicUrl(thumbFilename);

        const { data, error } = await supabase
            .from("media_items")
            .insert({
                folder_id: folderId,
                filename,
                original_filename: filename,
                title: filename.replace(/\.[^/.]+$/, ""),
                mime_type: "image/webp",
                file_size: origBuf.length,
                width: origInfo.width,
                height: origInfo.height,
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
                url: data.url,
                urlLarge: data.url_large,
                urlMedium: data.url_medium,
                urlThumb: data.url_thumb,
                width: data.width,
                height: data.height,
            },
        });
    } catch (error) {
        console.error("Stock image import error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Import failed" },
            { status: 500 }
        );
    }
}
