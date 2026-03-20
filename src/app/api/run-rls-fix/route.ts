import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
    const supabase = createClient();

    try {
        const { data, error: dropError } = await supabase.rpc('exec_sql', {
            sql_query: 'DROP POLICY IF EXISTS "Users can update accessible homes" ON homes'
        });

        if (dropError) {
            // RPC might not exist, let's try direct SQL execution
            console.error("RPC failed, attempting policy drop via raw query:", dropError);
        }

        // Since RPC likely doesn't exist and we can't execute raw SQL via supabase-js easily,
        // let's return the SQL for manual execution
        const fixSQL = `
-- Fix the ambiguous subquery in the homes UPDATE policy

DROP POLICY IF EXISTS "Users can update accessible homes" ON homes;

CREATE POLICY "Users can update accessible homes" ON homes
    FOR UPDATE
    TO authenticated
    USING (
        can_access_content(created_by)
        AND
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'location_manager')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    )
    WITH CHECK (
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'location_manager')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    );

DROP POLICY IF EXISTS "Users can update accessible facilities" ON facilities;

CREATE POLICY "Users can update accessible facilities" ON facilities
    FOR UPDATE
    TO authenticated
    USING (
        can_access_content(created_by)
        AND
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'location_manager')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    )
    WITH CHECK (
        (
            get_user_role(auth.uid()) IN ('super_admin', 'system_admin')
            OR
            (
                get_user_role(auth.uid()) IN ('regional_manager', 'location_manager')
                AND can_edit_by_location(auth.uid(), taxonomy_entry_ids)
            )
        )
    );
`;

        return NextResponse.json({
            success: false,
            message: "Cannot execute SQL directly via API. Please copy and execute this SQL in your Supabase SQL Editor.",
            sql: fixSQL,
            instructions: [
                "1. Open your Supabase project dashboard",
                "2. Navigate to SQL Editor",
                "3. Create a new query",
                "4. Copy the SQL from the 'sql' field above",
                "5. Execute it",
                "6. Retry your home update"
            ]
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
