import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
    const supabase = createClient();

    try {
        // Check for duplicate user_roles
        const { data: dupUserRoles } = await supabase
            .rpc('check_duplicate_user_roles');

        // Since RPC might not exist, let's try direct queries
        // Check user_roles duplicates
        const { data: userRoles, error: urError } = await supabase
            .from('user_roles')
            .select('user_id');

        const userRoleCounts = userRoles?.reduce((acc: any, row: any) => {
            acc[row.user_id] = (acc[row.user_id] || 0) + 1;
            return acc;
        }, {});

        const duplicateUserRoles = Object.entries(userRoleCounts || {})
            .filter(([_, count]) => (count as number) > 1);

        return NextResponse.json({
            duplicateUserRoles: duplicateUserRoles.length > 0 ? duplicateUserRoles : null,
            userRolesError: urError,
            summary: {
                duplicateUserRolesCount: duplicateUserRoles.length
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
