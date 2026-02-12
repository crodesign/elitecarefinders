"use client";

import { useState, useEffect } from "react";
import { SlidePanel } from "./SlidePanel";
import { User, Mail, Phone, MapPin, Shield, Info, ChevronDown, Check, Users } from 'lucide-react';
import type { UserProfile, UserRole } from "@/types/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip } from "@/components/ui/Tooltip";

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
    const { canCreateRole } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
                setStreet('');
                setCity('');
                setState('');
                setZip('');
            }
        }
    }, [isOpen, user]);

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

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-white/80 flex items-center gap-1">
                                        Full Name
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full rounded-md py-1.5 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-white/80">Nickname</label>
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full rounded-md py-1.5 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                        placeholder="Optional nickname"
                                    />
                                </div>

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
                                            className="w-full rounded-md py-1.5 pl-10 pr-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                            placeholder="user@example.com"
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
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full rounded-md py-1.5 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                            placeholder="Min. 8 characters"
                                            required
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-white/80 flex items-center gap-1">
                                        Role
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value as UserRole)}
                                        className="w-full rounded-md py-1.5 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                    >
                                        {availableRoles.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
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
                                            className="w-full rounded-md py-1.5 pl-10 pr-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                            placeholder="(555) 555-5555"
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
                                        className="w-full rounded-md py-1.5 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                        placeholder="123 Main St"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-white/80">City</label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="w-full rounded-md py-1.5 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                        placeholder="Honolulu"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80">State</label>
                                        <select
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            className="w-full rounded-md py-1.5 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                        >
                                            <option value="">Select State</option>
                                            {US_STATES.map(s => (
                                                <option key={s.code} value={s.code}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-white/80">ZIP Code</label>
                                        <input
                                            type="text"
                                            value={zip}
                                            onChange={(e) => setZip(e.target.value)}
                                            className="w-full rounded-md py-1.5 px-3 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50 border border-white/10"
                                            placeholder="96801"
                                            maxLength={10}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </SlidePanel>
    );
}
