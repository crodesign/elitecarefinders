"use client";

import { useState, useEffect, useRef } from "react";
import { SlidePanel } from "./SlidePanel";
import { ImageCropModal } from "./ImageCropModal";
import { User, Mail, Phone, MapPin, Shield, Info, ChevronDown, Check, Users, RotateCw, Upload, Eye, EyeOff } from 'lucide-react';
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
    } | null;
}

export function UserForm({ isOpen, onClose, onSave, user }: UserFormProps) {
    const { canCreateRole, isSuperAdmin, isSystemAdmin } = useAuth();
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
    const [fullName, setFullName] = useState('');
    const [nickname, setNickname] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<UserRole>('local_user');
    const [street, setStreet] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zip, setZip] = useState('');

    const isEditing = !!user;

    // Reset or populate form
    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (user) {
                setEmail(user.email);
                setPassword('');
                setFullName(user.profile?.full_name || '');
                setNickname(user.profile?.nickname || '');
                setPhone(user.profile?.phone || '');
                setRole(user.role.role);
                setPhotoUrl(user.profile?.photo_url || '');
                setStreet(user.profile?.address?.street || '');
                setCity(user.profile?.address?.city || '');
                setState(user.profile?.address?.state || '');
                setZip(user.profile?.address?.zip || '');
            } else {
                setEmail('');
                setPassword('');
                setFullName('');
                setNickname('');
                setPhone('');
                setRole('local_user');
                setPhotoUrl('');
                setStreet('');
                setCity('');
                setState('');
                setZip('');
            }
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
                ...(password && { password }),
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
                locationIds: []
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
                    disabled={isSubmitting}
                    className="px-6 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 transition-colors shadow-lg shadow-black/20"
                >
                    {isSubmitting ? 'Saving...' : (isEditing ? 'Update User' : 'Create User')}
                </button>
            }
        >
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

                                {isEditing && (isSuperAdmin || isSystemAdmin) && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80">Password</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="password"
                                                value="••••••••"
                                                disabled
                                                className="flex-1 rounded-md py-1.5 px-3 text-sm bg-black/20 text-white/40 cursor-not-allowed"
                                            />
                                            <Tooltip content="Send password reset email">
                                                <button
                                                    type="button"
                                                    onClick={handleResetPassword}
                                                    disabled={isResettingPassword}
                                                    className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
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
                                            {ROLE_OPTIONS.map(opt => (
                                                <div key={opt.value} className="flex items-start gap-2">
                                                    <Shield className="h-3.5 w-3.5 text-accent mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <div className="font-medium text-xs">{opt.label}</div>
                                                        <div className="text-[10px] text-white/60">{opt.description}</div>
                                                    </div>
                                                </div>
                                            ))}
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
                                            icon: Shield
                                        }))}
                                        placeholder="Select Role"
                                        leftIcon={Shield}
                                    />
                                </div>
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

            <ImageCropModal
                isOpen={isCropModalOpen}
                imageUrl={selectedImageUrl}
                onClose={handleCropCancel}
                onSave={handleCropSave}
            />
        </SlidePanel>
    );
}
