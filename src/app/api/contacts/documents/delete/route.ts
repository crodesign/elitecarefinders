import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createClient } from "@/lib/supabase-server";

const NOTES_DIR = path.join(process.cwd(), "public", "images", "media", "notes");

export async function DELETE(request: NextRequest) {
    try {
        const supabase = createClient();
        const body = await request.json();
        const { documentId } = body;

        if (!documentId) {
            return NextResponse.json({ error: "Document ID required" }, { status: 400 });
        }

        const { data: doc, error: fetchError } = await supabase
            .from("contact_documents")
            .select("*")
            .eq("id", documentId)
            .single();

        if (fetchError || !doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const filename = doc.filename as string;
        const filePath = path.join(NOTES_DIR, filename);

        if (existsSync(filePath)) {
            await unlink(filePath).catch(() => {});
        }

        // Delete thumbnail if present
        const stem = path.basename(filename, path.extname(filename));
        const thumbPath = path.join(NOTES_DIR, `${stem}-thumb.webp`);
        if (existsSync(thumbPath)) {
            await unlink(thumbPath).catch(() => {});
        }

        const { error: deleteError } = await supabase
            .from("contact_documents")
            .delete()
            .eq("id", documentId);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, filename });
    } catch (error) {
        console.error("[ContactDocs] Delete error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Delete failed" },
            { status: 500 }
        );
    }
}
