'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getUsers, getUserProfile, deleteUser, updateUser, createUser, UserListItem } from '@/lib/services/userService';
import { Users as UsersIcon, Plus, Pencil, Trash2, MapPin, Map as MapIcon, Loader2, Search, User, Shield } from 'lucide-react';
import Image from 'next/image';
import { HeartLoader } from '@/components/ui/HeartLoader';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { UserForm, type UserFormData } from '@/components/admin/UserForm';
import { useNotification } from '@/contexts/NotificationContext';

export default function UsersPage() {
    const { canManageUsers, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();
    const [users, setUsers] = useState<UserListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Delete state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<UserListItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Edit/Create state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    useEffect(() => {
        if (!authLoading && !canManageUsers) {
            router.push('/admin');
            return;
        }

        if (!authLoading) {
            fetchUsers();
        }
    }, [authLoading, canManageUsers]);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await getUsers();

        if (fetchError) {
            setError('Failed to load users');
            console.error('Error fetching users:', fetchError);
        } else {
            setUsers(data || []);
        }

        setIsLoading(false);
    }, []);


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
                ...(formData.password && { password: formData.password }),
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
                return MapIcon;
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

    const ADMIN_ROLES = new Set(['super_admin', 'system_admin', 'invoice_manager']);

    // Build flat hierarchical list; level is based on visible ancestors only
    const buildFlatList = (): { user: UserListItem; level: number }[] => {
        const query = searchQuery.toLowerCase();
        const matches = (u: UserListItem) =>
            !query ||
            (u.profile?.full_name || '').toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query);

        const result: { user: UserListItem; level: number }[] = [];
        const placed = new Set<string>();
        const placedLevel = new Map<string, number>(); // tracks the level each placed user was given

        const place = (user: UserListItem, level: number) => {
            if (placed.has(user.id)) return;
            placed.add(user.id);
            placedLevel.set(user.id, level);
            result.push({ user, level });
        };

        const byRole = (role: string) => users.filter(u => u.role.role === role);
        const localUsers = byRole('local_user');
        const locationManagers = byRole('location_manager');
        const regionalManagers = byRole('regional_manager');

        // Place an LM and its LUs; level derived from parent RM if visible, else 1
        const addLMGroup = (lm: UserListItem) => {
            if (placed.has(lm.id)) return;
            const children = localUsers.filter(lu => lu.profile?.manager_id === lm.id);
            const lmMatches = matches(lm);
            const matchingChildren = query ? children.filter(matches) : children;
            if (!lmMatches && matchingChildren.length === 0) return;
            const parentLevel = lm.profile?.manager_id ? (placedLevel.get(lm.profile.manager_id) ?? undefined) : undefined;
            const lmLevel = parentLevel !== undefined ? parentLevel + 1 : 1;
            place(lm, lmLevel);
            (lmMatches || !query ? children : matchingChildren).forEach(lu => {
                place(lu, lmLevel + 1);
            });
        };

        // 1. Admins (super, system, invoice)
        users.filter(u => ADMIN_ROLES.has(u.role.role) && matches(u))
            .forEach(u => place(u, 0));

        // 2. Regional Managers → each followed by their LM+LU subtree
        regionalManagers.forEach(rm => {
            const childLMs = locationManagers.filter(lm => lm.profile?.manager_id === rm.id);
            const rmMatches = matches(rm);
            const hasMatchingDescendants = childLMs.some(lm => {
                if (matches(lm)) return true;
                return localUsers.filter(lu => lu.profile?.manager_id === lm.id).some(matches);
            });
            if (!rmMatches && !hasMatchingDescendants) return;
            place(rm, 1);
            childLMs.forEach(lm => addLMGroup(lm));
        });

        // 3. Remaining RMs not yet placed
        regionalManagers.filter(rm => !placed.has(rm.id) && matches(rm))
            .forEach(rm => place(rm, 1));

        // 4. Remaining LMs (no visible RM parent → level 1)
        locationManagers.filter(lm => !placed.has(lm.id)).forEach(lm => addLMGroup(lm));

        // 5. Remaining LUs (no visible LM parent → level 1)
        localUsers.filter(lu => !placed.has(lu.id) && matches(lu))
            .forEach(lu => place(lu, 1));

        // 6. Everyone else (public users / unrecognized roles)
        users.filter(u => !ADMIN_ROLES.has(u.role.role) && u.role.role !== 'regional_manager' && u.role.role !== 'location_manager' && u.role.role !== 'local_user' && !placed.has(u.id) && matches(u))
            .forEach(u => place(u, 0));

        console.log('[Users tree]', result.map(r => `${' '.repeat(r.level * 2)}${r.user.role.role}: ${r.user.profile?.full_name || r.user.email}`));
        return result;
    };

    const renderActions = (user: UserListItem) => (
        <>
            <button className="btn-ghost" onClick={() => handleEdit(user)}>
                <Pencil className="h-4 w-4" />
            </button>
            <button
                className="btn-danger"
                onClick={() => handleDelete(user)}
                disabled={isDeleting && itemToDelete?.id === user.id}
            >
                {isDeleting && itemToDelete?.id === user.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
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
                        <h1 className="text-xl md:text-2xl font-bold text-content-primary">Users</h1>
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
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-field pl-8"
                    />
                </div>
            </div>

            {/* Scrollable Table Section */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-surface-card rounded-xl h-full flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-auto">
                        {(() => {
                            const flatList = buildFlatList();
                            if (flatList.length === 0) {
                                return (
                                    <div className="px-6 py-12 text-center text-content-muted">
                                        {searchQuery ? 'No users match your search.' : 'No users yet.'}
                                    </div>
                                );
                            }
                            const levelBg = ['', 'bg-accent/[0.04]', 'bg-accent/[0.08]', 'bg-accent/[0.12]'];
                            return (
                                <table className="w-full table-fixed">
                                    <thead className="table-header sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-left">User</th>
                                            <th className="px-6 py-3 text-left hidden lg:table-cell" style={{ width: '20%' }}>Email</th>
                                            <th className="px-6 py-3 text-left hidden lg:table-cell" style={{ width: '15%' }}>Phone</th>
                                            <th className="px-6 py-3 text-left hidden md:table-cell" style={{ width: '18%' }}>Role</th>
                                            <th className="px-6 py-3 text-left hidden md:table-cell" style={{ width: '13%' }}>Locations</th>
                                            <th className="px-3 py-3 border-l border-ui-border" style={{ width: '92px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {flatList.map(({ user, level }) => (
                                            <tr key={user.id} className={`table-row ${levelBg[level] ?? ''}`}>
                                                <td className="py-[5px]" style={{ paddingLeft: `${level * 36 + 24}px`, paddingRight: '24px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(user)}
                                                        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity w-full min-w-0"
                                                    >
                                                        <div className="hidden md:flex w-9 h-9 rounded-full overflow-hidden bg-accent items-center justify-center shrink-0">
                                                            {user.profile?.photo_url ? (
                                                                <Image src={user.profile.photo_url} alt="" width={36} height={36} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-white text-sm font-medium">
                                                                    {(user.profile?.full_name || user.email || '?')[0].toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-content-primary hover:text-accent transition-colors truncate">
                                                                {user.profile?.full_name || 'No name'}
                                                            </div>
                                                            {user.profile?.nickname && (
                                                                <div className="text-xs text-content-muted truncate">@{user.profile.nickname}</div>
                                                            )}
                                                            <div className="text-xs text-content-muted truncate lg:hidden">{user.email}</div>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="px-6 py-[5px] hidden lg:table-cell">
                                                    <span className="text-sm text-content-muted truncate block">{user.email}</span>
                                                </td>
                                                <td className="px-6 py-[5px] hidden lg:table-cell">
                                                    <span className="text-sm text-content-muted">{user.profile?.phone || <span className="italic opacity-50">—</span>}</span>
                                                </td>
                                                <td className="px-6 py-[5px] hidden md:table-cell">{getRoleBadge(user.role.role)}</td>
                                                <td className="px-6 py-[5px] hidden md:table-cell">
                                                    <div className="flex items-center text-sm text-content-muted">
                                                        {user.location_count > 0 ? (
                                                            <>
                                                                <MapPin className="mr-1 h-3.5 w-3.5" />
                                                                <span>{user.location_count} {user.location_count === 1 ? 'location' : 'locations'}</span>
                                                            </>
                                                        ) : (
                                                            <span className="italic opacity-50">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-[5px] border-l border-ui-border whitespace-nowrap">
                                                    <div className="flex justify-end gap-1">
                                                        {renderActions(user)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>
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
