'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@/lib/supabase';
import { UserRole, UserRoleRecord, LocationAssignment, EntityAssignment, AuthUser } from '@/types/auth';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (emailOrNickname: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    isSuperAdmin: boolean;
    isSystemAdmin: boolean;
    isRegionalManager: boolean;
    isLocationManager: boolean;
    isLocalUser: boolean;
    isInvoiceManager: boolean;
    isAdmin: boolean;
    canAccessSettings: boolean;
    canManageUsers: boolean;
    canCreateRole: (targetRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    const loadUserData = async (authUser: User | null) => {
        if (!authUser) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            // Fetch role
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', authUser.id)
                .single();

            // Fetch profile
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', authUser.id)
                .single();

            // Fetch location assignments
            const { data: locationData } = await supabase
                .from('user_location_assignments')
                .select('*')
                .eq('user_id', authUser.id);

            // Fetch entity assignments (for local_user role) — may not exist yet if migration pending
            let entityData: EntityAssignment[] | null = null;
            try {
                const { data } = await supabase
                    .from('user_entity_assignments')
                    .select('*')
                    .eq('user_id', authUser.id);
                entityData = data as EntityAssignment[] | null;
            } catch {
                // Table may not exist yet
            }

            setUser({
                id: authUser.id,
                email: authUser.email,
                role: roleData || undefined,
                profile: profileData || undefined,
                locationAssignments: locationData || undefined,
                entityAssignments: entityData || undefined,
            });
        } catch (error) {
            console.error('Error loading user data:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            loadUserData(session?.user ?? null);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            loadUserData(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (emailOrNickname: string, password: string) => {
        let email = emailOrNickname;

        // Check if input is a nickname (doesn't contain @)
        if (!emailOrNickname.includes('@')) {
            // Call API to get email from nickname
            try {
                const response = await fetch('/api/auth/nickname-to-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nickname: emailOrNickname.toLowerCase() })
                });

                if (!response.ok) {
                    return { error: new Error('Invalid nickname or password') };
                }

                const { email: foundEmail } = await response.json();
                email = foundEmail;
            } catch (err) {
                return { error: new Error('Invalid nickname or password') };
            }
        }

        console.log('[AuthContext] Attempting server-side login for:', email);

        try {
            // Use server-side API route to avoid CORS issues
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('[AuthContext] Response was not JSON. Raw Text:', text.slice(0, 500));
                return {
                    error: {
                        message: 'Server returned unexpected response (not JSON)',
                        status: response.status,
                        name: 'AuthFormatError'
                    } as any
                };
            }

            if (!response.ok) {
                console.error('[AuthContext] Server-side login failed:', data.error);
                return {
                    error: {
                        message: data.error || 'Login failed',
                        name: 'AuthMessage',
                        status: response.status
                    } as any
                };
            }

            console.log('[AuthContext] Server-side login successful');

            // Refresh the session client-side to pick up the cookies set by the server
            const { error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.warn('[AuthContext] Session refresh warning:', sessionError);
            }

            // Force a router refresh to update server components if needed
            // Window reload might be safer to ensure all cookies are picked up cleanly
            return { error: null };
        } catch (unexpectedErr: any) {
            console.error('[AuthContext] Unexpected exception during login:', unexpectedErr);
            return { error: new Error(unexpectedErr.message || 'Unexpected error during sign in') };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    // Permission helpers
    const isSuperAdmin = user?.role?.role === 'super_admin';
    const isSystemAdmin = user?.role?.role === 'system_admin' || isSuperAdmin;
    const isRegionalManager = user?.role?.role === 'regional_manager' || isSystemAdmin;
    const isLocationManager = user?.role?.role === 'location_manager';
    const isLocalUser = user?.role?.role === 'local_user';
    const isInvoiceManager = user?.role?.role === 'invoice_manager';
    const isAdmin = isSuperAdmin || isSystemAdmin;
    const canAccessSettings = isAdmin;
    const canManageUsers = isAdmin || isRegionalManager || isLocationManager;

    const canCreateRole = (targetRole: UserRole): boolean => {
        if (isSuperAdmin) return true;
        if (isSystemAdmin) return targetRole !== 'super_admin';
        if (isRegionalManager) return targetRole === 'local_user' || targetRole === 'location_manager';
        if (isLocationManager) return targetRole === 'local_user';
        return false;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                signIn,
                signOut,
                isSuperAdmin,
                isSystemAdmin,
                isRegionalManager,
                isLocationManager,
                isLocalUser,
                isInvoiceManager,
                isAdmin,
                canAccessSettings,
                canManageUsers,
                canCreateRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
