
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
    const supabase = createClient();
    try {
        // Query to find triggers specifically on media_folders
        const { data: triggers, error } = await supabase
            .from('information_schema.triggers')
            .select('trigger_name, event_manipulation, event_object_table, action_statement')
            .in('event_object_table', ['homes', 'media_folders']);

        // Note: Direct access to information_schema via client might be blocked by Supabase config.
        // If this fails, we'll try to deduce from behavior.

        return NextResponse.json({
            triggers,
            error
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
