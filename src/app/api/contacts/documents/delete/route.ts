import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { r2Delete } from "@/lib/r2";

const NOTES_PREFIX = "notes/";

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
        const stem = filename.replace(/\.[^/.]+$/, "");

        await Promise.all([
            r2Delete(`${NOTES_PREFIX}${filename}`).catch(() => {}),
            r2Delete(`${NOTES_PREFIX}${stem}-thumb.webp`).catch(() => {}),
        ]);

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
