'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@/lib/supabase';
import { UserRole, UserRoleRecord, LocationAssignment, AuthUser } from '@/types/auth';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (emailOrNickname: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    isSuperAdmin: boolean;
    isSystemAdmin: boolean;
    isRegionalManager: boolean;
    isLocalUser: boolean;
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

            setUser({
                id: authUser.id,
                email: authUser.email,
                role: roleData || undefined,
                profile: profileData || undefined,
                locationAssignments: locationData || undefined,
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

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { error };
        }

        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    // Permission helpers
    const isSuperAdmin = user?.role?.role === 'super_admin';
    const isSystemAdmin = user?.role?.role === 'system_admin' || isSuperAdmin;
    const isRegionalManager = user?.role?.role === 'regional_manager' || isSystemAdmin;
    const isLocalUser = user?.role?.role === 'local_user';
    const isAdmin = isSuperAdmin || isSystemAdmin;
    const canAccessSettings = isAdmin;
    const canManageUsers = isAdmin || isRegionalManager;

    const canCreateRole = (targetRole: UserRole): boolean => {
        if (isSuperAdmin) return true;
        if (isSystemAdmin) return targetRole !== 'super_admin';
        if (isRegionalManager) return targetRole === 'local_user';
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
                isLocalUser,
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
