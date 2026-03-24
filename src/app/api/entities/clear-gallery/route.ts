import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const { entityType, entityId } = await request.json();

        if (!entityType || !entityId) {
            return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
        }

        if (entityType === "home") {
            const { error } = await supabase
                .from("homes")
                .update({ images: [], team_images: [], cuisine_images: [] })
                .eq("id", entityId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        } else if (entityType === "facility") {
            const { error } = await supabase
                .from("facilities")
                .update({ images: [], team_images: [], cuisine_images: [] })
                .eq("id", entityId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        } else if (entityType === "post") {
            const { error } = await supabase
                .from("posts")
                .update({ images: [] })
                .eq("id", entityId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        } else {
            return NextResponse.json({ error: "Unknown entityType" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to clear gallery" },
            { status: 500 }
        );
    }
}
