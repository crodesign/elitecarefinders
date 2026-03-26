"use client";

import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Building2, MapPin, Phone, Globe, Tags, Plus, X, Layers, Star, Video, Trophy, AlignLeft, FileText, Lock, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Facility, Taxonomy } from "@/types";
import { TaxonomySelector } from "../../TaxonomySelector";
import { EntryTree } from "../../taxonomy/EntryTree";
import type { TaxonomyEntry } from "@/lib/services/taxonomyEntryService";
import { US_STATES } from "@/lib/constants/formConstants";
import { SimpleSelect } from "@/components/admin/SimpleSelect";
import { Tooltip } from "@/components/ui/tooltip";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { createClientComponentClient } from "@/lib/supabase";

const RichTextEditor = dynamic(
    () => import("@/components/ui/RichTextEditor").then((mod) => mod.RichTextEditor),
    { ssr: false }
);
const MapPicker = dynamic(() => import("@/components/admin/MapPicker"), { ssr: false });

const LOCK_TOOLTIP = "Only editable by a manager or admin";



const FEATURED_LABELS = [
    "Featured",
    "New Listing",
    "Popular Choice",
    "Staff Pick",
    "Highly Rated",
    "Award Winning",
    "Premium Care",
];

interface TaxonomyWithEntries extends Taxonomy {
    entries: any[];
}

interface FacilityInformationTabProps {
    title: string;
    setTitle: Dispatch<SetStateAction<string>>;
    slug: string;
    setSlug: Dispatch<SetStateAction<string>>;
    description: string;
    setDescription: Dispatch<SetStateAction<string>>;
    excerpt: string;
    setExcerpt: Dispatch<SetStateAction<string>>;
    street: string;
    setStreet: Dispatch<SetStateAction<string>>;
    city: string;
    setCity: Dispatch<SetStateAction<string>>;
    state: string;
    setState: Dispatch<SetStateAction<string>>;
    zip: string;
    setZip: Dispatch<SetStateAction<string>>;
    phone: string;
    setPhone: Dispatch<SetStateAction<string>>;
    email: string;
    setEmail: Dispatch<SetStateAction<string>>;
    status: 'published' | 'draft';
    setStatus: Dispatch<SetStateAction<'published' | 'draft'>>;
    taxonomyEntryIds: string[];
    setTaxonomyEntryIds: Dispatch<SetStateAction<string[]>>;
    availableTaxonomies: TaxonomyWithEntries[];
    isFeatured: boolean;
    setIsFeatured: Dispatch<SetStateAction<boolean>>;
    hasFeaturedVideo: boolean;
    setHasFeaturedVideo: Dispatch<SetStateAction<boolean>>;
    isFacilityOfMonth: boolean;
    setIsFacilityOfMonth: Dispatch<SetStateAction<boolean>>;
    featuredLabel: string;
    setFeaturedLabel: Dispatch<SetStateAction<string>>;
    isCustomLabelMode: boolean;
    setIsCustomLabelMode: Dispatch<SetStateAction<boolean>>;
    facilityOfMonthDescription: string;
    setFacilityOfMonthDescription: Dispatch<SetStateAction<string>>;
    coordLat: number | null;
    setCoordLat: Dispatch<SetStateAction<number | null>>;
    coordLng: number | null;
    setCoordLng: Dispatch<SetStateAction<number | null>>;
    setIsDirty: (value: boolean) => void;
    onSave?: (lat: number | null, lng: number | null) => Promise<void>;
    setManagingTaxonomy: Dispatch<SetStateAction<Taxonomy | null>>;
    isLocalUser?: boolean;
    currentId?: string;
}

export function FacilityInformationTab({
    title, setTitle,
    slug, setSlug,
    description, setDescription,
    excerpt, setExcerpt,
    street, setStreet,
    city, setCity,
    state, setState,
    zip, setZip,
    phone, setPhone,
    email, setEmail,
    status, setStatus,
    taxonomyEntryIds, setTaxonomyEntryIds,
    availableTaxonomies,
    isFeatured, setIsFeatured,
    hasFeaturedVideo, setHasFeaturedVideo,
    isFacilityOfMonth, setIsFacilityOfMonth,
    featuredLabel, setFeaturedLabel,
    isCustomLabelMode, setIsCustomLabelMode,
    facilityOfMonthDescription, setFacilityOfMonthDescription,
    coordLat, setCoordLat,
    coordLng, setCoordLng,
    setIsDirty,
    onSave,
    setManagingTaxonomy,
    isLocalUser = false,
    currentId,
}: FacilityInformationTabProps) {
    const [conflictName, setConflictName] = useState<string | null>(null);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const [geocodeError, setGeocodeError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    // Local modal state — isolated from form dirty state until "Update" is clicked
    const [localLat, setLocalLat] = useState<number | null>(null);
    const [localLng, setLocalLng] = useState<number | null>(null);

    useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

    async function handleGeocode() {
        const query = [street, city, state, zip].filter(Boolean).join(', ');
        if (!query) return;
        setGeocoding(true);
        setGeocodeError(null);
        try {
            const res = await fetch(`/api/admin/geocode?q=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                setLocalLat(data.lat);
                setLocalLng(data.lng);
            } else {
                setGeocodeError("No result found. Try a more complete address.");
            }
        } catch {
            setGeocodeError("Geocode request failed.");
        }
        setGeocoding(false);
    }

    useEffect(() => {
        if (showMapPicker) {
            setLocalLat(coordLat);
            setLocalLng(coordLng);
            if (coordLat === null) {
                handleGeocode();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showMapPicker]);

    async function handleFacilityOfMonthToggle(checked: boolean) {
        if (!checked) {
            setIsFacilityOfMonth(false);
            setIsDirty(true);
            return;
        }
        try {
            const supabase = createClientComponentClient();
            const { data } = await supabase
                .from('facilities')
                .select('title')
                .eq('is_facility_of_month', true)
                .neq('id', currentId || '00000000-0000-0000-0000-000000000000')
                .limit(1);
            const existing = Array.isArray(data) ? data[0] : null;
            if (existing?.title) {
                setConflictName(existing.title);
            } else {
                setIsFacilityOfMonth(true);
                setIsDirty(true);
            }
        } catch {
            setIsFacilityOfMonth(true);
            setIsDirty(true);
        }
    }

    return (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
            {/* Col B — Name + Description (order-2, wide) */}
            <div className="order-2 lg:col-span-2 flex flex-col h-full min-h-0">
                <div className="bg-surface-input rounded-lg p-[5px] space-y-4 flex flex-col flex-1 min-h-0">
                    {/* Facility Name & Slug */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                <span className="sm:hidden">Name</span><span className="hidden sm:inline">Facility Name</span>
                                <Tooltip content={LOCK_TOOLTIP} side="right"><Lock className="h-3 w-3 text-content-muted cursor-help" /></Tooltip>
                                {!isLocalUser && <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>}
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                readOnly={isLocalUser}
                                onChange={(e) => {
                                    if (isLocalUser) return;
                                    const newTitle = e.target.value;
                                    setTitle(newTitle);
                                    setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                                    setIsDirty(true);
                                }}
                                className={`form-input px-3 h-8 flex-1 ${isLocalUser ? 'opacity-60 cursor-default' : ''}`}
                                placeholder="e.g. Sunrise Care Center"
                            />
                        </div>
                        {/* Slug Display */}
                        <div className="px-1">
                            <p className="text-[10px] text-content-muted font-mono flex items-center gap-1">
                                <span className="text-content-muted">slug:</span>
                                {slug || "..."}
                            </p>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col flex-1 min-h-0 gap-2">
                        <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px] shrink-0">
                            <AlignLeft className="h-4 w-4 text-accent" />
                            Description
                        </h3>
                        <RichTextEditor
                            value={description}
                            onChange={(val) => {
                                setDescription(val);
                                setIsDirty(true);
                            }}
                            placeholder="Describe the facility, services offered, and amenities..."
                            minHeight="min-h-[140px]"
                            className="flex-1 min-h-0 bg-surface-input text-content-primary placeholder-content-muted border-none"
                        />
                    </div>

                    {/* Excerpt */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-content-secondary flex items-center gap-2 pl-1">
                            <FileText className="h-4 w-4 text-accent" />
                            Excerpt / Summary
                        </label>
                        <textarea
                            value={excerpt}
                            onChange={(e) => { setExcerpt(e.target.value); setIsDirty(true); }}
                            className="form-input text-sm p-3 rounded-lg resize-y min-h-[80px]"
                            placeholder="Short description for preview cards..."
                        />
                    </div>
                </div>
            </div>



            {/* Col A — Classification + Location + Contact (order-1) */}
            <div className="order-1 space-y-[10px] lg:overflow-y-auto">
                {/* Classification Section */}
                {availableTaxonomies.length > 0 && (
                    <div className="bg-surface-input rounded-lg p-[5px]">
                        <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                            <Tags className="h-4 w-4 text-accent" />
                            Classification
                            <Tooltip content={LOCK_TOOLTIP} side="right"><Lock className="h-3 w-3 text-content-muted cursor-help" /></Tooltip>
                        </h3>
                        <div className="space-y-2">
                            {availableTaxonomies.map(taxonomy => {
                                const findEntryInTree = (entries: any[], id: string): boolean => {
                                    return entries.some(e => {
                                        if (e.id === id) return true;
                                        if (e.children) return findEntryInTree(e.children, id);
                                        return false;
                                    });
                                };
                                const selectedId = taxonomyEntryIds.find(id =>
                                    findEntryInTree(taxonomy.entries, id)
                                ) || "";
                                const findNameInTree = (entries: any[], id: string): string => {
                                    for (const e of entries) {
                                        if (e.id === id) return e.name;
                                        if (e.children) { const n = findNameInTree(e.children, id); if (n) return n; }
                                    }
                                    return "";
                                };
                                return (
                                    <div key={taxonomy.id} className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                        <label className="text-sm font-medium text-content-secondary flex items-center gap-1.5 pl-[5px]">
                                            <span className="sm:hidden">{taxonomy.singularName.includes("Type") ? "Type" : taxonomy.singularName}</span>
                                            <span className="hidden sm:inline">{taxonomy.singularName}</span>
                                            {!isLocalUser && (taxonomy.singularName === "Facility Type" || taxonomy.singularName === "Location") && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                            )}
                                        </label>
                                        {isLocalUser ? (
                                            <span className="text-sm text-content-secondary opacity-60 pr-2">
                                                {selectedId ? findNameInTree(taxonomy.entries, selectedId) : "—"}
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <TaxonomySelector
                                                    taxonomy={taxonomy}
                                                    value={selectedId}
                                                    className="w-44 text-sm"
                                                    onChange={(newId) => {
                                                        const otherIds = taxonomyEntryIds.filter(id =>
                                                            !findEntryInTree(taxonomy.entries, id)
                                                        );
                                                        if (newId) {
                                                            setTaxonomyEntryIds([...otherIds, newId]);
                                                        } else {
                                                            setTaxonomyEntryIds(otherIds);
                                                        }
                                                        setIsDirty(true);
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setManagingTaxonomy(taxonomy)}
                                                    className="p-1.5 text-content-muted hover:text-content-primary hover:bg-surface-hover rounded-md transition-colors"
                                                    title={`Manage ${taxonomy.singularName}`}
                                                >
                                                    <Layers className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Location Section */}
                <div className="bg-surface-input rounded-lg p-[5px]">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                            <MapPin className="h-4 w-4 text-accent" />
                            Location
                            <Tooltip content={LOCK_TOOLTIP} side="right"><Lock className="h-3 w-3 text-content-muted cursor-help" /></Tooltip>
                        </h3>
                        {!isLocalUser && (street || city) && (
                            <button
                                type="button"
                                onClick={() => setShowMapPicker(v => !v)}
                                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-all ${showMapPicker ? "bg-accent text-white" : coordLat !== null ? "bg-green-600/10 text-green-700 hover:bg-green-600/20" : "text-content-muted hover:text-content-secondary hover:bg-surface-hover"}`}
                            >
                                <MapPin className="h-3 w-3" />
                                {coordLat !== null ? "Map Pinned" : "Adjust Map"}
                            </button>
                        )}
                    </div>

                    <div className={`space-y-2 ${isLocalUser ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Street</label>
                            <input
                                type="text"
                                value={street}
                                readOnly={isLocalUser}
                                onChange={(e) => { if (!isLocalUser) { setStreet(e.target.value); setIsDirty(true); } }}
                                className={`form-input text-left w-48 h-8 rounded-md px-3 ${isLocalUser ? 'cursor-default' : ''}`}
                                placeholder="Street address"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">City</label>
                            <input
                                type="text"
                                value={city}
                                readOnly={isLocalUser}
                                onChange={(e) => { if (!isLocalUser) { setCity(e.target.value); setIsDirty(true); } }}
                                className={`form-input text-left w-48 h-8 rounded-md px-3 ${isLocalUser ? 'cursor-default' : ''}`}
                                placeholder="City"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">State</label>
                                {isLocalUser ? (
                                    <span className="text-sm text-content-secondary w-32 px-2">{state || "—"}</span>
                                ) : (
                                    <SimpleSelect
                                        value={state}
                                        onChange={(val) => { setState(val); setIsDirty(true); }}
                                        options={US_STATES.map(s => s.name)}
                                        placeholder="State..."
                                        className="w-32 h-8 flex items-center justify-between text-sm text-left"
                                    />
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Zip</label>
                                <input
                                    type="text"
                                    value={zip}
                                    readOnly={isLocalUser}
                                    onChange={(e) => { if (!isLocalUser) { setZip(e.target.value); setIsDirty(true); } }}
                                    className={`form-input text-left w-20 h-8 rounded-md px-2 ${isLocalUser ? 'cursor-default' : ''}`}
                                    placeholder="Zip"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Contact Section */}
                <div className="bg-surface-input rounded-lg p-[5px]">
                    <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                        <Phone className="h-4 w-4 text-accent" />
                        Contact
                    </h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Phone</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value);
                                    setIsDirty(true);
                                }}
                                className="form-input text-left w-40 h-8 rounded-md px-3"
                                placeholder="(555) 123-4567"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setIsDirty(true);
                                }}
                                className="form-input text-left w-40 h-8 rounded-md px-3"
                                placeholder="facility@example.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Promotions */}
                <div className="bg-surface-input rounded-lg p-[5px] space-y-2">
                    <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                        <Star className="h-4 w-4 text-accent" />
                        Promotions
                        <Tooltip content={LOCK_TOOLTIP} side="right"><Lock className="h-3 w-3 text-content-muted cursor-help" /></Tooltip>
                    </h3>
                    {/* Featured Facility */}
                    <div className={`bg-surface-hover rounded-lg transition-all ${isLocalUser ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="flex items-center justify-between gap-2 p-[5px]">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                <Star className={`h-3.5 w-3.5 flex-shrink-0 ${isFeatured ? 'text-accent fill-accent' : 'text-content-secondary'}`} />
                                Featured Facility
                            </label>
                            <Switch
                                checked={isFeatured}
                                onCheckedChange={(checked) => {
                                    if (!checked) {
                                        setIsFeatured(false);
                                        setFeaturedLabel("");
                                    } else {
                                        setIsFeatured(true);
                                        if (!featuredLabel) setFeaturedLabel("Featured");
                                    }
                                    setIsDirty(true);
                                }}
                                className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
                            />
                        </div>
                        {isFeatured && (
                            <div className="flex items-center justify-between gap-2 p-[5px] border-ui-border animate-in fade-in slide-in-from-top-1 duration-150">
                                <label className="text-xs font-medium text-content-muted whitespace-nowrap pl-[5px]">Featured Label</label>
                                <div className="flex items-center gap-1.5">
                                    {isCustomLabelMode ? (
                                        <>
                                            <input
                                                type="text"
                                                value={featuredLabel}
                                                onChange={(e) => { setFeaturedLabel(e.target.value); setIsDirty(true); }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && featuredLabel.trim()) setIsCustomLabelMode(false);
                                                    if (e.key === "Escape") { setFeaturedLabel(""); setIsCustomLabelMode(false); }
                                                }}
                                                className="form-input w-36 px-3 h-8 text-sm"
                                                placeholder="Custom label..."
                                                autoFocus
                                            />
                                            {featuredLabel.trim() && (
                                                <button type="button" onClick={() => setIsCustomLabelMode(false)}
                                                    className="px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light transition-colors">Save</button>
                                            )}
                                            <button type="button" onClick={() => { setFeaturedLabel(""); setIsCustomLabelMode(false); }}
                                                className="p-1 text-content-secondary hover:text-content-primary transition-colors">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <SimpleSelect
                                                value={featuredLabel}
                                                onChange={(val) => { setFeaturedLabel(val); setIsDirty(true); }}
                                                options={FEATURED_LABELS}
                                                placeholder="Select..."
                                                className="w-36 text-sm"
                                            />
                                            <button type="button" onClick={() => setIsCustomLabelMode(true)}
                                                className="p-1 text-content-secondary hover:text-content-primary hover:bg-surface-hover rounded transition-colors">
                                                <Plus className="h-3.5 w-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Featured Video */}
                    <div className={`flex items-center justify-between gap-2 p-[3px] bg-surface-hover rounded-lg transition-all ${isLocalUser ? 'opacity-60 pointer-events-none' : ''}`}>
                        <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                            <Video className={`h-3.5 w-3.5 flex-shrink-0 ${hasFeaturedVideo ? 'text-accent' : 'text-content-secondary'}`} />
                            Featured Video
                        </label>
                        <Switch
                            checked={hasFeaturedVideo}
                            onCheckedChange={(checked) => { setHasFeaturedVideo(checked); setIsDirty(true); }}
                            className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
                        />
                    </div>

                    {/* Facility of the Month */}
                    <div className={`bg-surface-hover rounded-lg transition-all ${isLocalUser ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className="flex items-center justify-between gap-2 p-[5px]">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                <Trophy className={`h-3.5 w-3.5 flex-shrink-0 ${isFacilityOfMonth ? 'text-accent' : 'text-content-secondary'}`} />
                                Facility of Month
                            </label>
                            <Switch
                                checked={isFacilityOfMonth}
                                onCheckedChange={handleFacilityOfMonthToggle}
                                className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
                            />
                        </div>
                        {isFacilityOfMonth && (
                            <div className="flex flex-col gap-1.5 p-[5px] animate-in fade-in slide-in-from-top-1 duration-150">
                                <label className="text-xs font-medium text-content-muted pl-[5px]">Description</label>
                                <textarea
                                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                    value={facilityOfMonthDescription}
                                    onChange={(e) => { setFacilityOfMonthDescription(e.target.value); setIsDirty(true); }}
                                    onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                                    placeholder="Why this facility is featured..."
                                    rows={3}
                                    className="form-input w-full py-1 px-2 text-xs resize-none overflow-hidden"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
            <ConfirmationModal
                isOpen={!!conflictName}
                onClose={() => setConflictName(null)}
                onConfirm={() => { setIsFacilityOfMonth(true); setIsDirty(true); setConflictName(null); }}
                title="Replace Facility of the Month?"
                message={<><strong>{conflictName}</strong> is currently set as Facility of the Month. Do you want to replace it with this facility?</>}
                confirmLabel="Replace"
            />
            {mounted && showMapPicker && !isLocalUser && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 backdrop-blur-sm transition-opacity"
                        style={{ backgroundColor: 'var(--glass-overlay)' }}
                        onClick={() => setShowMapPicker(false)}
                    />
                    <div className="relative w-full max-w-lg bg-surface-secondary rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-content-primary flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-accent" />
                                Adjust Map Position
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowMapPicker(false)}
                                className="text-content-secondary hover:text-content-primary transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleGeocode}
                                disabled={geocoding}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-surface-hover hover:bg-surface-input text-content-secondary transition-colors disabled:opacity-50"
                            >
                                {geocoding ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                                Geocode from address
                            </button>
                            {geocodeError && <p className="text-[10px] text-red-500">{geocodeError}</p>}
                            {localLat !== null && localLng !== null && (
                                <>
                                    <MapPicker
                                        lat={localLat}
                                        lng={localLng}
                                        onChange={(lat, lng) => { setLocalLat(lat); setLocalLng(lng); }}
                                    />
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[10px] text-content-muted">
                                            Drag pin or click map to adjust.{' '}
                                            <button
                                                type="button"
                                                onClick={() => { setLocalLat(null); setLocalLng(null); }}
                                                className="text-accent hover:underline"
                                            >
                                                Clear
                                            </button>
                                            {' '}to revert to auto-geocoding.
                                        </p>
                                        <p className="text-[10px] font-mono text-content-muted">{localLat.toFixed(5)}, {localLng.toFixed(5)}</p>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setCoordLat(localLat);
                                        setCoordLng(localLng);
                                        setIsDirty(true);
                                        setShowMapPicker(false);
                                        await onSave?.(localLat, localLng);
                                    }}
                                    className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

