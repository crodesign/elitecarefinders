'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
    requireSuperAdmin?: boolean;
}

export function ProtectedRoute({
    children,
    requireAdmin = false,
    requireSuperAdmin = false
}: ProtectedRouteProps) {
    const { user, loading, isAdmin, isSuperAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            // Not logged in
            if (!user) {
                router.push('/login');
                return;
            }

            // Require super admin but user is not
            if (requireSuperAdmin && !isSuperAdmin) {
                router.push('/admin'); // Redirect to general admin
                return;
            }

            // Require any admin but user is not
            if (requireAdmin && !isAdmin) {
                router.push('/'); // Redirect to home
                return;
            }
        }
    }, [user, loading, isAdmin, isSuperAdmin, requireAdmin, requireSuperAdmin, router]);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-content-secondary">Loading...</div>
            </div>
        );
    }

    // Show nothing while redirecting
    if (!user) {
        return null;
    }

    if (requireSuperAdmin && !isSuperAdmin) {
        return null;
    }

    if (requireAdmin && !isAdmin) {
        return null;
    }

    return <>{children}</>;
}
