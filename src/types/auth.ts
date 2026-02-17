export interface UserRoleRecord {
    user_id: string;
    role: 'super_admin' | 'system_admin' | 'regional_manager' | 'local_user';
    display_name?: string;
    created_at: string;
    updated_at: string;
}

export type UserRole = 'super_admin' | 'system_admin' | 'regional_manager' | 'local_user';

export interface LocationAssignment {
    id: string;
    user_id: string;
    location_id: string;
    created_at: string;
}

export interface UserProfile {
    user_id: string;
    full_name: string;
    nickname?: string;
    photo_url?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    phone?: string;
    created_at?: string;
    updated_at?: string;
    manager_id?: string;
    manager_name?: string; // For display
}

export interface AuthUser {
    id: string;
    email?: string;
    role?: UserRoleRecord;
    locationAssignments?: LocationAssignment[];
    profile?: UserProfile;
}
