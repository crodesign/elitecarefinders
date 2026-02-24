import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Edit Lock API
 * 
 * POST - Acquire or refresh a lock
 * DELETE - Release a lock
 * GET - Check if entity is locked (and by whom)
 * 
 * Locks auto-expire after 5 minutes. Forms should refresh every 3-4 minutes.
 */

export async function POST(request: NextRequest) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { entityType, entityId } = await request.json();

        if (!entityType || !entityId) {
            return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
        }

        // Clear expired locks first
        await supabase
            .from("edit_locks")
            .delete()
            .lt("expires_at", new Date().toISOString());

        // Check if there's an existing lock by someone else
        const { data: existingLock } = await supabase
            .from("edit_locks")
            .select("id, locked_by, locked_at, expires_at")
            .eq("entity_type", entityType)
            .eq("entity_id", entityId)
            .single();

        if (existingLock && existingLock.locked_by !== session.user.id) {
            // Someone else has the lock — return conflict
            return NextResponse.json({
                locked: true,
                lockedBy: existingLock.locked_by,
                lockedAt: existingLock.locked_at,
                expiresAt: existingLock.expires_at,
                message: "This record is being edited by another user.",
            }, { status: 409 });
        }

        // Acquire or refresh lock (upsert)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from("edit_locks")
            .upsert({
                entity_type: entityType,
                entity_id: entityId,
                locked_by: session.user.id,
                locked_at: new Date().toISOString(),
                expires_at: expiresAt,
            }, {
                onConflict: "entity_type,entity_id",
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ locked: true, lock: data });

    } catch (error) {
        console.error("[Edit Lock] Acquire error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to acquire lock" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { entityType, entityId } = await request.json();

        // Only delete your own lock
        await supabase
            .from("edit_locks")
            .delete()
            .eq("entity_type", entityType)
            .eq("entity_id", entityId)
            .eq("locked_by", session.user.id);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Edit Lock] Release error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to release lock" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const supabase = createClient();

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
        return NextResponse.json({ error: "entityType and entityId required" }, { status: 400 });
    }

    // Clean up expired locks
    await supabase
        .from("edit_locks")
        .delete()
        .lt("expires_at", new Date().toISOString());

    const { data: lock } = await supabase
        .from("edit_locks")
        .select("id, locked_by, locked_at, expires_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .single();

    if (!lock) {
        return NextResponse.json({ locked: false });
    }

    return NextResponse.json({
        locked: true,
        lockedBy: lock.locked_by,
        lockedAt: lock.locked_at,
        expiresAt: lock.expires_at,
    });
}
