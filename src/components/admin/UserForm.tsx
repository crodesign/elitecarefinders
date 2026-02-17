"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SlidePanel } from "./SlidePanel";
import { ImageCropModal } from "./ImageCropModal";
import { User, Mail, Phone, MapPin, Shield, Info, ChevronDown, Check, Users, RotateCw, Upload, Eye, EyeOff, Globe, X, Search, Loader2 } from 'lucide-react';
import { createClientComponentClient } from "@/lib/supabase";
import type { UserProfile, UserRole } from "@/types/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip } from "@/components/ui/Tooltip";
import { EnhancedSelect } from "./EnhancedSelect";
import { SimpleSelect } from "./SimpleSelect";

// Get icon based on role type
const getRoleIcon = (roleValue: UserRole) => {
    switch (roleValue) {
        case 'local_user':
            return User;
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
    { value: 'system_admin', label: 'System Admin', description: 'Can manage Regional Managers and Local Users' },
    { value: 'regional_manager', label: 'Regional Manager', description: 'Can manage Local Users in their regions' },
    { value: 'local_user', label: 'Local User', description: 'Can only manage their own content' }
];

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
    manager_id?: string;
}

interface ManagerOption {
    id: string;
    name: string;
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
        manager_id?: string;
    } | null;
}

export function UserForm({ isOpen, onClose, onSave, user }: UserFormProps) {
    const { canCreateRole, isSuperAdmin, isSystemAdmin, user: currentUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [photoUrl, setPhotoUrl] = useState<string>('');
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    const [managerId, setManagerId] = useState<string>('');
    const [managers, setManagers] = useState<ManagerOption[]>([]);

    // Location assignment state
    const [locationIds, setLocationIds] = useState<string[]>([]);
    const [taxonomyEntries, setTaxonomyEntries] = useState<{ id: string; name: string; parent_id: string | null; slug: string }[]>([]);
    const [locationSearch, setLocationSearch] = useState('');
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
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
                                .select('user_id')
                                .eq('role', 'regional_manager');

                            if (rmRoles && rmRoles.length > 0) {
                                const ids = rmRoles.map(r => r.user_id);
                                const { data: profiles } = await supabaseClient
                                    .from('user_profiles')
                                    .select('user_id, full_name')
                                    .in('user_id', ids);

                                if (profiles) {
                                    setManagers(profiles.map(p => ({
                                        id: p.user_id,
                                        name: p.full_name
                                    })).sort((a, b) => a.name.localeCompare(b.name)));
                                }
                            }
                        } catch (err) {
                            console.error('Failed to fetch managers:', err);
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

    // Close location dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
                setIsLocationDropdownOpen(false);
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

        if (role === 'local_user') {
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

    const showLocationSelector = role === 'regional_manager' || role === 'local_user';

    const isEditing = !!user;

    // Reset or populate form
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setIsFormPopulated(false);

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
                setManagerId(user.manager_id || '');
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
                setManagerId('');
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
                ...((role === 'local_user' && (isSuperAdmin || isSystemAdmin) && managerId) ? { manager_id: managerId } : {})
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
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Edit User' : 'Add New User'}
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
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            ) : (
                <form id="user-form" onSubmit={handleSubmit} className="flex flex-col h-full">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-lg p-4">
                                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                                    <User className="h-4 w-4 text-accent" />
                                    Account Information
                                </h3>

                                <div className="flex gap-4 mb-3">
                                    <div className="flex-1 space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-white/80 flex items-center gap-1">
                                                Full Name
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                            </label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="John Doe"
                                                autoComplete="off"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-white/80">Nickname</label>
                                            <input
                                                type="text"
                                                value={nickname}
                                                onChange={(e) => setNickname(e.target.value)}
                                                className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="Optional nickname"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0">
                                        <label className="text-sm font-medium text-white/80 block mb-1">Photo</label>
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
                                                className="w-full h-full rounded-full overflow-hidden bg-black/30 hover:bg-black/40 transition-colors group"
                                            >
                                                {photoUrl ? (
                                                    <img
                                                        src={photoUrl}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/40">
                                                        <User className="h-10 w-10" />
                                                    </div>
                                                )}
                                            </button>
                                            <div className="absolute bottom-0 right-0 bg-accent rounded-full p-1.5 border-2 border-[rgb(13,17,21)] shadow-lg hover:bg-accent-light transition-colors cursor-pointer z-10" onClick={handlePhotoClick}>
                                                <Upload className="h-3 w-3 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80 flex items-center gap-1">
                                            Email
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                disabled={isEditing}
                                                className="w-full rounded-md py-2 pl-10 pr-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="user@example.com"
                                                autoComplete="off"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {!isEditing && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-white/80 flex items-center gap-1">
                                                Password
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full rounded-md py-2 px-3 pr-10 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                    placeholder="Min. 8 characters"
                                                    autoComplete="new-password"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {isEditing && (isSuperAdmin || isSystemAdmin || (currentUser?.id === user?.id)) && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-white/80">
                                                Password (optional - leave blank to keep current)
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <input
                                                        type={showEditPassword ? "text" : "password"}
                                                        value={editPassword}
                                                        onChange={(e) => setEditPassword(e.target.value)}
                                                        className="w-full rounded-md py-2 px-3 pr-10 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                        placeholder="Enter new password to change"
                                                        autoComplete="new-password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowEditPassword(!showEditPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                                                    >
                                                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <Tooltip content="Send password reset email">
                                                    <button
                                                        type="button"
                                                        onClick={handleResetPassword}
                                                        disabled={isResettingPassword}
                                                        className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 h-[38px]"
                                                    >
                                                        <RotateCw className={`h-3.5 w-3.5 ${isResettingPassword ? 'animate-spin' : ''}`} />
                                                        Reset
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80 flex items-center gap-1.5">
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
                                                                <div className="text-[10px] text-white/60">{opt.description}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>}>
                                                <Info className="h-3.5 w-3.5 text-white/40 hover:text-white/60 cursor-help" />
                                            </Tooltip>
                                        </label>
                                        <EnhancedSelect
                                            value={role}
                                            onChange={(value) => setRole(value as UserRole)}
                                            options={availableRoles.map(opt => ({
                                                value: opt.value,
                                                label: opt.label,
                                                description: opt.description,
                                                icon: getRoleIcon(opt.value)
                                            }))}
                                            leftIcon={Shield}
                                        />
                                    </div>

                                    {/* Reports To (Manager) - Only for Admins creating Local Users */}
                                    {(isSuperAdmin || isSystemAdmin) && role === 'local_user' && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-white/80 flex items-center gap-1.5">
                                                Reports To
                                                <Tooltip content="Assign a Regional Manager to this user.">
                                                    <Info className="h-3.5 w-3.5 text-white/40 hover:text-white/60 cursor-help" />
                                                </Tooltip>
                                            </label>
                                            <EnhancedSelect
                                                value={managerId}
                                                onChange={(value) => setManagerId(value)}
                                                options={[
                                                    { value: '', label: 'None (Directly Managed)', description: 'Managed by Admins', icon: Shield },
                                                    ...managers.map(m => ({
                                                        value: m.id,
                                                        label: m.name,
                                                        description: 'Regional Manager',
                                                        icon: Users
                                                    }))
                                                ]}
                                                placeholder="Select Regional Manager"
                                                leftIcon={Users}
                                            />
                                        </div>
                                    )}

                                    {/* Location Assignments - shown for RM and Local User */}
                                    {showLocationSelector && (
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <label className="text-sm font-medium text-white/80 flex items-center gap-1.5 mb-2">
                                                <Globe className="h-3.5 w-3.5 text-accent" />
                                                Location Assignments
                                                <span className="text-xs text-zinc-500 font-normal ml-1">
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
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                                    <input
                                                        type="text"
                                                        value={locationSearch}
                                                        onChange={(e) => {
                                                            setLocationSearch(e.target.value);
                                                            setIsLocationDropdownOpen(true);
                                                        }}
                                                        onFocus={() => setIsLocationDropdownOpen(true)}
                                                        className="w-full rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                        placeholder="Search locations..."
                                                        autoComplete="off"
                                                    />
                                                </div>

                                                {isLocationDropdownOpen && (() => {
                                                    const availableLocations = getAvailableLocations();
                                                    const searchLower = locationSearch.toLowerCase();

                                                    return (
                                                        <div className="absolute z-50 w-full mt-1 bg-zinc-900 rounded-md shadow-xl border border-white/10 max-h-48 overflow-y-auto p-1">
                                                            {availableLocations.length === 0 ? (
                                                                <div className="px-3 py-2 text-xs text-zinc-500">No locations available</div>
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
                                                                                    ? 'bg-accent/10 text-accent'
                                                                                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                                                                    }`}
                                                                            >
                                                                                <span className="font-medium">{loc.name}</span>
                                                                                {isStateSelected && <Check className="h-3.5 w-3.5 ml-auto text-accent" />}
                                                                            </button>

                                                                            {/* City children (only for local_user role) */}
                                                                            {role === 'local_user' && loc.children && loc.children.length > 0 && (
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
                                                                                                        ? 'bg-accent/10 text-accent'
                                                                                                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                                                                                        }`}
                                                                                                >
                                                                                                    <span>{child.name}</span>
                                                                                                    {isCitySelected && <Check className="h-3 w-3 ml-auto text-accent" />}
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

                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-lg p-4">
                                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-accent" />
                                    Contact Information
                                </h3>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80">Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                                                className="w-full rounded-md py-2 pl-10 pr-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="(555) 555-5555"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-lg p-4">
                                <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-accent" />
                                    Address
                                </h3>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80">Street</label>
                                        <input
                                            type="text"
                                            value={street}
                                            onChange={(e) => setStreet(e.target.value)}
                                            className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                            placeholder="123 Main St"
                                            autoComplete="off"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80">City</label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                            placeholder="Honolulu"
                                            autoComplete="off"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-white/80">State</label>
                                            <SimpleSelect
                                                value={state}
                                                onChange={(val) => setState(val)}
                                                options={US_STATES.map(s => s.name)}
                                                placeholder="Select State..."
                                                className="w-full"
                                                textSize="text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-white/80">ZIP Code</label>
                                            <input
                                                type="text"
                                                value={zip}
                                                onChange={(e) => setZip(e.target.value)}
                                                className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="96801"
                                                maxLength={10}
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
    );
}
