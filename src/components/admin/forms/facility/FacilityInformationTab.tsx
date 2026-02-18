"use client";

import { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import { Building2, MapPin, Phone, Globe, Tags, Check, Ban, Plus, X, Layers, ChevronDown } from "lucide-react";
import type { Facility, Taxonomy } from "@/types";
import { TaxonomySelector } from "../../TaxonomySelector";
import { EntryTree } from "../../taxonomy/EntryTree";
import type { TaxonomyEntry } from "@/lib/services/taxonomyEntryService";

const RichTextEditor = dynamic(
    () => import("@/components/ui/RichTextEditor").then((mod) => mod.RichTextEditor),
    { ssr: false }
);

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

const FEATURED_LABELS = [
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
                {/* Facility Name & Slug */}
                <div className="space-y-2">
                    <label className="text-base font-medium text-white flex items-center gap-1.5">
                        Facility Name
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    </label>

                    <div className="relative">
                        <Building2 className="absolute left-3 top-4 h-5 w-5 text-zinc-500" />
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
                            className="w-full rounded-lg py-3 pl-10 pr-4 text-lg text-white focus:outline-none transition-colors bg-black/30 placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                            placeholder="e.g. Sunrise Care Center"
                            title=""
                        />
                    </div>
                    {/* Slug Display */}
                    <div className="px-1">
                        <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                            <span className="text-zinc-600">slug:</span>
                            {slug || "..."}
                        </p>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-base font-medium text-white">
                        Description
                    </label>
                    <RichTextEditor
                        value={description}
                        onChange={(val) => {
                            setDescription(val);
                            setIsDirty(true);
                        }}
                        placeholder="Describe the facility, services offered, and amenities..."
                        minHeight="min-h-[300px]"
                    />
                </div>

                {/* Promotions - 3 Column Layout */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Featured Facility */}
                    <div className="space-y-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (isFeatured) {
                                    setIsFeatured(false);
                                    setFeaturedLabel("");
                                } else {
                                    setIsFeatured(true);
                                }
                                setIsDirty(true);
                            }}
                            className={`w-full flex items-center gap-3 p-3 transition-all duration-200 ${isFeatured
                                ? "bg-white/5 text-white rounded-t-lg"
                                : "bg-white/5 text-zinc-400 hover:bg-white/10 rounded-lg"
                                }`}
                        >
                            <div className={`p-1 rounded-full ${isFeatured ? "bg-accent/20" : "bg-red-500/10"}`}>
                                {isFeatured ? (
                                    <Check className="h-4 w-4 text-accent" />
                                ) : (
                                    <Ban className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                            <span className="font-medium text-sm">Featured Facility</span>
                        </button>

                        {/* Featured Label Selector */}
                        {isFeatured && (
                            <div className="p-3 bg-white/5 rounded-b-lg -mt-[5px] animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="text-xs font-medium text-zinc-400 mb-2 block">
                                    Label <span className="text-zinc-500 font-normal">(card tag)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    {isCustomLabelMode ? (
                                        <>
                                            <div className="relative flex-1 flex items-center">
                                                <input
                                                    type="text"
                                                    value={featuredLabel}
                                                    onChange={(e) => {
                                                        setFeaturedLabel(e.target.value);
                                                        setIsDirty(true);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && featuredLabel.trim()) {
                                                            setIsCustomLabelMode(false);
                                                        }
                                                        if (e.key === "Escape") {
                                                            setFeaturedLabel("");
                                                            setIsCustomLabelMode(false);
                                                        }
                                                    }}
                                                    className="w-full px-3 py-1.5 pr-14 text-xs bg-black/30 border border-transparent rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                                                    placeholder="Custom label..."
                                                    autoFocus
                                                />
                                                {featuredLabel.trim() && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCustomLabelMode(false)}
                                                        className="absolute right-1.5 px-2 py-0.5 text-xs bg-accent text-white rounded hover:bg-accent-light transition-colors"
                                                    >
                                                        Save
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFeaturedLabel("");
                                                    setIsCustomLabelMode(false);
                                                }}
                                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={showLabelDropdown ? labelSearch : featuredLabel || "None"}
                                                    onChange={(e) => {
                                                        setLabelSearch(e.target.value);
                                                        setShowLabelDropdown(true);
                                                    }}
                                                    onFocus={() => {
                                                        setLabelSearch("");
                                                        setShowLabelDropdown(true);
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => setShowLabelDropdown(false), 150);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            setShowLabelDropdown(false);
                                                            (e.target as HTMLInputElement).blur();
                                                        }
                                                    }}
                                                    placeholder="Search or select..."
                                                    className="w-full pl-3 pr-8 py-1.5 text-xs bg-black/30 border border-transparent rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                                                />
                                                <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none transition-transform duration-200 ${showLabelDropdown ? "rotate-180" : ""}`} />
                                                {showLabelDropdown && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0b1115] rounded-lg shadow-lg max-h-40 overflow-auto z-50">
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setFeaturedLabel("");
                                                                setShowLabelDropdown(false);
                                                                setLabelSearch("");
                                                            }}
                                                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
                                                        >
                                                            None
                                                        </button>
                                                        {FEATURED_LABELS
                                                            .filter(label => label.toLowerCase().includes(labelSearch.toLowerCase()))
                                                            .map(label => (
                                                                <button
                                                                    key={label}
                                                                    type="button"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setFeaturedLabel(label);
                                                                        setShowLabelDropdown(false);
                                                                        setLabelSearch("");
                                                                    }}
                                                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 ${featuredLabel === label ? "text-accent" : "text-white"}`}
                                                                >
                                                                    {label}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsCustomLabelMode(true)}
                                                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Featured Video */}
                    <button
                        type="button"
                        onClick={() => {
                            setHasFeaturedVideo(!hasFeaturedVideo);
                            setIsDirty(true);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 h-fit ${hasFeaturedVideo
                            ? "bg-white/5 text-white"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10"
                            }`}
                    >
                        <div className={`p-1 rounded-full ${hasFeaturedVideo ? "bg-accent/20" : "bg-red-500/10"}`}>
                            {hasFeaturedVideo ? (
                                <Check className="h-4 w-4 text-accent" />
                            ) : (
                                <Ban className="h-4 w-4 text-red-500" />
                            )}
                        </div>
                        <span className="font-medium text-sm">Featured Video</span>
                    </button>

                    {/* Facility of the Month */}
                    <div className="space-y-0">
                        <button
                            type="button"
                            onClick={() => {
                                setIsFacilityOfMonth(!isFacilityOfMonth);
                                setIsDirty(true);
                            }}
                            className={`w-full flex items-center gap-3 p-3 transition-all duration-200 ${isFacilityOfMonth
                                ? "bg-white/5 text-white rounded-t-lg"
                                : "bg-white/5 text-zinc-400 hover:bg-white/10 rounded-lg"
                                }`}
                        >
                            <div className={`p-1 rounded-full ${isFacilityOfMonth ? "bg-accent/20" : "bg-red-500/10"}`}>
                                {isFacilityOfMonth ? (
                                    <Check className="h-4 w-4 text-accent" />
                                ) : (
                                    <Ban className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                            <span className="font-medium text-sm">Facility of Month</span>
                        </button>

                        {/* Facility of Month Description */}
                        {isFacilityOfMonth && (
                            <div className="p-3 bg-white/5 rounded-b-lg -mt-[5px] animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="text-xs font-medium text-zinc-400 mb-2 block">
                                    Description <span className="text-zinc-500 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    ref={(el) => {
                                        if (el) {
                                            el.style.height = 'auto';
                                            el.style.height = el.scrollHeight + 'px';
                                        }
                                    }}
                                    value={facilityOfMonthDescription}
                                    onChange={(e) => {
                                        setFacilityOfMonthDescription(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = target.scrollHeight + 'px';
                                    }}
                                    placeholder="Why this facility is featured..."
                                    rows={2}
                                    className="w-full bg-black/30 rounded-lg py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none resize-none overflow-hidden hover:bg-black/50 focus:bg-black/50 transition-colors"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Middle Column (1/4) */}
            <div className="space-y-6">
                {/* Location Section */}
                <div className="bg-white/5 rounded-lg p-4 space-y-4">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-3">
                        <MapPin className="h-4 w-4 text-accent" />
                        Location
                    </h3>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-white/80 block">Address</label>
                            <input
                                type="text"
                                value={street}
                                onChange={(e) => {
                                    setStreet(e.target.value);
                                    setIsDirty(true);
                                }}
                                className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                                placeholder="Street Address"
                            />
                        </div>
                        <div className="space-y-1">
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => {
                                    setCity(e.target.value);
                                    setIsDirty(true);
                                }}
                                className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                                placeholder="City"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <input
                                    type="text"
                                    list="states-list"
                                    value={state}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        if (val.length <= 2) setState(val);
                                        else setState(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                                    maxLength={20}
                                    placeholder="State"
                                />
                                <datalist id="states-list">
                                    {US_STATES.map((s) => (
                                        <option key={s.code} value={s.code}>{s.name}</option>
                                    ))}
                                </datalist>
                            </div>
                            <div className="space-y-1">
                                <input
                                    type="text"
                                    value={zip}
                                    onChange={(e) => {
                                        setZip(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                                    placeholder="Zip"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Section */}
                <div className="bg-white/5 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-3">
                        <Phone className="h-4 w-4 text-accent" />
                        Contact
                    </h3>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-white/80 block">Phone</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value);
                                setIsDirty(true);
                            }}
                            className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                            placeholder="(555) 123-4567"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-white/80 block">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setIsDirty(true);
                            }}
                            className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                            placeholder="facility@example.com"
                        />
                    </div>
                </div>
            </div>

            {/* Right Column (1/4) */}
            <div className="space-y-6">
                {/* Status Section */}
                <div className="bg-white/5 rounded-lg p-4 space-y-4">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-3">
                        <Globe className="h-4 w-4 text-accent" />
                        Publish Status
                    </h3>
                    <div className="flex bg-white/5 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => {
                                setStatus('published');
                                setIsDirty(true);
                            }}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${status === 'published'
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            Published
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setStatus('draft');
                                setIsDirty(true);
                            }}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${status === 'draft'
                                ? "bg-zinc-600 text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            Draft
                        </button>
                    </div>
                </div>

                {/* Taxonomies Section */}
                {availableTaxonomies.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-4 space-y-4">
                        <h3 className="text-sm font-medium text-white flex items-center gap-2 pb-3">
                            <Tags className="h-4 w-4 text-accent" />
                            Classification
                        </h3>
                        <div className="space-y-3">
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
                                    <div key={taxonomy.id} className="space-y-2">
                                        <TaxonomySelector
                                            taxonomy={taxonomy}
                                            value={selectedId}
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
                                            className="w-fit py-1.5 text-xs text-left px-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            Manage {taxonomy.name}
                                            <Layers className="h-3 w-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
