import { UserRole, UserRoleRecord, UserProfile, LocationAssignment } from '@/types/auth';

export interface CreateUserData {
    email: string;
    password: string;
    role: UserRole;
    profile: {
        full_name: string;
        phone?: string;
        photo_url?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            zip: string;
        };
    };
    location_ids?: string[];
    entity_assignments?: { entity_id: string; entity_type: 'home' | 'facility' }[];
    manager_id?: string;
}

export interface UpdateUserData {
    profile?: Partial<UserProfile>;
    role?: UserRole;
    location_ids?: string[];
    entity_assignments?: { entity_id: string; entity_type: 'home' | 'facility' }[];
    manager_id?: string;
}

export interface UserListItem {
    id: string;
    email: string;
    role: UserRoleRecord;
    profile: UserProfile | null;
    location_count: number;
    entity_assignments?: { id: string; entity_id: string; entity_type: 'home' | 'facility' }[];
    entity_count?: number;
    manager_id?: string;
    manager_name?: string;
}

/**
 * Get all users (filtered by current user's permissions)
 */
export async function getUsers(): Promise<{ data: UserListItem[] | null; error: any }> {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
            const errorData = await response.json();
            // Return the full error object as a string for debugging
            throw new Error(JSON.stringify(errorData));
        }
        const data = await response.json();
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

/**
 * Get a single user's profile and details
 */
export async function getUserProfile(userId: string): Promise<{ data: any | null; error: any }> {
    try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch user');
        }
        const data = await response.json();
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

/**
 * Create a new user
 */
export async function createUser(userData: CreateUserData): Promise<{ data: any; error: any }> {
    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }

        const data = await response.json();
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

/**
 * Update user data
 */
export async function updateUser(userId: string, updates: UpdateUserData): Promise<{ data: any; error: any }> {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update user');
        }

        const data = await response.json();
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<{ data: any; error: any }> {
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete user');
        }

        const data = await response.json();
        return { data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

/**
 * Assign locations to a user (Wrapper for updateUser)
 */
export async function assignLocations(userId: string, locationIds: string[]): Promise<{ data: any; error: any }> {
    return updateUser(userId, { location_ids: locationIds });
}

/**
 * Assign entities (homes/facilities) to a user (Wrapper for updateUser)
 */
export async function assignEntities(userId: string, assignments: { entity_id: string; entity_type: 'home' | 'facility' }[]): Promise<{ data: any; error: any }> {
    return updateUser(userId, { entity_assignments: assignments });
}

