"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    User,
    Upload,
    Save,
    Loader2,
    ArrowLeft,
    Phone,
    MapPin,
    Mail,
    Shield,
    Lock,
    Eye,
    EyeOff,
    ChevronRight,
    Users,
} from "lucide-react";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { supabase } from "@/lib/supabase";

export default function MyProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { showNotification } = useNotification();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [fullName, setFullName] = useState("");
    const [nickname, setNickname] = useState("");
    const [phone, setPhone] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");
    const [managerName, setManagerName] = useState("");

    // Password fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Location assignments
    const [assignedLocations, setAssignedLocations] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
    const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

    const toggleLocation = (locationId: string) => {
        const newExpanded = new Set(expandedLocations);
        if (newExpanded.has(locationId)) {
            newExpanded.delete(locationId);
        } else {
            newExpanded.add(locationId);
        }
        setExpandedLocations(newExpanded);
    };

    // Load profile data
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push("/login");
            return;
        }

        const loadProfile = async () => {
            try {
                const res = await fetch("/api/profile");
                if (res.ok) {
                    const data = await res.json();
                    setFullName(data.full_name || "");
                    setNickname(data.nickname || "");
                    setPhone(data.phone || "");
                    setPhotoUrl(data.photo_url || "");
                    setStreet(data.address?.street || "");
                    setCity(data.address?.city || "");
                    setState(data.address?.state || "");
                    setZip(data.address?.zip || "");
                    setManagerName(data.manager_name || "");
                }
            } catch (err) {
                console.error("Failed to load profile:", err);
            } finally {
                setIsLoading(false);
            }
        };

        const loadLocations = async () => {
            try {
                // Get user's assigned location IDs
                const { data: assignments } = await supabase
                    .from('user_location_assignments')
                    .select('location_id')
                    .eq('user_id', user.id);

                if (assignments && assignments.length > 0) {
                    const locationIds = assignments.map(a => a.location_id);

                    // Get location taxonomy
                    const { data: taxonomyData } = await supabase
                        .from('taxonomies')
                        .select('id')
                        .or('type.eq.location,slug.eq.location')
                        .single();

                    if (taxonomyData) {
                        // Fetch all entries for this taxonomy so we can build the tree
                        const { data: allEntries } = await supabase
                            .from('taxonomy_entries')
                            .select('id, name, parent_id')
                            .eq('taxonomy_id', taxonomyData.id)
                            .order('name');

                        if (allEntries) {
                            const assignedSet = new Set(locationIds);
                            const neededIds = new Set<string>();

                            allEntries.forEach(e => {
                                if (assignedSet.has(e.id)) {
                                    neededIds.add(e.id);
                                    if (e.parent_id) neededIds.add(e.parent_id);
                                }
                            });

                            setAssignedLocations(allEntries.filter(e => neededIds.has(e.id)));
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load locations:', err);
            }
        };

        loadProfile();
        loadLocations();
    }, [user, authLoading, router]);

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
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // If photo was changed (data URL from cropper), upload it first
            let finalPhotoUrl = photoUrl;
            if (photoUrl && photoUrl.startsWith('data:') && user) {
                const blob = await (await fetch(photoUrl)).blob();
                const path = `profile-photos/${user.id}.jpg`;

                const { error: uploadError } = await supabase.storage
                    .from('media')
                    .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('media')
                    .getPublicUrl(path);

                finalPhotoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
                setPhotoUrl(finalPhotoUrl);
            }

            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fullName.trim(),
                    nickname: nickname.trim() || null,
                    phone: phone.trim() || null,
                    photo_url: finalPhotoUrl || null,
                    address: {
                        street: street.trim(),
                        city: city.trim(),
                        state: state.trim(),
                        zip: zip.trim(),
                    },
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            showNotification("Profile saved successfully!", "success");
        } catch (err: any) {
            showNotification(err.message || "Failed to save profile", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !currentPassword) {
            showNotification("Please fill in both password fields", "error");
            return;
        }
        if (newPassword.length < 8) {
            showNotification("New password must be at least 8 characters", "error");
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification("New passwords do not match", "error");
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await fetch("/api/profile/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update password");

            showNotification("Password updated successfully!", "success");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            showNotification(err.message || "Failed to update password", "error");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case "super_admin": return "Super Admin";
            case "system_admin": return "System Admin";
            case "regional_manager": return "Regional Manager";
            case "local_user": return "Local User";
            default: return "User";
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex-none p-4 md:p-8 pb-4 md:pb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.back()}
                                className="p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-content-primary">My Profile</h1>
                                <p className="text-xs md:text-sm text-content-secondary mt-1">
                                    Manage your personal information
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:px-8">
                    <div className="max-w-7xl mx-auto space-y-6">

                        {/* Profile Photo & Basic Info Card */}
                        <div className="bg-white/5 rounded-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left: Photo + Name & Role */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                    {/* Photo */}
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
                                            <div
                                                className="absolute bottom-0 right-0 bg-accent rounded-full p-1.5 border-2 border-[rgb(13,17,21)] shadow-lg hover:bg-accent-light transition-colors cursor-pointer z-10"
                                                onClick={handlePhotoClick}
                                            >
                                                <Upload className="h-3 w-3 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Name & Role */}
                                    <div className="flex-1 text-center sm:text-left">
                                        <h2 className="text-lg font-semibold text-content-primary">
                                            {fullName || "Your Name"}
                                        </h2>
                                        <p className="text-sm text-content-secondary mt-0.5">{user?.email}</p>

                                        {/* Dynamic Role Badge */}
                                        <div className="flex flex-col gap-2 mt-3 w-full">
                                            {/* Managed By Display */}
                                            {managerName && (
                                                <div className="flex items-center gap-1.5 text-xs text-content-muted bg-surface-hover px-2.5 py-1.5 rounded-md border border-ui-border inline-flex self-start">
                                                    <Users className="h-3 w-3 text-content-secondary" />
                                                    <span>Managed by <span className="text-content-secondary font-medium">{managerName}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Assigned Locations */}
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                                        <MapPin className="h-4 w-4 text-accent" />
                                        Assigned Locations
                                    </h3>
                                    {assignedLocations.length === 0 ? (
                                        <p className="text-sm text-content-muted italic">No locations assigned</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                            {/* Distribute states into 3 columns for stable layout */}
                                            {(() => {
                                                const states = assignedLocations.filter(loc => loc.parent_id === null);
                                                const itemsPerCol = Math.ceil(states.length / 3);
                                                const columns = [
                                                    states.slice(0, itemsPerCol),
                                                    states.slice(itemsPerCol, itemsPerCol * 2),
                                                    states.slice(itemsPerCol * 2)
                                                ];

                                                return columns.map((colStates, colIndex) => (
                                                    <div key={colIndex} className="space-y-2">
                                                        {colStates.map(state => {
                                                            const children = assignedLocations.filter(c => c.parent_id === state.id);
                                                            const isExpanded = expandedLocations.has(state.id);
                                                            const hasChildren = children.length > 0;

                                                            return (
                                                                <div key={state.id} className="mb-2">
                                                                    <button
                                                                        onClick={() => hasChildren && toggleLocation(state.id)}
                                                                        className={`flex items-center gap-1.5 text-sm w-full text-left group ${hasChildren ? "cursor-pointer hover:bg-white/5 rounded px-2 py-1.5 -ml-2 transition-colors" : "cursor-default py-1.5"}`}
                                                                    >
                                                                        {hasChildren ? (
                                                                            <ChevronRight className={`h-3.5 w-3.5 text-content-muted transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                                                                        ) : (
                                                                            <span className="w-3.5" />
                                                                        )}
                                                                        <MapPin className="h-3.5 w-3.5 text-accent/60" />
                                                                        <span className="text-white/90 font-medium">{state.name}</span>
                                                                        {hasChildren && (
                                                                            <span className="text-xs text-content-muted ml-1.5 bg-white/5 px-1.5 py-0.5 rounded">
                                                                                {children.length}
                                                                            </span>
                                                                        )}
                                                                    </button>

                                                                    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                                                        <div className="overflow-hidden">
                                                                            {hasChildren && (
                                                                                <div className={`ml-7 mt-1 pb-1 ${children.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-1" : "space-y-1"}`}>
                                                                                    {children.map(child => (
                                                                                        <div key={child.id} className="flex items-start gap-1.5 text-sm text-content-muted py-0.5">
                                                                                            <span className="w-1 h-1 rounded-full bg-surface-hover shrink-0 mt-1.5"></span>
                                                                                            <span>{child.name}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="bg-white/5 rounded-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Section Titles Row */}
                                <h3 className="md:col-span-2 text-sm font-semibold text-white flex items-center gap-2">
                                    <User className="h-4 w-4 text-accent" />
                                    Personal Information
                                </h3>
                                <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-accent" />
                                    Address
                                </h3>

                                {/* Left Column: Personal Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                                            <span className="flex items-center gap-1">
                                                Full Name
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-surface-input text-content-primary hover:bg-surface-hover focus:bg-surface-hover"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                                            Nickname
                                        </label>
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-surface-input text-content-primary hover:bg-surface-hover focus:bg-surface-hover"
                                            placeholder="Optional nickname"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                                            <span className="flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5" />
                                                Email
                                            </span>
                                        </label>
                                        <input
                                            type="email"
                                            value={user?.email || ""}
                                            disabled
                                            className="w-full rounded-md py-2 px-3 text-sm bg-surface-input text-content-muted cursor-not-allowed"
                                        />

                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                                            <span className="flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5" />
                                                Phone
                                            </span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-surface-input text-content-primary hover:bg-surface-hover focus:bg-surface-hover"
                                            placeholder="(555) 555-5555"
                                        />
                                    </div>
                                </div>

                                {/* Middle Column: Password */}
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Lock className="h-3.5 w-3.5" />
                                            Update Password
                                        </span>
                                    </label>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full rounded-md py-2 px-3 pr-10 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-content-muted hover:bg-black/50 focus:bg-black/50"
                                                placeholder="Current password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary"
                                            >
                                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full rounded-md py-2 px-3 pr-10 text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-content-muted hover:bg-black/50 focus:bg-black/50"
                                                placeholder="New password (min 8 characters)"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary"
                                            >
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={`w-full rounded-md py-2 px-3 pr-10 text-sm focus:outline-none transition-colors text-white placeholder-content-muted ${confirmPassword && confirmPassword !== newPassword
                                                    ? "bg-red-500/10 ring-1 ring-red-500/30"
                                                    : "bg-black/30 hover:bg-black/50 focus:bg-black/50"
                                                    }`}
                                                placeholder="Confirm new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {confirmPassword && confirmPassword !== newPassword && (
                                            <p className="text-xs text-red-400">Passwords do not match</p>
                                        )}
                                        <div className="flex justify-end mt-2">
                                            <button
                                                onClick={handleChangePassword}
                                                disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                                                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors font-medium
                                                    ${isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword
                                                        ? "bg-white/10 text-white/50 cursor-not-allowed" // 10% shaded, solid, no border
                                                        : "bg-accent text-white hover:bg-accent-light" // Primary
                                                    }`}
                                            >
                                                {isChangingPassword ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Lock className="h-3.5 w-3.5" />
                                                )}
                                                Update Password
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Address */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                                            Street
                                        </label>
                                        <input
                                            type="text"
                                            value={street}
                                            onChange={(e) => setStreet(e.target.value)}
                                            className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-surface-input text-content-primary hover:bg-surface-hover focus:bg-surface-hover"
                                            placeholder="123 Main St"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-1.5">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-surface-input text-content-primary hover:bg-surface-hover focus:bg-surface-hover"
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-1.5">
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                value={state}
                                                onChange={(e) => setState(e.target.value)}
                                                className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-surface-input text-content-primary hover:bg-surface-hover focus:bg-surface-hover"
                                                placeholder="State"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-white/80 mb-1.5">
                                                ZIP Code
                                            </label>
                                            <input
                                                type="text"
                                                value={zip}
                                                onChange={(e) => setZip(e.target.value)}
                                                className="w-full rounded-md py-2 px-3 text-sm focus:outline-none transition-colors bg-surface-input text-content-primary hover:bg-surface-hover focus:bg-surface-hover"
                                                placeholder="96801"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            <ImageCropModal
                isOpen={isCropModalOpen}
                imageUrl={selectedImageUrl}
                onClose={handleCropCancel}
                onSave={handleCropSave}
            />
        </>
    );
}
