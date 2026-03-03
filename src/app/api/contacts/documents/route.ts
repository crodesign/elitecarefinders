import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient();
        const { searchParams } = new URL(request.url);
        const contactId = searchParams.get("contactId");

        if (!contactId) {
            return NextResponse.json({ error: "Contact ID required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("contact_documents")
            .select("*")
            .eq("contact_id", contactId)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const documents = (data || []).map((d) => ({
            id: d.id,
            contactId: d.contact_id,
            filename: d.filename,
            originalFilename: d.original_filename,
            title: d.title ?? (d.filename as string).replace(/\.[^/.]+$/, ""),
            mimeType: d.mime_type,
            fileSize: d.file_size,
            url: d.url,
            urlThumb: d.url_thumb,
            createdAt: d.created_at,
        }));

        return NextResponse.json({ documents });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Fetch failed" },
            { status: 500 }
        );
    }
}
