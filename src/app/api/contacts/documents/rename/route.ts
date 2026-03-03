import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(request: NextRequest) {
    try {
        const supabase = createClient();
        const body = await request.json();
        const { documentId, title } = body;

        if (!documentId) {
            return NextResponse.json({ error: "Document ID required" }, { status: 400 });
        }
        if (!title?.trim()) {
            return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("contact_documents")
            .update({ title: title.trim() })
            .eq("id", documentId)
            .select("id, title")
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data.id, title: data.title });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Rename failed" },
            { status: 500 }
        );
    }
}
