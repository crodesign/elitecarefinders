import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerComponentClient();

        // Check if user is authenticated and has admin privileges
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check user role
        const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', authUser.id)
            .single();

        if (!roleData || (roleData.role !== 'super_admin' && roleData.role !== 'system_admin')) {
            return NextResponse.json(
                { message: 'Forbidden: Insufficient permissions' },
                { status: 403 }
            );
        }

        // Get email from request
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { message: 'Email is required' },
                { status: 400 }
            );
        }

        // Use Supabase Admin API to send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
        });

        if (error) {
            console.error('Error sending password reset email:', error);
            return NextResponse.json(
                { message: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { message: 'Password reset email sent successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error in reset-user-password API:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
