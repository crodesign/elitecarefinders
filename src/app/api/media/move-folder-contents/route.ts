import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    const supabase = createClient();

    // Check authentication
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const body = await request.json();
        const { sourceFolderId, destinationFolderId } = body;

        if (!sourceFolderId || !destinationFolderId) {
            return NextResponse.json({ error: "Source and destination folder IDs are required" }, { status: 400 });
        }

        if (sourceFolderId === destinationFolderId) {
            return NextResponse.json({ success: true, count: 0, message: "Source and destination are the same" });
        }

        // Verify both folders exist
        const { data: sourceFolder, error: sourceError } = await supabase
            .from("media_folders")
            .select("id, name")
            .eq("id", sourceFolderId)
            .single();

        if (sourceError || !sourceFolder) {
            return NextResponse.json({ error: "Source folder not found" }, { status: 404 });
        }

        const { data: destFolder, error: destError } = await supabase
            .from("media_folders")
            .select("id, name")
            .eq("id", destinationFolderId)
            .single();

        if (destError || !destFolder) {
            return NextResponse.json({ error: "Destination folder not found" }, { status: 404 });
        }

        // Fetch all media items in source folder
        const { data: mediaItems, error: itemsError } = await supabase
            .from("media_items")
            .select("id")
            .eq("folder_id", sourceFolderId);

        if (itemsError) {
            return NextResponse.json({ error: "Failed to fetch media items" }, { status: 500 });
        }

        if (!mediaItems || mediaItems.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: "No items to move" });
        }

        // FLAT STORAGE: Just update folder_id in DB — no physical file moves needed
        const itemIds = mediaItems.map(item => item.id);
        const { error: updateError } = await supabase
            .from("media_items")
            .update({
                folder_id: destinationFolderId,
                updated_at: new Date().toISOString()
            })
            .in("id", itemIds);

        if (updateError) {
            return NextResponse.json({ error: `DB update failed: ${updateError.message}` }, { status: 500 });
        }

        console.log(`[Move Folder] Moved ${itemIds.length} items from "${sourceFolder.name}" to "${destFolder.name}" (DB-only)`);

        return NextResponse.json({
            success: true,
            count: itemIds.length,
            total: mediaItems.length,
        });

    } catch (error) {
        console.error("Move folder contents error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
