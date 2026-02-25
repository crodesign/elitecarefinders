"use client";

import { useState, useEffect, useRef } from "react";
import {
    User,
    Upload,
    Save,
    Loader2,
    Phone,
    MapPin,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ChevronRight,
    Users,
    Sun,
    Moon,
    Check
} from "lucide-react";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { EnhancedSelect } from "@/components/admin/EnhancedSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { supabase } from "@/lib/supabase";
import { getFolders } from "@/lib/services/mediaService";
import type { MediaFolder } from "@/types";
import { SlidePanel } from "@/components/admin/SlidePanel";
import { useTheme } from "@/contexts/ThemeContext";

const COLOR_PALETTE = [
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Teal', hex: '#14b8a6' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Sky', hex: '#0ea5e9' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Fuchsia', hex: '#d946ef' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Rose', hex: '#f43f5e' },
];

interface ProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
    stackLevel?: number;
    offsetSidebar?: boolean;
}

export function ProfilePanel({ isOpen, onClose, stackLevel = 2, offsetSidebar = false }: ProfilePanelProps) {
    const { user, loading: authLoading, isSuperAdmin, isSystemAdmin } = useAuth();
    const { showNotification } = useNotification();
    const { mode, setMode, accent, setAccent } = useTheme();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    // Handle clicking outside the color picker to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                setIsColorPickerOpen(false);
            }
        };

        if (isColorPickerOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isColorPickerOpen]);

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
    const [defaultMediaFolderId, setDefaultMediaFolderId] = useState("");
    const [mediaFolders, setMediaFolders] = useState<MediaFolder[]>([]);

    // Password fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form dirtiness tracking
    const [isDirty, setIsDirty] = useState(false);

    // Location assignments
    const [assignedLocations, setAssignedLocations] = useState<{ id: string; name: string; parent_id: string | null }[]>([]);
    const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
    const [states, setStates] = useState<{ id: string; name: string; slug: string }[]>([]);

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
        if (!isOpen || authLoading || !user) return;

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
                    setDefaultMediaFolderId(data.default_media_folder_id || "");
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
                    const locationIds = assignments.map((a: any) => a.location_id);

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

                            allEntries.forEach((e: any) => {
                                if (assignedSet.has(e.id)) {
                                    neededIds.add(e.id);
                                    if (e.parent_id) neededIds.add(e.parent_id);
                                }
                            });

                            setAssignedLocations(allEntries.filter((e: any) => neededIds.has(e.id)));
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load locations:', err);
            }
        };

        const loadStates = async () => {
            try {
                // First get the location taxonomy ID
                const { data: taxonomyData } = await supabase
                    .from('taxonomies')
                    .select('id')
                    .or('type.eq.location,slug.eq.location')
                    .single();

                if (taxonomyData) {
                    // Get top-level entries (states) from the location taxonomy
                    const { data: statesData } = await supabase
                        .from('taxonomy_entries')
                        .select('id, name, slug')
                        .eq('taxonomy_id', taxonomyData.id)
                        .is('parent_id', null)
                        .order('name');

                    if (statesData && statesData.length > 0) {
                        // Filter states for Regional Managers and Local Users
                        // based on their assigned locations
                        if (!isSuperAdmin && !isSystemAdmin && user?.locationAssignments?.length) {
                            const assignedLocationIds = new Set(
                                user.locationAssignments.map((la: any) => la.location_id)
                            );

                            // Check if any assignments are directly to states
                            const directStateIds = new Set(
                                statesData.filter((s: any) => assignedLocationIds.has(s.id)).map((s: any) => s.id)
                            );

                            const nonStateIds: string[] = [];
                            assignedLocationIds.forEach((id: string) => {
                                if (!directStateIds.has(id)) {
                                    nonStateIds.push(id);
                                }
                            });
                            if (nonStateIds.length > 0) {
                                const { data: childEntries } = await supabase
                                    .from('taxonomy_entries')
                                    .select('id, parent_id')
                                    .in('id', nonStateIds);

                                if (childEntries) {
                                    for (const entry of childEntries) {
                                        if (entry.parent_id) {
                                            // Check if parent is a state
                                            const parentState = statesData.find((s: any) => s.id === entry.parent_id);
                                            if (parentState) {
                                                directStateIds.add(parentState.id);
                                            } else {
                                                // Parent might be an island (grandparent is state)
                                                // Fetch the parent's parent
                                                const { data: parentEntry } = await supabase
                                                    .from('taxonomy_entries')
                                                    .select('parent_id')
                                                    .eq('id', entry.parent_id)
                                                    .single();
                                                if (parentEntry?.parent_id) {
                                                    const grandparentState = statesData.find((s: any) => s.id === parentEntry.parent_id);
                                                    if (grandparentState) {
                                                        directStateIds.add(grandparentState.id);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            const filteredStates = statesData.filter((s: any) => directStateIds.has(s.id));
                            setStates(filteredStates);
                        } else {
                            setStates(statesData);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load states:', err);
            }
        };

        const loadMediaFolders = async () => {
            try {
                const folders = await getFolders();
                setMediaFolders(folders);
            } catch (err) {
                console.error("Failed to load media folders:", err);
            }
        };

        loadProfile();
        loadLocations();
        loadStates();
        loadMediaFolders();
    }, [isOpen, user, authLoading, isSuperAdmin, isSystemAdmin]);

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
        if (!user) return;
        setIsSaving(true);
        try {
            // If photo was changed (data URL from cropper), upload it first
            let finalPhotoUrl = photoUrl;
            if (photoUrl && photoUrl.startsWith('data:')) {
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
                    default_media_folder_id: defaultMediaFolderId || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            // If we reach here, res.ok was true
            showNotification("Success", "Profile updated successfully.");
            setIsDirty(false); // Reset dirty state on successful save
            onClose(); // Optional: close on save, or just let them see it succeeded
        } catch (err: any) {
            showNotification("Error", err.message || "Failed to save profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || !currentPassword) {
            showNotification("Error", "Please fill in both password fields");
            return;
        }
        if (newPassword.length < 8) {
            showNotification("Error", "New password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification("Error", "New passwords do not match");
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

            showNotification("Success", "Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            showNotification("Error", err.message || "Failed to update password");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleClose = () => onClose();

    // Replaced headerActions with headerChildren directly in SlidePanel

    return (
        <SlidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="My Profile"
            subtitle="Manage your personal information"
            width={1200} // Expanded to accommodate a 3-column layout
            stackLevel={stackLevel}
            offsetSidebar={offsetSidebar}
            headerChildren={
                <div className="flex items-center justify-between pl-4 pr-6 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>
                    <div className="flex items-start overflow-visible gap-1 pt-2 px-2" />
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || !isDirty}
                            className="ml-4 mr-2 md:mr-0 p-[5px] md:w-auto md:h-auto md:px-6 md:py-1.5 flex items-center justify-center text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-black/20"
                        >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Update Profile"
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            {isLoading || authLoading ? (
                <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
            ) : (
                <>
                    <div className="space-y-6">
                        {/* Profile Photo & Basic Info Card */}
                        <div className="bg-surface-input rounded-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Left: Photo + Name & Role */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 col-span-1 md:col-span-1 border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 pr-0 md:pr-6">
                                    {/* Photo */}
                                    <div className="flex-shrink-0">
                                        <label className="text-sm font-medium text-content-secondary block mb-1">Photo</label>
                                        <div className="relative w-24 h-24 mb-3">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    handlePhotoChange(e);
                                                    setIsDirty(true);
                                                }}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={handlePhotoClick}
                                                className="w-full h-full rounded-full overflow-hidden bg-surface-hover transition-colors group border border-ui-border"
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
                                            <div
                                                className="absolute bottom-0 right-0 bg-accent rounded-full p-1.5 shadow-lg border-2"
                                                style={{ borderColor: "var(--surface-input)" }}
                                                onClick={handlePhotoClick}
                                            >
                                                <Upload className="h-3 w-3 text-white" />
                                            </div>
                                        </div>

                                        {/* Inline Display Settings (Under Photo) */}
                                        <div className="flex items-center justify-center gap-2 w-full">
                                            <div className="flex bg-surface-input p-1 rounded-lg gap-1">
                                                <button
                                                    onClick={() => setMode('light')}
                                                    className={`flex items-center justify-center p-1.5 rounded-md transition-all ${mode === 'light' ? 'bg-surface-secondary text-content-primary shadow' : 'text-content-muted hover:text-content-primary'}`}
                                                >
                                                    <Sun className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setMode('dark')}
                                                    className={`flex items-center justify-center p-1.5 rounded-md transition-all ${mode === 'dark' ? 'bg-surface-secondary text-content-primary shadow' : 'text-content-muted hover:text-content-primary'}`}
                                                >
                                                    <Moon className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="relative" ref={colorPickerRef}>
                                                <div className="bg-surface-input p-1 rounded-lg">
                                                    <button
                                                        onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                                        className="flex items-center justify-center p-1.5 rounded-md hover:bg-surface-hover transition-all group"
                                                    >
                                                        <div
                                                            className="h-4 w-4 rounded-md shadow-inner"
                                                            style={{ backgroundColor: accent }}
                                                        />
                                                    </button>
                                                </div>

                                                {/* Color Picker Dropdown */}
                                                {isColorPickerOpen && (
                                                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50">
                                                        <div className="relative z-50 bg-surface-primary border border-ui-border rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                                                            <div className="grid grid-cols-4 gap-1.5 w-[140px]">
                                                                {COLOR_PALETTE.map((c) => (
                                                                    <button
                                                                        key={c.name}
                                                                        onClick={() => {
                                                                            setAccent(c.hex);
                                                                            setIsColorPickerOpen(false);
                                                                        }}
                                                                        className="group flex flex-col items-center justify-center focus:outline-none w-full aspect-square transition-all duration-150"
                                                                    >
                                                                        <div
                                                                            className="w-7 h-7 rounded-md transition-transform duration-150 flex items-center justify-center group-hover:scale-110"
                                                                            style={{ backgroundColor: c.hex }}
                                                                        >
                                                                            {accent === c.hex && (
                                                                                <div className={`h-2.5 w-2.5 rounded-full ${c.name === 'White' || c.hex === '#ffffff' ? 'bg-black/60' : 'bg-white/90'}`} />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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
                                                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-content-muted bg-surface-hover px-2.5 py-1.5 rounded-md border border-ui-border w-full sm:w-auto self-center sm:self-start">
                                                    <Users className="h-3 w-3 text-content-secondary" />
                                                    <span>Managed by <span className="text-content-secondary font-medium">{managerName}</span></span>
                                                </div>
                                            )}

                                        </div>

                                        {/* Default Media Folder Setting */}
                                        <div className="mt-4 w-full text-left max-w-sm">
                                            <label className="text-sm font-medium text-content-secondary block mb-1.5">
                                                Default Media Folder
                                            </label>
                                            <EnhancedSelect
                                                value={defaultMediaFolderId}
                                                onChange={(val) => {
                                                    setDefaultMediaFolderId(val);
                                                    setIsDirty(true);
                                                }}
                                                options={[
                                                    { value: "", label: "Library Root" },
                                                    ...mediaFolders
                                                        .filter(f => f.slug === "images")
                                                        .map(f => ({
                                                            value: f.id,
                                                            label: f.name
                                                        }))
                                                ]}
                                                placeholder="Select a preferred folder..."
                                            />
                                            <p className="text-xs text-content-muted mt-1.5 leading-relaxed">
                                                The Media Library will automatically open to this folder.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Assigned Locations */}
                                <div className="md:col-span-2">
                                    <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-3">
                                        <MapPin className="h-4 w-4 text-accent" />
                                        Assigned Locations
                                    </h3>
                                    {assignedLocations.length === 0 ? (
                                        <p className="text-sm text-content-muted italic">No locations assigned</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                            {(() => {
                                                const states = assignedLocations.filter(loc => loc.parent_id === null);
                                                const itemsPerCol = Math.ceil(states.length / 2);
                                                const columns = [
                                                    states.slice(0, itemsPerCol),
                                                    states.slice(itemsPerCol)
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
                                                                        <span className="text-content-primary font-medium">{state.name}</span>
                                                                        {hasChildren && (
                                                                            <span className="text-xs text-content-muted ml-1.5 bg-white/5 px-1.5 py-0.5 rounded">
                                                                                {children.length}
                                                                            </span>
                                                                        )}
                                                                    </button>

                                                                    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                                                                        <div className="overflow-hidden">
                                                                            {hasChildren && (
                                                                                <div className={`ml-7 mt-1 pb-1 space-y-1`}>
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
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Left Column: Personal Fields */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
                                            <User className="h-4 w-4 text-accent" />
                                            Personal Information
                                        </h3>
                                        <div className="bg-surface-input rounded-lg p-4 space-y-2">
                                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1 min-w-[85px]">
                                                    Full Name
                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => { setFullName(e.target.value); setIsDirty(true); }}
                                                    className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors flex-1 min-w-0 h-8 rounded-md px-3"
                                                    placeholder="Jane Doe"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap min-w-[85px]">
                                                    Nickname
                                                </label>
                                                <input
                                                    type="text"
                                                    value={nickname}
                                                    onChange={(e) => { setNickname(e.target.value); setIsDirty(true); }}
                                                    className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors flex-1 min-w-0 h-8 rounded-md px-3"
                                                    placeholder="Janey"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                                    <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 min-w-[85px]">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        Email
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={user?.email || ""}
                                                        disabled
                                                        className="bg-surface-input border-transparent text-content-muted text-sm text-left opacity-70 cursor-not-allowed flex-1 min-w-0 h-8 rounded-md px-3"
                                                        placeholder="jane@example.com"
                                                    />
                                                </div>
                                                <p className="text-[11px] text-content-muted px-2">
                                                    You can log in using either your email or nickname.
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 min-w-[85px]">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => { setPhone(e.target.value); setIsDirty(true); }}
                                                    className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors flex-1 min-w-0 h-8 rounded-md px-3"
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* Middle Column: Password */}
                                <div className="space-y-6">
                                    <div className="pt-2">
                                        <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
                                            <Lock className="h-4 w-4 text-accent" />
                                            Update Password
                                        </h3>
                                        <div className="bg-surface-input rounded-lg p-4 space-y-2">
                                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all relative">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 min-w-[100px]">
                                                    <Lock className="h-3.5 w-3.5" />
                                                    Current
                                                </label>
                                                <div className="relative flex-1 min-w-0 flex items-center">
                                                    <input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        value={currentPassword}
                                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                                        className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors flex-1 min-w-0 h-8 rounded-md px-3 pr-10"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-2 text-content-muted hover:text-content-secondary"
                                                    >
                                                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all relative">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap min-w-[100px]">
                                                    New
                                                </label>
                                                <div className="relative flex-1 min-w-0 flex items-center">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors flex-1 min-w-0 h-8 rounded-md px-3 pr-10"
                                                        placeholder="(min 8 characters)"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-2 text-content-muted hover:text-content-secondary"
                                                    >
                                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={`flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 rounded-lg transition-all relative ${confirmPassword && confirmPassword !== newPassword ? 'bg-red-500/10' : 'bg-surface-hover'
                                                }`}>
                                                <label className={`text-sm font-medium whitespace-nowrap min-w-[100px] ${confirmPassword && confirmPassword !== newPassword ? 'text-red-400' : 'text-content-secondary'
                                                    }`}>
                                                    Confirm
                                                </label>
                                                <div className="relative flex-1 min-w-0 flex items-center">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className={`bg-surface-input border text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors flex-1 min-w-0 h-8 rounded-md px-3 pr-10 ${confirmPassword && confirmPassword !== newPassword
                                                            ? "border-red-500/30 text-red-50"
                                                            : "border-transparent text-content-primary"
                                                            }`}
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className={`absolute right-2 ${confirmPassword && confirmPassword !== newPassword ? 'text-red-400' : 'text-content-muted hover:text-content-secondary'
                                                            }`}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                            {confirmPassword && confirmPassword !== newPassword && (
                                                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                                            )}
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={handleChangePassword}
                                                    disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors font-medium
                                                    ${isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword
                                                            ? "bg-white/10 text-white/50 cursor-not-allowed border border-white/5"
                                                            : "bg-surface-hover text-content-primary hover:bg-white/10 border border-white/10"
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
                                </div>

                                {/* Right Column: Address */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
                                            <MapPin className="h-4 w-4 text-accent" />
                                            Address
                                        </h3>
                                        <div className="bg-surface-input rounded-lg p-4 space-y-2">
                                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap min-w-[60px]">
                                                    Street
                                                </label>
                                                <input
                                                    type="text"
                                                    value={street}
                                                    onChange={(e) => { setStreet(e.target.value); setIsDirty(true); }}
                                                    className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors flex-1 min-w-0 h-8 rounded-md px-3"
                                                    placeholder="123 Main St"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap min-w-[60px]">
                                                    City
                                                </label>
                                                <input
                                                    type="text"
                                                    value={city}
                                                    onChange={(e) => { setCity(e.target.value); setIsDirty(true); }}
                                                    className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors flex-1 min-w-0 h-8 rounded-md px-3"
                                                    placeholder="City"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                                    <label className="text-sm font-medium text-content-secondary whitespace-nowrap max-w-[40px]">
                                                        State
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={state}
                                                        onChange={(e) => { setState(e.target.value); setIsDirty(true); }}
                                                        className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors w-full min-w-0 h-8 rounded-md px-2"
                                                        placeholder="State"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                                                    <label className="text-sm font-medium text-content-secondary whitespace-nowrap max-w-[40px]">
                                                        ZIP
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={zip}
                                                        onChange={(e) => { setZip(e.target.value); setIsDirty(true); }}
                                                        className="bg-surface-input border-transparent text-content-primary text-sm text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors w-full min-w-0 h-8 rounded-md px-2"
                                                        placeholder="96801"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>



                    <ImageCropModal
                        isOpen={isCropModalOpen}
                        imageUrl={selectedImageUrl}
                        onClose={handleCropCancel}
                        onSave={handleCropSave}
                    />
                </>
            )
            }
        </SlidePanel >
    );
}
