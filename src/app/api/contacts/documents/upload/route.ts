import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase-server";
import { r2Upload, toPublicUrl } from "@/lib/r2";
import { format } from "date-fns";

const NOTES_PREFIX = "notes/";
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const contactId = formData.get("contactId") as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        if (!contactId) {
            return NextResponse.json({ error: "Contact ID required" }, { status: 400 });
        }

        const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
        const isPdf = file.type === "application/pdf";

        if (!isImage && !isPdf) {
            return NextResponse.json({ error: "Only images (jpg, png, gif, webp) and PDF files are accepted" }, { status: 400 });
        }

        // Fetch contact to build slug for filename
        const { data: contact } = await supabase
            .from("contacts")
            .select("first_name, last_name, slug")
            .eq("id", contactId)
            .single();

        const contactSlug = contact?.slug ||
            `${(contact?.first_name || "contact").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${(contact?.last_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(/-+$/, "");

        const dateStr = format(new Date(), "yyyyMMdd");
        const outputExt = isImage ? "webp" : "pdf";

        // Find next available number for this contact+date
        const { data: existingDocs } = await supabase
            .from("contact_documents")
            .select("filename")
            .eq("contact_id", contactId);

        const pattern = new RegExp(`^${contactSlug}-notes-${dateStr}-(\\d+)`, "i");
        const numbers = (existingDocs || []).map((d) => {
            const match = (d.filename as string).match(pattern);
            return match ? parseInt(match[1]) : 0;
        });
        const nextNumber = Math.max(0, ...numbers) + 1;

        const filename = `${contactSlug}-notes-${dateStr}-${nextNumber}.${outputExt}`;
        const r2Key = `${NOTES_PREFIX}${filename}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let urlThumb: string | undefined;

        if (isImage) {
            const img = sharp(buffer);
            const meta = await img.metadata();

            const needsResize = (meta.width ?? 0) > 1940 || (meta.height ?? 0) > 1940;
            const base = needsResize
                ? img.resize(1940, 1940, { fit: "inside", withoutEnlargement: true })
                : img;

            const [mainBuf, thumbBuf] = await Promise.all([
                base.clone().webp({ quality: 85 }).toBuffer(),
                base.clone().resize(100, null, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
            ]);

            const thumbFilename = `${contactSlug}-notes-${dateStr}-${nextNumber}-thumb.webp`;
            await Promise.all([
                r2Upload(r2Key, mainBuf, "image/webp"),
                r2Upload(`${NOTES_PREFIX}${thumbFilename}`, thumbBuf, "image/webp"),
            ]);
            urlThumb = toPublicUrl(`${NOTES_PREFIX}${thumbFilename}`);
        } else {
            // PDF: store as-is in R2
            await r2Upload(r2Key, buffer, "application/pdf");

            try {
                const { createCanvas } = await import("@napi-rs/canvas");
                const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
                const pdfDoc = await loadingTask.promise;
                const page = await pdfDoc.getPage(1);

                const viewport = page.getViewport({ scale: 1 });
                const scale = 100 / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                const canvas = createCanvas(Math.round(scaledViewport.width), Math.round(scaledViewport.height));
                const ctx = canvas.getContext("2d");

                await page.render({
                    canvasContext: ctx as unknown as CanvasRenderingContext2D,
                    viewport: scaledViewport,
                    canvas: canvas as unknown as HTMLCanvasElement,
                } as any).promise;

                const thumbBuf = await canvas.encode("webp");
                const thumbFilename = `${contactSlug}-notes-${dateStr}-${nextNumber}-thumb.webp`;
                await r2Upload(`${NOTES_PREFIX}${thumbFilename}`, thumbBuf, "image/webp");
                urlThumb = toPublicUrl(`${NOTES_PREFIX}${thumbFilename}`);
            } catch (thumbErr) {
                console.error("[ContactDocs] PDF thumbnail generation failed:", thumbErr);
            }
        }

        const url = toPublicUrl(r2Key);

        const { data, error } = await supabase
            .from("contact_documents")
            .insert({
                contact_id: contactId,
                filename,
                original_filename: file.name,
                title: filename.replace(/\.[^/.]+$/, ""),
                mime_type: file.type,
                file_size: file.size,
                url,
                url_thumb: urlThumb ?? null,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            document: {
                id: data.id,
                contactId: data.contact_id,
                filename: data.filename,
                originalFilename: data.original_filename,
                title: data.title ?? data.original_filename.replace(/\.[^/.]+$/, ""),
                mimeType: data.mime_type,
                fileSize: data.file_size,
                url: data.url,
                urlThumb: data.url_thumb,
                createdAt: data.created_at,
            },
        });
    } catch (error) {
        console.error("[ContactDocs] Upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload failed" },
            { status: 500 }
        );
    }
}
