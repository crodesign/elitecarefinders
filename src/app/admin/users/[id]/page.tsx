'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { UserForm, type UserFormData } from '@/components/admin/UserForm';
import { getUserProfile, updateUser } from '@/lib/services/userService';
import { HeartLoader } from '@/components/ui/HeartLoader';
import { useNotification } from '@/contexts/NotificationContext';

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;
    const { showNotification } = useNotification();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            const { data, error: fetchError } = await getUserProfile(userId);

            if (fetchError || !data) {
                setError('Failed to load user');
                console.error('Error fetching user:', fetchError);
            } else {
                setUser(data);
            }

            setLoading(false);
        };

        fetchUser();
    }, [userId]);

    const handleSave = async (formData: UserFormData) => {
        const { error: updateError } = await updateUser(userId, {
            role: formData.role,
            profile: formData.profile,
            location_ids: formData.locationIds
        });

        if (updateError) {
            throw new Error('Failed to update user');
        }

        showNotification('User Updated', formData.profile.full_name);
        router.push('/admin/users');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <HeartLoader />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error || 'User not found'}</p>
                    <button
                        onClick={() => router.push('/admin/users')}
                        className="text-accent hover:underline"
                    >
                        ← Back to Users
                    </button>
                </div>
            </div>
        );
    }

    return (
        <UserForm
            isOpen={true}
            onClose={() => router.push('/admin/users')}
            onSave={handleSave}
            user={user}
        />
    );
}
