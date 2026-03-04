"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SlidePanel } from "./SlidePanel";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ImageCropModal } from "./ImageCropModal";
import { User, Mail, Phone, MapPin, Map, Shield, Info, ChevronDown, Check, Users, RotateCw, Upload, Eye, EyeOff, Globe, X, Search } from 'lucide-react';
import { HeartLoader } from '@/components/ui/HeartLoader';
import { createClientComponentClient } from "@/lib/supabase";
import type { UserProfile, UserRole } from "@/types/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip } from "@/components/ui/tooltip";
import { EnhancedSelect } from "./EnhancedSelect";
import { SimpleSelect } from "./SimpleSelect";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

// Get icon based on role type
const getRoleIcon = (roleValue: UserRole) => {
    switch (roleValue) {
        case 'local_user':
            return User;
        case 'location_manager':
            return Map;
        case 'regional_manager':
            return Users;
        case 'system_admin':
        case 'super_admin':
        default:
            return Shield;
    }
};

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
    { value: 'super_admin', label: 'Super Admin', description: 'Full system access' },
    { value: 'system_admin', label: 'System Admin', description: 'Can manage Regional Managers and Location Managers' },
    { value: 'regional_manager', label: 'Regional Manager', description: 'Can manage Location Managers in their regions' },
    { value: 'location_manager', label: 'Location Manager', description: 'Can manage Local Users in their locations' },
    { value: 'local_user', label: 'Local User', description: 'Assigned to specific homes/facilities' },
];

const ROLE_COLORS: Record<UserRole, string> = {
    super_admin: 'text-red-500',
    system_admin: 'text-orange-500',
    regional_manager: 'text-purple-500',
    location_manager: 'text-blue-500',
    local_user: 'text-green-500',
    invoice_manager: 'text-indigo-500',
};

const US_STATES = [
    { name: 'Alabama', code: 'AL' }, { name: 'Alaska', code: 'AK' }, { name: 'Arizona', code: 'AZ' },
    { name: 'Arkansas', code: 'AR' }, { name: 'California', code: 'CA' }, { name: 'Colorado', code: 'CO' },
    { name: 'Connecticut', code: 'CT' }, { name: 'Delaware', code: 'DE' }, { name: 'District of Columbia', code: 'DC' },
    { name: 'Florida', code: 'FL' }, { name: 'Georgia', code: 'GA' }, { name: 'Hawaii', code: 'HI' },
    { name: 'Idaho', code: 'ID' }, { name: 'Illinois', code: 'IL' }, { name: 'Indiana', code: 'IN' },
    { name: 'Iowa', code: 'IA' }, { name: 'Kansas', code: 'KS' }, { name: 'Kentucky', code: 'KY' },
    { name: 'Louisiana', code: 'LA' }, { name: 'Maine', code: 'ME' }, { name: 'Maryland', code: 'MD' },
    { name: 'Massachusetts', code: 'MA' }, { name: 'Michigan', code: 'MI' }, { name: 'Minnesota', code: 'MN' },
    { name: 'Mississippi', code: 'MS' }, { name: 'Missouri', code: 'MO' }, { name: 'Montana', code: 'MT' },
    { name: 'Nebraska', code: 'NE' }, { name: 'Nevada', code: 'NV' }, { name: 'New Hampshire', code: 'NH' },
    { name: 'New Jersey', code: 'NJ' }, { name: 'New Mexico', code: 'NM' }, { name: 'New York', code: 'NY' },
    { name: 'North Carolina', code: 'NC' }, { name: 'North Dakota', code: 'ND' }, { name: 'Ohio', code: 'OH' },
    { name: 'Oklahoma', code: 'OK' }, { name: 'Oregon', code: 'OR' }, { name: 'Pennsylvania', code: 'PA' },
    { name: 'Rhode Island', code: 'RI' }, { name: 'South Carolina', code: 'SC' }, { name: 'South Dakota', code: 'SD' },
    { name: 'Tennessee', code: 'TN' }, { name: 'Texas', code: 'TX' }, { name: 'Utah', code: 'UT' },
    { name: 'Vermont', code: 'VT' }, { name: 'Virginia', code: 'VA' }, { name: 'Washington', code: 'WA' },
    { name: 'West Virginia', code: 'WV' }, { name: 'Wisconsin', code: 'WI' }, { name: 'Wyoming', code: 'WY' }
];

export interface UserFormData {
    email: string;
    password?: string;
    role: UserRole;
    profile: {
        full_name: string;
        nickname?: string;
        phone?: string;
        address?: {
            street: string;
            city: string;
            state: string;
            zip: string;
        };
    };
    locationIds: string[];
    entityAssignments?: { entity_id: string; entity_type: 'home' | 'facility' }[];
    manager_id?: string;
}

interface ManagerOption {
    id: string;
    name: string;
    managerId?: string;
}

interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: UserFormData) => Promise<void>;
    user?: {
        id: string;
        email: string;
        role: { role: UserRole };
        profile?: UserProfile;
        location_ids?: string[];
        entity_assignments?: { id: string; entity_id: string; entity_type: 'home' | 'facility' }[];
        manager_id?: string;
    } | null;
}

export function UserForm({ isOpen, onClose, onSave, user }: UserFormProps) {
    const { canCreateRole, isSuperAdmin, isSystemAdmin, user: currentUser } = useAuth();
    const { mode } = useTheme();
    const isLight = mode === 'light';
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoUrl, setPhotoUrl] = useState<string>('');
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [showCloseWarning, setShowCloseWarning] = useState(false);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [editPassword, setEditPassword] = useState(''); // For admin editing existing users
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<UserRole>('local_user');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zip, setZip] = useState('');
    const [reportsToType, setReportsToType] = useState<'' | 'regional_manager'>('');
    const [selectedRMId, setSelectedRMId] = useState<string>('');
    const [selectedLMId, setSelectedLMId] = useState<string>('');
    const [managers, setManagers] = useState<ManagerOption[]>([]);
    const [allLocationManagers, setAllLocationManagers] = useState<ManagerOption[]>([]);

    // Location assignment state
    const [locationIds, setLocationIds] = useState<string[]>([]);
    const [taxonomyEntries, setTaxonomyEntries] = useState<{ id: string; name: string; parent_id: string | null; slug: string }[]>([]);
    const [locationSearch, setLocationSearch] = useState('');
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const locationDropdownRef = useRef<HTMLDivElement>(null);

    // Entity assignment state (for local_user role)
    const [entityAssignments, setEntityAssignments] = useState<{ entity_id: string; entity_type: 'home' | 'facility'; name: string }[]>([]);
    const [entitySearch, setEntitySearch] = useState('');
    const [isEntityDropdownOpen, setIsEntityDropdownOpen] = useState(false);
    const [entitySearchResults, setEntitySearchResults] = useState<{ id: string; name: string; type: 'home' | 'facility' }[]>([]);
    const entityDropdownRef = useRef<HTMLDivElement>(null);
    const entitySearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const supabaseClient = createClientComponentClient();

    const [isLoading, setIsLoading] = useState(true);
    const [isFormPopulated, setIsFormPopulated] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                // Parallel fetch for taxonomy and managers
                await Promise.all([
                    (async () => {
                        try {
                            const { data: taxonomyData } = await supabaseClient
                                .from('taxonomies')
                                .select('id')
                                .or('type.eq.location,slug.eq.location')
                                .single();

                            if (taxonomyData) {
                                const { data: entries } = await supabaseClient
                                    .from('taxonomy_entries')
                                    .select('id, name, parent_id, slug')
                                    .eq('taxonomy_id', taxonomyData.id)
                                    .order('name');

                                if (entries) setTaxonomyEntries(entries);
                            }
                        } catch (err) {
                            console.error('Failed to load taxonomy:', err);
                        }
                    })(),
                    (async () => {
                        if (!isSuperAdmin && !isSystemAdmin) return;
                        try {
                            const { data: rmRoles } = await supabaseClient
                                .from('user_roles')
                                .select('user_id, display_name')
                                .eq('role', 'regional_manager');

                            if (rmRoles && rmRoles.length > 0) {
                                const ids = rmRoles.map(r => r.user_id);
                                const { data: profiles } = await supabaseClient
                                    .from('user_profiles')
                                    .select('user_id, full_name')
                                    .in('user_id', ids);

                                const profileMap: Record<string, string> = {};
                                (profiles || []).forEach(p => { if (p.full_name) profileMap[p.user_id] = p.full_name; });

                                setManagers(rmRoles.map(r => ({
                                    id: r.user_id,
                                    name: profileMap[r.user_id] || r.display_name || r.user_id
                                })).sort((a, b) => a.name.localeCompare(b.name)));
                            }
                        } catch (err) {
                            console.error('Failed to fetch managers:', err);
                        }
                    })(),
                    (async () => {
                        if (!isSuperAdmin && !isSystemAdmin) return;
                        try {
                            const { data: lmRoles } = await supabaseClient
                                .from('user_roles')
                                .select('user_id, display_name')
                                .eq('role', 'location_manager');

                            if (lmRoles && lmRoles.length > 0) {
                                const ids = lmRoles.map(r => r.user_id);
                                const { data: profiles } = await supabaseClient
                                    .from('user_profiles')
                                    .select('user_id, full_name, manager_id')
                                    .in('user_id', ids);

                                const profileMap: Record<string, { name: string; managerId?: string }> = {};
                                (profiles || []).forEach(p => { profileMap[p.user_id] = { name: p.full_name, managerId: p.manager_id || undefined }; });

                                setAllLocationManagers(lmRoles.map(r => ({
                                    id: r.user_id,
                                    name: profileMap[r.user_id]?.name || r.display_name || r.user_id,
                                    managerId: profileMap[r.user_id]?.managerId
                                })).sort((a, b) => a.name.localeCompare(b.name)));
                            }
                        } catch (err) {
                            console.error('Failed to fetch location managers:', err);
                        }
                    })()
                ]);
            } catch (err) {
                console.error('Error fetching initial data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen, isSuperAdmin, isSystemAdmin, supabaseClient]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
                setIsLocationDropdownOpen(false);
            }
            if (entityDropdownRef.current && !entityDropdownRef.current.contains(event.target as Node)) {
                setIsEntityDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Determine available locations based on role and current user
    const getAvailableLocations = useCallback(() => {
        const states = taxonomyEntries.filter(e => e.parent_id === null);
        const cities = taxonomyEntries.filter(e => e.parent_id !== null);

        if (role === 'regional_manager') {
            // RMs can only be assigned to states
            return states.map(s => ({ ...s, level: 'state' as const, children: [] }));
        }

        if (role === 'location_manager') {
            if (isSuperAdmin || isSystemAdmin) {
                // Super/System admins can assign any location
                return states.map(s => ({
                    ...s,
                    level: 'state' as const,
                    children: cities.filter(c => c.parent_id === s.id)
                }));
            }

            // Regional managers can only assign to their own states and children
            const rmLocationIds = currentUser?.locationAssignments?.map(la => la.location_id) || [];
            const rmStates = states.filter(s => rmLocationIds.includes(s.id));
            return rmStates.map(s => ({
                ...s,
                level: 'state' as const,
                children: cities.filter(c => c.parent_id === s.id)
            }));
        }

        return [];
    }, [taxonomyEntries, role, isSuperAdmin, isSystemAdmin, currentUser]);

    const showLocationSelector = role === 'regional_manager' || role === 'location_manager';

    const isEditing = !!user;

    // Reset dirty when form opens/closes
    useEffect(() => {
        if (!isOpen) setIsDirty(false);
    }, [isOpen]);

    // Mark dirty whenever any field changes after initial population
    const populatedRef = useRef(false);
    useEffect(() => {
        if (isFormPopulated) {
            if (populatedRef.current) {
                setIsDirty(true);
            } else {
                populatedRef.current = true;
            }
        } else {
            populatedRef.current = false;
        }
    }, [email, password, editPassword, fullName, nickname, phone, role, street, city, state, zip, reportsToType, selectedRMId, selectedLMId, locationIds, entityAssignments, photoUrl, isFormPopulated]);

    // Close guard
    const handleCloseInternal = () => {
        if (isDirty) {
            setShowCloseWarning(true);
        } else {
            onClose();
        }
    };

    const handleDiscardChanges = () => {
        setShowCloseWarning(false);
        setIsDirty(false);
        onClose();
    };

    // Reset or populate form
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setIsFormPopulated(false);
            setIsDirty(false);

            if (user) {
                setEmail(user.email);
                setPassword('');
                setEditPassword(''); // Reset admin edit password
                setFullName(user.profile?.full_name || '');
                setNickname(user.profile?.nickname || '');
                setPhone(user.profile?.phone || '');
                setRole(user.role.role);
                setPhotoUrl(user.profile?.photo_url || '');
                setStreet(user.profile?.address?.street || '');
                setCity(user.profile?.address?.city || '');
                setState(user.profile?.address?.state || '');
                setZip(user.profile?.address?.zip || '');
                setLocationIds(user.location_ids || []);
                // manager_id will be resolved by the separate useEffect below
                setEntityAssignments([]);
                if (user.entity_assignments?.length) {
                    (async () => {
                        const homeIds = user.entity_assignments!.filter(ea => ea.entity_type === 'home').map(ea => ea.entity_id);
                        const facilityIds = user.entity_assignments!.filter(ea => ea.entity_type === 'facility').map(ea => ea.entity_id);
                        const [{ data: homes }, { data: facilities }] = await Promise.all([
                            homeIds.length > 0 ? supabaseClient.from('homes').select('id, title').in('id', homeIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
                            facilityIds.length > 0 ? supabaseClient.from('facilities').select('id, title').in('id', facilityIds) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
                        ]);
                        const nameMap: Record<string, string> = {};
                        (homes || []).forEach((h: { id: string; title: string }) => { nameMap[h.id] = h.title; });
                        (facilities || []).forEach((f: { id: string; title: string }) => { nameMap[f.id] = f.title; });
                        setEntityAssignments(user.entity_assignments!.map(ea => ({
                            entity_id: ea.entity_id,
                            entity_type: ea.entity_type,
                            name: nameMap[ea.entity_id] || ea.entity_id,
                        })));
                    })();
                }
            } else {
                setEmail('');
                setPassword('');
                setEditPassword('');
                setFullName('');
                setNickname('');
                setPhone('');
                setRole('local_user');
                setPhotoUrl('');
                setStreet('');
                setCity('');
                setState('');
                setZip('');
                setLocationIds([]);
                setEntityAssignments([]);
                setEntitySearch('');
                setReportsToType('');
                setSelectedRMId('');
                setSelectedLMId('');
            }

            // Add a small delay to ensure state updates are fully processed and painted
            // This prevents any "flash" of empty fields before the values appear
            const timer = setTimeout(() => {
                setIsFormPopulated(true);
            }, 100);

            return () => clearTimeout(timer);
        } else {
            setIsFormPopulated(false);
        }
    }, [isOpen, user]);

    // Resolve manager_id → reportsToType / selectedRMId / selectedLMId for edit mode
    useEffect(() => {
        if (!isOpen || !user?.manager_id) {
            if (!user?.manager_id) {
                setReportsToType('');
                setSelectedRMId('');
                setSelectedLMId('');
            }
            return;
        }
        const mid = user.manager_id;
        // Check if it's a regional manager
        if (managers.find(m => m.id === mid)) {
            setReportsToType('regional_manager');
            setSelectedRMId(mid);
            setSelectedLMId('');
            return;
        }
        // Check if it's a location manager
        const lm = allLocationManagers.find(m => m.id === mid);
        if (lm) {
            setReportsToType('regional_manager');
            setSelectedRMId(lm.managerId || '');
            setSelectedLMId(mid);
            return;
        }
        // Data not loaded yet — will re-run when managers/allLocationManagers update
    }, [isOpen, user?.manager_id, managers, allLocationManagers]);

    const handleResetPassword = async () => {
        if (!user?.email) return;

        const confirmReset = confirm(`Reset password for ${user.email}?\n\nA password reset email will be sent to this user.`);
        if (!confirmReset) return;

        setIsResettingPassword(true);
        try {
            const response = await fetch('/api/admin/reset-user-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to reset password');
            }

            alert(`Password reset email sent to ${user.email}`);
        } catch (err) {
            console.error('Error resetting password:', err);
            setError(err instanceof Error ? err.message : 'Failed to reset password');
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImageUrl(reader.result as string);
                setIsCropModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropSave = (croppedImageUrl: string) => {
        setPhotoUrl(croppedImageUrl);
        setIsCropModalOpen(false);
        setSelectedImageUrl('');
    };

    const handleCropCancel = () => {
        setIsCropModalOpen(false);
        setSelectedImageUrl('');
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatPhoneNumber = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length === 0) return '';
        if (numbers.length <= 3) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fullName.trim()) {
            setError('Full name is required');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            setError('Valid email is required');
            return;
        }

        if (!isEditing && !password) {
            setError('Password is required for new users');
            return;
        }

        if (!canCreateRole(role)) {
            setError(`You don't have permission to create ${role} users`);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const formData: UserFormData = {
                email: email.trim(),
                ...((isEditing ? editPassword : password) && { password: isEditing ? editPassword : password }),
                role,
                profile: {
                    full_name: fullName.trim(),
                    ...(nickname && { nickname: nickname.trim() }),
                    ...(phone && { phone }),
                    ...(photoUrl && { photo_url: photoUrl }),
                    ...(street || city || state || zip ? {
                        address: { street, city, state, zip }
                    } : {})
                },
                locationIds: showLocationSelector ? locationIds : [],
                ...(role === 'local_user' ? { entityAssignments: entityAssignments.map(ea => ({ entity_id: ea.entity_id, entity_type: ea.entity_type })) } : {}),
                ...(((role === 'location_manager' || role === 'local_user') && (isSuperAdmin || isSystemAdmin)) ? { manager_id: selectedLMId || selectedRMId || '' } : {})
            };

            await onSave(formData);
            onClose();
        } catch (err) {
            console.error('Error saving user:', err);
            setError(err instanceof Error ? err.message : 'Failed to save user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableRoles = ROLE_OPTIONS.filter((opt) => canCreateRole(opt.value));
    const selectedRole = availableRoles.find(r => r.value === role);

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={handleCloseInternal}
                title={isEditing ? 'Edit User' : 'Add New User'}
                subtitle={isEditing && user ? <>{user.profile?.full_name} <span className="text-content-muted">·</span> {user.email}</> : undefined}
                width={900}
                actions={
                    <button
                        type="submit"
                        form="user-form"
                        disabled={isSubmitting || isLoading || !isFormPopulated}
                        className="px-6 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 transition-colors shadow-lg shadow-black/20"
                    >
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
                    </button>
                }
            >
                {isLoading || !isFormPopulated ? (
                    <div className="flex h-full items-center justify-center">
                        <HeartLoader />
                    </div>
                ) : (
                    <form id="user-form" onSubmit={handleSubmit} className="flex flex-col h-full">
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-[10px]">
                                <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
                                    <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                                        <User className="h-4 w-4 text-accent" />
                                        Account Information
                                    </h3>

                                    <div className="flex gap-4 mb-[5px]">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">
                                                    Full Name
                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 ml-1 inline-block"></span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                                                    placeholder="John Doe"
                                                    autoComplete="off"
                                                    required
                                                />
                                            </div>

                                            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Nickname</label>
                                                <input
                                                    type="text"
                                                    value={nickname}
                                                    onChange={(e) => setNickname(e.target.value)}
                                                    className="form-input text-sm text-left w-48 h-8 rounded-md px-3"
                                                    placeholder="Optional"
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-shrink-0">
                                            <div className="relative w-24 h-24">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handlePhotoChange}
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handlePhotoClick}
                                                    className="w-full h-full rounded-full overflow-hidden bg-surface-primary transition-colors group"
                                                >
                                                    {photoUrl ? (
                                                        <img
                                                            src={photoUrl}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-content-muted">
                                                            <User className="h-10 w-10" />
                                                        </div>
                                                    )}
                                                </button>
                                                <div className={cn("absolute bottom-0 right-0 bg-accent rounded-full p-1.5 border-2 shadow-lg hover:bg-accent-light transition-colors cursor-pointer z-10", isLight ? "border-white" : "border-[rgb(13,17,21)]")} onClick={handlePhotoClick}>
                                                    <Upload className="h-3 w-3 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">
                                                Email
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 ml-1 inline-block"></span>
                                            </label>
                                            <div className="relative flex-shrink-0">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    disabled={isEditing}
                                                    className="form-input text-sm text-left w-56 h-8 rounded-md pl-9 pr-3"
                                                    placeholder="user@example.com"
                                                    autoComplete="off"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {!isEditing && (
                                            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">
                                                    Password
                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 ml-1 inline-block"></span>
                                                </label>
                                                <div className="relative flex-shrink-0">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="form-input text-sm text-left w-56 h-8 rounded-md px-3 pr-9"
                                                        placeholder="Min. 8 characters"
                                                        autoComplete="new-password"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary z-10"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="h-4 w-4" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {isEditing && (isSuperAdmin || isSystemAdmin || (currentUser?.id === user?.id)) && (
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-content-secondary">
                                                    Password (optional - leave blank to keep current)
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type={showEditPassword ? "text" : "password"}
                                                            value={editPassword}
                                                            onChange={(e) => setEditPassword(e.target.value)}
                                                            className="form-input w-full py-2 px-3 pr-10 text-sm"
                                                            placeholder="Enter new password to change"
                                                            autoComplete="new-password"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowEditPassword(!showEditPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary transition-colors"
                                                        >
                                                            {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                    <Tooltip content="Send password reset email">
                                                        <button
                                                            type="button"
                                                            onClick={handleResetPassword}
                                                            disabled={isResettingPassword}
                                                            className="px-3 py-1.5 rounded-md bg-surface-input hover:bg-surface-hover text-content-primary text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 h-[38px]"
                                                        >
                                                            <RotateCw className={`h-3.5 w-3.5 ${isResettingPassword ? 'animate-spin' : ''}`} />
                                                            Reset
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                            <label className="text-sm font-medium text-content-secondary flex items-center gap-1.5 whitespace-nowrap pl-[5px]">
                                                Role
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                                <Tooltip content={<div className="space-y-2">
                                                    {ROLE_OPTIONS.map(opt => {
                                                        const Icon = getRoleIcon(opt.value);
                                                        return (
                                                            <div key={opt.value} className="flex items-start gap-2">
                                                                <Icon className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                                                                <div>
                                                                    <div className="font-medium text-xs">{opt.label}</div>
                                                                    <div className="text-[10px] text-content-muted">{opt.description}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>}>
                                                    <Info className="h-3.5 w-3.5 text-content-muted hover:text-content-secondary cursor-help" />
                                                </Tooltip>
                                            </label>
                                            <div className="w-56">
                                                <EnhancedSelect
                                                    value={role}
                                                    onChange={(value) => setRole(value as UserRole)}
                                                    options={availableRoles.map(opt => ({
                                                        value: opt.value,
                                                        label: opt.label,
                                                        description: opt.description,
                                                        icon: getRoleIcon(opt.value),
                                                        iconColor: ROLE_COLORS[opt.value],
                                                    }))}
                                                    leftIcon={Shield}
                                                />
                                            </div>
                                        </div>

                                        {/* Reports To - cascading: type → RM → optional LM */}
                                        {(isSuperAdmin || isSystemAdmin) && (role === 'location_manager' || role === 'local_user') && (
                                            <div className="bg-surface-hover rounded-lg p-[5px] space-y-2">
                                                {/* Step 1: manager type */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <label className="text-sm font-medium text-content-secondary flex items-center gap-1.5 whitespace-nowrap pl-[5px]">
                                                        Reports To
                                                    </label>
                                                    <div className="w-56">
                                                        <EnhancedSelect
                                                            value={reportsToType}
                                                            onChange={(value) => {
                                                                setReportsToType(value as '' | 'regional_manager');
                                                                if (!value) { setSelectedRMId(''); setSelectedLMId(''); }
                                                            }}
                                                            options={[
                                                                { value: '', label: 'None (Directly Managed)', description: 'Managed by Admins', icon: Shield },
                                                                { value: 'regional_manager', label: 'Regional Manager', icon: Users },
                                                            ]}
                                                            leftIcon={Shield}
                                                        />
                                                    </div>
                                                </div>
                                                {/* Step 2: pick specific RM */}
                                                {reportsToType === 'regional_manager' && (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">
                                                            Regional Manager
                                                        </label>
                                                        <div className="w-56">
                                                            <EnhancedSelect
                                                                value={selectedRMId}
                                                                onChange={(value) => { setSelectedRMId(value); setSelectedLMId(''); }}
                                                                options={managers.map(m => ({ value: m.id, label: m.name, icon: Users }))}
                                                                placeholder="Select Regional Manager"
                                                                leftIcon={Users}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Step 3: optional LM (local_user only, filtered by selected RM) */}
                                                {role === 'local_user' && selectedRMId && allLocationManagers.filter(m => m.managerId === selectedRMId).length > 0 && (
                                                    <div className="flex items-center justify-between gap-2">
                                                        <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">
                                                            Location Manager
                                                            <span className="text-content-muted text-xs font-normal ml-1">(optional)</span>
                                                        </label>
                                                        <div className="w-56">
                                                            <EnhancedSelect
                                                                value={selectedLMId}
                                                                onChange={(value) => setSelectedLMId(value)}
                                                                options={[
                                                                    { value: '', label: 'None', icon: Shield },
                                                                    ...allLocationManagers
                                                                        .filter(m => m.managerId === selectedRMId)
                                                                        .map(m => ({ value: m.id, label: m.name, icon: Map }))
                                                                ]}
                                                                leftIcon={Map}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Entity Assignments - shown for Local User role */}
                                        {role === 'local_user' && (
                                            <div className="bg-surface-hover rounded-lg p-[5px] space-y-2 transition-all">
                                                <label className="text-sm font-medium text-content-secondary flex items-center gap-1.5 w-full">
                                                    <MapPin className="h-3.5 w-3.5 text-accent" />
                                                    Assigned Homes / Facilities
                                                </label>

                                                {entityAssignments.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {entityAssignments.map(ea => (
                                                            <span
                                                                key={`${ea.entity_type}-${ea.entity_id}`}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/15 text-accent text-xs font-medium"
                                                            >
                                                                <span className="text-[10px] text-accent/70 uppercase font-semibold">{ea.entity_type === 'home' ? 'H' : 'F'}</span>
                                                                {ea.name}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEntityAssignments(prev => prev.filter(e => !(e.entity_id === ea.entity_id && e.entity_type === ea.entity_type)))}
                                                                    className="hover:text-white transition-colors"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="relative" ref={entityDropdownRef}>
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                                                        <input
                                                            type="text"
                                                            value={entitySearch}
                                                            onChange={(e) => {
                                                                const q = e.target.value;
                                                                setEntitySearch(q);
                                                                setIsEntityDropdownOpen(true);
                                                                if (entitySearchTimeout.current) clearTimeout(entitySearchTimeout.current);
                                                                if (!q.trim()) { setEntitySearchResults([]); return; }
                                                                entitySearchTimeout.current = setTimeout(async () => {
                                                                    const term = `%${q}%`;
                                                                    const [{ data: homes }, { data: facilities }] = await Promise.all([
                                                                        supabaseClient.from('homes').select('id, title').ilike('title', term).limit(10),
                                                                        supabaseClient.from('facilities').select('id, title').ilike('title', term).limit(10),
                                                                    ]);
                                                                    setEntitySearchResults([
                                                                        ...(homes || []).map((h: { id: string; title: string }) => ({ id: h.id, name: h.title, type: 'home' as const })),
                                                                        ...(facilities || []).map((f: { id: string; title: string }) => ({ id: f.id, name: f.title, type: 'facility' as const })),
                                                                    ].sort((a, b) => a.name.localeCompare(b.name)));
                                                                }, 300);
                                                            }}
                                                            onFocus={() => setIsEntityDropdownOpen(true)}
                                                            className="form-input text-sm text-left w-full h-8 rounded-md pl-9 pr-3"
                                                            placeholder="Search homes & facilities..."
                                                            autoComplete="off"
                                                        />
                                                    </div>

                                                    {isEntityDropdownOpen && entitySearchResults.length > 0 && (
                                                        <div className="dropdown-menu absolute z-50 w-full mt-1 max-h-48 overflow-y-auto p-1">
                                                            {entitySearchResults.map(result => {
                                                                const isAssigned = entityAssignments.some(ea => ea.entity_id === result.id && ea.entity_type === result.type);
                                                                return (
                                                                    <button
                                                                        key={`${result.type}-${result.id}`}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (isAssigned) {
                                                                                setEntityAssignments(prev => prev.filter(e => !(e.entity_id === result.id && e.entity_type === result.type)));
                                                                            } else {
                                                                                setEntityAssignments(prev => [...prev, { entity_id: result.id, entity_type: result.type, name: result.name }]);
                                                                            }
                                                                        }}
                                                                        className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${isAssigned ? 'bg-surface-hover text-content-primary' : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'}`}
                                                                    >
                                                                        <span className="text-[10px] text-content-muted uppercase font-semibold w-4 flex-shrink-0">{result.type === 'home' ? 'H' : 'F'}</span>
                                                                        <span>{result.name}</span>
                                                                        {isAssigned && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Location Assignments - shown for RM and Location Manager */}
                                        {showLocationSelector && (
                                            <div className="bg-surface-hover rounded-lg p-[5px] space-y-2 transition-all">
                                                <label className="text-sm font-medium text-content-secondary flex items-center gap-1.5 w-full">
                                                    <Globe className="h-3.5 w-3.5 text-accent" />
                                                    Location Assignments
                                                    <span className="text-xs text-content-muted font-normal ml-1">
                                                        ({role === 'regional_manager' ? 'States' : 'States & Cities'})
                                                    </span>
                                                </label>

                                                {/* Selected locations as chips */}
                                                {locationIds.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        {locationIds.map(lid => {
                                                            const entry = taxonomyEntries.find(e => e.id === lid);
                                                            const parent = entry?.parent_id ? taxonomyEntries.find(e => e.id === entry.parent_id) : null;
                                                            return (
                                                                <span
                                                                    key={lid}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/15 text-accent text-xs font-medium"
                                                                >
                                                                    {parent ? `${parent.name} › ${entry?.name}` : entry?.name || lid}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setLocationIds(prev => prev.filter(id => id !== lid))}
                                                                        className="hover:text-white transition-colors"
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Location dropdown */}
                                                <div className="relative" ref={locationDropdownRef}>
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                                                        <input
                                                            type="text"
                                                            value={locationSearch}
                                                            onChange={(e) => {
                                                                setLocationSearch(e.target.value);
                                                                setIsLocationDropdownOpen(true);
                                                            }}
                                                            onFocus={() => setIsLocationDropdownOpen(true)}
                                                            className="form-input text-sm text-left w-full h-8 rounded-md pl-9 pr-3"
                                                            placeholder="Search locations..."
                                                            autoComplete="off"
                                                        />
                                                    </div>

                                                    {isLocationDropdownOpen && (() => {
                                                        const availableLocations = getAvailableLocations();
                                                        const searchLower = locationSearch.toLowerCase();

                                                        return (
                                                            <div className="dropdown-menu absolute z-50 w-full mt-1 max-h-48 overflow-y-auto p-1">
                                                                {availableLocations.length === 0 ? (
                                                                    <div className="px-3 py-2 text-xs text-content-muted">No locations available</div>
                                                                ) : (
                                                                    availableLocations.map(loc => {
                                                                        const isStateSelected = locationIds.includes(loc.id);
                                                                        const matchesSearch = !searchLower || loc.name.toLowerCase().includes(searchLower);
                                                                        const childrenMatchSearch = loc.children?.some((c: { name: string }) => c.name.toLowerCase().includes(searchLower));

                                                                        if (!matchesSearch && !childrenMatchSearch) return null;

                                                                        return (
                                                                            <div key={loc.id}>
                                                                                {/* State entry */}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (isStateSelected) {
                                                                                            setLocationIds(prev => prev.filter(id => id !== loc.id));
                                                                                        } else {
                                                                                            setLocationIds(prev => [...prev, loc.id]);
                                                                                        }
                                                                                    }}
                                                                                    className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${isStateSelected
                                                                                        ? 'bg-surface-hover text-content-primary'
                                                                                        : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
                                                                                        }`}
                                                                                >
                                                                                    <span className="font-medium">{loc.name}</span>
                                                                                    {isStateSelected && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                                                                </button>

                                                                                {/* City children (only for location_manager role) */}
                                                                                {role === 'location_manager' && loc.children && loc.children.length > 0 && (
                                                                                    <div className="ml-4">
                                                                                        {loc.children
                                                                                            .filter((c: { name: string }) => !searchLower || c.name.toLowerCase().includes(searchLower) || matchesSearch)
                                                                                            .map((child: { id: string; name: string }) => {
                                                                                                const isCitySelected = locationIds.includes(child.id);
                                                                                                return (
                                                                                                    <button
                                                                                                        key={child.id}
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            if (isCitySelected) {
                                                                                                                setLocationIds(prev => prev.filter(id => id !== child.id));
                                                                                                            } else {
                                                                                                                setLocationIds(prev => [...prev, child.id]);
                                                                                                            }
                                                                                                        }}
                                                                                                        className={`w-full text-left px-3 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${isCitySelected
                                                                                                            ? 'bg-surface-hover text-content-primary'
                                                                                                            : 'text-content-muted hover:bg-surface-hover hover:text-content-primary'
                                                                                                            }`}
                                                                                                    >
                                                                                                        <span>{child.name}</span>
                                                                                                        {isCitySelected && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                                                                                    </button>
                                                                                                );
                                                                                            })}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-[10px]">
                                <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
                                    <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                                        <Phone className="h-4 w-4 text-accent" />
                                        Contact Information
                                    </h3>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Phone</label>
                                            <div className="relative flex-shrink-0">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                                                    className="form-input text-sm text-left w-56 h-8 rounded-md pl-9 pr-3"
                                                    placeholder="(555) 555-5555"
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
                                    <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                                        <MapPin className="h-4 w-4 text-accent" />
                                        Address
                                    </h3>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Street</label>
                                            <input
                                                type="text"
                                                value={street}
                                                onChange={(e) => setStreet(e.target.value)}
                                                className="form-input text-sm text-left w-56 h-8 rounded-md px-3"
                                                placeholder="123 Main St"
                                                autoComplete="off"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">City</label>
                                            <input
                                                type="text"
                                                value={city}
                                                onChange={(e) => setCity(e.target.value)}
                                                className="form-input text-sm text-left w-56 h-8 rounded-md px-3"
                                                placeholder="Honolulu"
                                                autoComplete="off"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex-shrink-0 pl-[5px]">State / Zip</label>
                                            <div className="flex gap-2 ml-auto">
                                                <SimpleSelect
                                                    value={state}
                                                    onChange={(val) => setState(val)}
                                                    options={US_STATES.map(s => s.name)}
                                                    placeholder="State..."
                                                    className="w-32 h-8 flex items-center justify-between px-2 text-sm text-left"
                                                />
                                                <input
                                                    type="text"
                                                    value={zip}
                                                    onChange={(e) => setZip(e.target.value)}
                                                    className="form-input text-sm text-left w-20 h-8 rounded-md px-3"
                                                    placeholder="96814"
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}

                <ImageCropModal
                    isOpen={isCropModalOpen}
                    imageUrl={selectedImageUrl}
                    onClose={handleCropCancel}
                    onSave={handleCropSave}
                />
            </SlidePanel>

            <ConfirmationModal
                isOpen={showCloseWarning}
                onClose={() => setShowCloseWarning(false)}
                onConfirm={handleDiscardChanges}
                title="Unsaved Changes"
                message="You have unsaved changes. Are you sure you want to close? Your changes will be lost."
                confirmLabel="Discard Changes"
                cancelLabel="Keep Editing"
                isDangerous={true}
            />
        </>
    );
}



