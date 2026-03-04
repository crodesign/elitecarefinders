'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getUsers, getUserProfile, deleteUser, updateUser, createUser, UserListItem } from '@/lib/services/userService';
import { Users as UsersIcon, Plus, Pencil, Trash2, MapPin, Map, Loader2, Search, User, Shield } from 'lucide-react';
import { HeartLoader } from '@/components/ui/HeartLoader';
import { DataTable, type ColumnDef } from '@/components/admin/DataTable';
import { Pagination } from '@/components/admin/Pagination';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { UserForm, type UserFormData } from '@/components/admin/UserForm';
import { useNotification } from '@/contexts/NotificationContext';
import { usePersistedPageSize } from '@/hooks/usePersistedPageSize';

export default function UsersPage() {
    const { isSystemAdmin, isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedPageSize();

    // Delete state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<UserListItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit/Create state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    useEffect(() => {
        if (!authLoading && !isSystemAdmin && !isSuperAdmin) {
            router.push('/admin');
            return;
        }

        if (!authLoading) {
            fetchUsers();
        }
    }, [authLoading, isSystemAdmin, isSuperAdmin]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await getUsers();

        if (fetchError) {
            setError('Failed to load users');
            console.error('Error fetching users:', fetchError);
        } else {
            setUsers(data || []);
            setFilteredUsers(data || []);
        }

        setIsLoading(false);
    }, []);

    // Search Filtering
    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = users.filter(user => {
            return (
                user.email.toLowerCase().includes(query) ||
                user.profile?.full_name.toLowerCase().includes(query) ||
                user.role.role.toLowerCase().includes(query)
            );
        });
        setFilteredUsers(filtered);
        setCurrentPage(1);
    }, [searchQuery, users]);

    const handleEdit = async (user: UserListItem) => {
        setIsLoadingUser(true);
        setIsFormOpen(true);

        const { data, error: fetchError } = await getUserProfile(user.id);

        if (fetchError || !data) {
            console.error('Error fetching user:', fetchError);
            setIsFormOpen(false);
        } else {
            setEditingUser(data);
        }

        setIsLoadingUser(false);
    };

    const handleCreate = () => {
        setEditingUser(null);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingUser(null);
    };

    const handleSave = async (formData: UserFormData) => {
        if (editingUser) {
            // Update existing user
            const { error: updateError } = await updateUser(editingUser.id, {
                role: formData.role,
                profile: formData.profile,
                location_ids: formData.locationIds,
                entity_assignments: formData.entityAssignments,
                manager_id: formData.manager_id
            });

            if (updateError) {
                throw new Error(updateError);
            }

            showNotification('User Updated', formData.profile.full_name);
        } else {
            // Create new user
            const { error: createError } = await createUser({
                email: formData.email,
                password: formData.password!,
                role: formData.role,
                profile: formData.profile,
                location_ids: formData.locationIds,
                entity_assignments: formData.entityAssignments,
                manager_id: formData.manager_id
            });

            if (createError) {
                throw new Error(createError);
            }

            showNotification('User Created', formData.profile.full_name);
        }

        await fetchUsers();
        handleCloseForm();
    };

    const handleDelete = (user: UserListItem) => {
        setItemToDelete(user);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            await deleteUser(itemToDelete.id);
            await fetchUsers();
        } catch (err) {
            alert('Failed to delete user');
            console.error('Error deleting user:', err);
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'local_user':
                return User;
            case 'location_manager':
                return Map;
            case 'regional_manager':
                return UsersIcon;
            case 'system_admin':
            case 'super_admin':
            default:
                return Shield;
        }
    };

    const getRoleBadge = (role: string) => {
        const badges = {
            super_admin: { bg: 'bg-red-500', label: 'Super Admin' },
            system_admin: { bg: 'bg-orange-500', label: 'System Admin' },
            regional_manager: { bg: 'bg-purple-500', label: 'Regional Manager' },
            location_manager: { bg: 'bg-blue-500', label: 'Location Manager' },
            local_user: { bg: 'bg-green-500', label: 'Local User' },
        };

        const badge = badges[role as keyof typeof badges] || badges.local_user;
        const RoleIcon = getRoleIcon(role);

        return (
            <span className={`inline-flex items-center gap-1.5 ${badge.bg} rounded-full px-2.5 py-1 text-xs font-medium text-white`}>
                <RoleIcon className="h-3.5 w-3.5" />
                {badge.label}
            </span>
        );
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const columns: ColumnDef<UserListItem>[] = [
        {
            key: 'name',
            header: 'User',
            render: (user) => (
                <button
                    type="button"
                    onClick={() => handleEdit(user)}
                    className="flex items-center text-left hover:opacity-80 transition-opacity"
                >
                    <UsersIcon className="mr-2 h-5 w-5 hidden md:block text-accent" />
                    <div>
                        <div className="font-medium text-content-primary hover:text-accent transition-colors">
                            {user.profile?.full_name || 'No name'}
                        </div>
                        <div className="text-xs text-content-muted hidden md:block">{user.email}</div>
                    </div>
                </button>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            render: (user) => getRoleBadge(user.role.role),
        },
        {
            key: 'locations',
            header: 'Locations',
            render: (user) => (
                <div className="flex items-center text-sm text-content-muted">
                    {user.location_count > 0 ? (
                        <>
                            <MapPin className="mr-1 h-3.5 w-3.5 hidden md:block" />
                            <span>
                                {user.location_count} {user.location_count === 1 ? 'location' : 'locations'}
                            </span>
                        </>
                    ) : (
                        <span className="italic opacity-50">None</span>
                    )}
                </div>
            ),
        },
    ];

    const renderActions = (user: UserListItem) => (
        <>
            <button
                className="btn-ghost"
                onClick={() => handleEdit(user)}
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                className="btn-danger"
                onClick={() => handleDelete(user)}
                disabled={isDeleting && itemToDelete?.id === user.id}
            >
                {isDeleting && itemToDelete?.id === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="h-4 w-4" />
                )}
            </button>
        </>
    );

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <HeartLoader />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Fixed Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">Users</h1>
                        <p className="text-xs md:text-sm text-content-muted mt-1">Manage users, roles, and permissions</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2"
                    >
                        <Plus className="h-5 w-5 md:hidden" />
                        <span className="hidden md:flex md:items-center md:gap-2">
                            <Plus className="h-5 w-5" />
                            Add User
                        </span>
                    </button>
                </div>

                <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="search-field pl-8"
                    />
                </div>
            </div>

            {/* Scrollable Table Section */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-surface-card rounded-xl h-full flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <DataTable
                            columns={columns}
                            data={paginatedUsers}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="name"
                            emptyMessage={searchQuery ? "No users match your search." : "No users yet."}
                        />
                    </div>

                    {/* Pagination */}
                    {filteredUsers.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredUsers.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    )}
                </div>
            </div>

            {/* User Form Slide Panel */}
            <UserForm
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                user={editingUser}
            />

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete User"
                message={
                    <span>
                        Are you sure you want to delete <strong>{itemToDelete?.profile?.full_name || itemToDelete?.email}</strong>?
                        <br />
                        This action cannot be undone.
                    </span>
                }
                confirmLabel="Delete User"
                isDangerous={true}
                isLoading={isDeleting}
            />
        </div>
    );
}
