"use client";

import { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { Building2, MapPin, Phone, Globe, Tags, Check, Ban, Plus, X, Layers, ChevronDown, Star, Video, Trophy, AlignLeft, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Facility, Taxonomy } from "@/types";
import { TaxonomySelector } from "../../TaxonomySelector";
import { EntryTree } from "../../taxonomy/EntryTree";
import type { TaxonomyEntry } from "@/lib/services/taxonomyEntryService";

const RichTextEditor = dynamic(
    () => import("@/components/ui/RichTextEditor").then((mod) => mod.RichTextEditor),
    { ssr: false }
);

import { US_STATES } from "@/lib/constants/formConstants";
import { SimpleSelect } from "@/components/admin/SimpleSelect";



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
    taxonomyIds: string[];
    setTaxonomyIds: Dispatch<SetStateAction<string[]>>;
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
    labelSearch: string;
    setLabelSearch: Dispatch<SetStateAction<string>>;
    showLabelDropdown: boolean;
    setShowLabelDropdown: Dispatch<SetStateAction<boolean>>;
    facilityOfMonthDescription: string;
    setFacilityOfMonthDescription: Dispatch<SetStateAction<string>>;
    setIsDirty: (value: boolean) => void;
    setManagingTaxonomy: Dispatch<SetStateAction<Taxonomy | null>>;
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
    taxonomyIds, setTaxonomyIds,
    availableTaxonomies,
    isFeatured, setIsFeatured,
    hasFeaturedVideo, setHasFeaturedVideo,
    isFacilityOfMonth, setIsFacilityOfMonth,
    featuredLabel, setFeaturedLabel,
    isCustomLabelMode, setIsCustomLabelMode,
    labelSearch, setLabelSearch,
    showLabelDropdown, setShowLabelDropdown,
    facilityOfMonthDescription, setFacilityOfMonthDescription,
    setIsDirty,
    setManagingTaxonomy,
}: FacilityInformationTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Col B — Name + Description (order-2, wide) */}
            <div className="order-2 lg:col-span-2 flex flex-col">
                <div className="bg-surface-input rounded-lg p-[5px] space-y-4 flex flex-col flex-1">
                    {/* Facility Name & Slug */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                <span className="sm:hidden">Name</span><span className="hidden sm:inline">Facility Name</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                            </label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => {
                                    const newTitle = e.target.value;
                                    setTitle(newTitle);
                                    setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                                    setIsDirty(true);
                                }}
                                className="form-input px-3 h-8 flex-1"
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
            <div className="order-1 space-y-[10px]">
                {/* Classification Section */}
                {availableTaxonomies.length > 0 && (
                    <div className="bg-surface-input rounded-lg p-[5px]">
                        <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                            <Tags className="h-4 w-4 text-accent" />
                            Classification
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
                                const selectedId = taxonomyIds.find(id =>
                                    findEntryInTree(taxonomy.entries, id)
                                ) || "";
                                return (
                                    <div key={taxonomy.id} className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                        <label className="text-sm font-medium text-content-secondary flex items-center gap-1.5 pl-[5px]">
                                            <span className="sm:hidden">{taxonomy.singularName.includes("Type") ? "Type" : taxonomy.singularName}</span>
                                            <span className="hidden sm:inline">{taxonomy.singularName}</span>
                                            {(taxonomy.singularName === "Facility Type" || taxonomy.singularName === "Location") && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                            )}
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <TaxonomySelector
                                                taxonomy={taxonomy}
                                                value={selectedId}
                                                className="w-44 text-sm"
                                                onChange={(newId) => {
                                                    const otherIds = taxonomyIds.filter(id =>
                                                        !findEntryInTree(taxonomy.entries, id)
                                                    );
                                                    if (newId) {
                                                        setTaxonomyIds([...otherIds, newId]);
                                                    } else {
                                                        setTaxonomyIds(otherIds);
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
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Location Section */}
                <div className="bg-surface-input rounded-lg p-[5px]">
                    <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                        <MapPin className="h-4 w-4 text-accent" />
                        Location
                    </h3>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Street</label>
                            <input
                                type="text"
                                value={street}
                                onChange={(e) => {
                                    setStreet(e.target.value);
                                    setIsDirty(true);
                                }}
                                className="form-input text-left w-48 h-8 rounded-md px-3"
                                placeholder="Street address"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">City</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => {
                                    setCity(e.target.value);
                                    setIsDirty(true);
                                }}
                                className="form-input text-left w-48 h-8 rounded-md px-3"
                                placeholder="City"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all flex-1">
                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">State</label>
                                <SimpleSelect
                                    value={state}
                                    onChange={(val) => { setState(val); setIsDirty(true); }}
                                    options={US_STATES.map(s => s.name)}
                                    placeholder="State..."
                                    className="w-32 h-8 flex items-center justify-between px-2 text-sm text-left"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
                                <label className="text-sm font-medium text-content-secondary whitespace-nowrap pl-[5px]">Zip</label>
                                <input
                                    type="text"
                                    value={zip}
                                    onChange={(e) => {
                                        setZip(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    className="form-input text-left w-20 h-8 rounded-md px-2"
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
                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
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
                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
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
            </div>

            {/* Col C — Status + Classification + Promotions (order-3) */}
            <div className="order-3 space-y-[10px]">


                {/* Promotions */}
                <div className="space-y-2">
                    {/* Featured Facility */}
                    <div className="bg-surface-hover rounded-lg transition-all">
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
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={showLabelDropdown ? labelSearch : featuredLabel || "None"}
                                                    onChange={(e) => { setLabelSearch(e.target.value); setShowLabelDropdown(true); }}
                                                    onFocus={() => { setLabelSearch(""); setShowLabelDropdown(true); }}
                                                    onBlur={() => setTimeout(() => setShowLabelDropdown(false), 150)}
                                                    onKeyDown={(e) => { if (e.key === "Escape") { setShowLabelDropdown(false); (e.target as HTMLInputElement).blur(); } }}
                                                    placeholder="Select..."
                                                    className="form-input w-36 pl-3 pr-8 h-8 text-sm"
                                                />
                                                <ChevronDown className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-content-muted pointer-events-none transition-transform duration-200 ${showLabelDropdown ? "rotate-180" : ""}`} />
                                                {showLabelDropdown && (
                                                    <div className="absolute top-full right-0 mt-1 dropdown-menu z-50 min-w-[150px]">
                                                        <div className="overflow-y-auto flex-1 p-1">
                                                            <button type="button" onMouseDown={(e) => { e.preventDefault(); setFeaturedLabel(""); setIsDirty(true); setShowLabelDropdown(false); setLabelSearch(""); }}
                                                                className="w-full text-left px-2 py-1.5 rounded text-sm text-content-secondary hover:bg-surface-hover hover:text-content-primary flex items-center gap-2">
                                                                <Ban className="h-3.5 w-3.5" />
                                                                <span>None</span>
                                                                {!featuredLabel && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                                            </button>
                                                            {FEATURED_LABELS.filter(label => label.toLowerCase().includes(labelSearch.toLowerCase())).map(label => (
                                                                <button key={label} type="button"
                                                                    onMouseDown={(e) => { e.preventDefault(); setFeaturedLabel(label); setShowLabelDropdown(false); setLabelSearch(""); }}
                                                                    className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center transition-colors ${featuredLabel === label ? "bg-surface-hover text-content-primary" : "text-content-secondary hover:bg-surface-hover hover:text-content-primary"}`}>
                                                                    <span>{label}</span>
                                                                    {featuredLabel === label && <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>}
                                                                </button>
                                                            ))}
                                                            {!FEATURED_LABELS.includes(featuredLabel) && featuredLabel && (
                                                                <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowLabelDropdown(false); setLabelSearch(""); }}
                                                                    className="w-full text-left px-2 py-1.5 rounded text-sm flex items-center bg-surface-hover text-content-primary">
                                                                    <span>{featuredLabel} (custom)</span>
                                                                    <span className="ml-auto flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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
                    <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg transition-all">
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
                    <div className="bg-surface-hover rounded-lg transition-all">
                        <div className="flex items-center justify-between gap-2 p-[5px]">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                <Trophy className={`h-3.5 w-3.5 flex-shrink-0 ${isFacilityOfMonth ? 'text-accent' : 'text-content-secondary'}`} />
                                Facility of Month
                            </label>
                            <Switch
                                checked={isFacilityOfMonth}
                                onCheckedChange={(checked) => { setIsFacilityOfMonth(checked); setIsDirty(true); }}
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
    );
}



