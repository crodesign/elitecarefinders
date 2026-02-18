import { Dispatch, SetStateAction } from "react";
import { Check, Ban, X, ChevronDown, Plus, MapPin, Phone, Globe, Tags, Layers, Hash, Home } from "lucide-react";
import { Taxonomy } from "@/types";
import { TaxonomySelector } from "../../TaxonomySelector";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { US_STATES, FEATURED_LABELS } from "@/lib/constants/formConstants";

export interface HomeInformationTabProps {
    // State props
    displayReferenceNumber: boolean;
    setDisplayReferenceNumber: (value: boolean) => void;
    title: string;
    setTitle: (value: string) => void;
    slug: string;
    setSlug: (value: string) => void;
    description: string;
    setDescription: (value: string) => void;
    isFeatured: boolean;
    setIsFeatured: (value: boolean) => void;
    featuredLabel: string;
    setFeaturedLabel: (value: string) => void;
    isCustomLabelMode: boolean;
    setIsCustomLabelMode: (value: boolean) => void;
    showLabelDropdown: boolean;
    setShowLabelDropdown: (value: boolean) => void;
    labelSearch: string;
    setLabelSearch: (value: string) => void;
    hasFeaturedVideo: boolean;
    setHasFeaturedVideo: (value: boolean) => void;
    isHomeOfMonth: boolean;
    setIsHomeOfMonth: (value: boolean) => void;
    homeOfMonthDescription: string;
    setHomeOfMonthDescription: (value: string) => void;
    showAddress: boolean;
    setShowAddress: (value: boolean) => void;
    street: string;
    setStreet: (value: string) => void;
    city: string;
    setCity: (value: string) => void;
    state: string;
    setState: (value: string) => void;
    zip: string;
    setZip: (value: string) => void;
    phone: string;
    setPhone: (value: string) => void;
    email: string;
    setEmail: (value: string) => void;
    status: 'draft' | 'published' | 'archived';
    setStatus: (value: 'draft' | 'published' | 'archived') => void;
    availableTaxonomies: any[]; // Using any[] to match HomeForm structure
    taxonomyEntryIds: string[];
    setTaxonomyEntryIds: (value: string[]) => void;
    setManagingTaxonomy: (taxonomy: Taxonomy | null) => void;
    setIsDirty: (value: boolean) => void;
}

export function HomeInformationTab({
    displayReferenceNumber, setDisplayReferenceNumber,
    title, setTitle,
    slug, setSlug,
    description, setDescription,
    isFeatured, setIsFeatured,
    featuredLabel, setFeaturedLabel,
    isCustomLabelMode, setIsCustomLabelMode,
    showLabelDropdown, setShowLabelDropdown,
    labelSearch, setLabelSearch,
    hasFeaturedVideo, setHasFeaturedVideo,
    isHomeOfMonth, setIsHomeOfMonth,
    homeOfMonthDescription, setHomeOfMonthDescription,
    showAddress, setShowAddress,
    street, setStreet,
    city, setCity,
    state, setState,
    zip, setZip,
    phone, setPhone,
    email, setEmail,
    status, setStatus,
    availableTaxonomies,
    taxonomyEntryIds, setTaxonomyEntryIds,
    setManagingTaxonomy,
    setIsDirty
}: HomeInformationTabProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
                {/* Home Name & Slug */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-base font-medium text-white flex items-center gap-1.5">
                            {displayReferenceNumber ? "Reference Number" : "Home Name"}
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                        </label>

                        {/* Display Mode Toggle */}
                        <div className="flex items-center bg-white/5 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => setDisplayReferenceNumber(true)}
                                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${displayReferenceNumber
                                    ? "bg-accent text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                            >
                                No.
                            </button>
                            <button
                                type="button"
                                onClick={() => setDisplayReferenceNumber(false)}
                                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${!displayReferenceNumber
                                    ? "bg-accent text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                            >
                                Name
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        {displayReferenceNumber ? (
                            <Hash className="absolute left-3 top-4 h-5 w-5 text-zinc-500" />
                        ) : (
                            <Home className="absolute left-3 top-4 h-5 w-5 text-zinc-500" />
                        )}
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => {
                                const newTitle = e.target.value;
                                setTitle(newTitle);
                                // Always update slug when title changes
                                setSlug(newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                                setIsDirty(true);
                            }}
                            className="w-full rounded-lg py-3 pl-10 pr-4 text-lg text-white focus:outline-none transition-colors bg-black/30 placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                            placeholder={displayReferenceNumber ? "Ref-12345" : "e.g. Sunnyvale Estate"}
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
                        placeholder="Describe the facility location, amenities, and care offered..."
                        minHeight="min-h-[300px]"
                    />
                </div>

                {/* Promotions Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-start">
                    {/* Featured Home */}
                    <div className="space-y-0">
                        <button
                            type="button"
                            onClick={() => {
                                const newValue = !isFeatured;
                                setIsFeatured(newValue);
                                setIsDirty(true);
                                if (newValue) {
                                    // Default to "Featured Home" when turning on
                                    if (!featuredLabel) {
                                        setFeaturedLabel("Featured Home");
                                    }
                                } else {
                                    // Clear label when turning off
                                    setFeaturedLabel("");
                                }
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
                            <span className="font-medium text-sm">Featured Home</span>
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
                                                {/* Save button inside field */}
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
                                            {/* X close button outside */}
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
                                            {/* Searchable dropdown */}
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
                                                                setIsDirty(true);
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
                                                        {/* Show custom value if set and not in list */}
                                                        {!FEATURED_LABELS.includes(featuredLabel) && featuredLabel && (
                                                            <button
                                                                type="button"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setShowLabelDropdown(false);
                                                                    setLabelSearch("");
                                                                }}
                                                                className="w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-white/10"
                                                            >
                                                                {featuredLabel} (custom)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Plus button to switch to custom mode */}
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
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${hasFeaturedVideo
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

                    {/* Home of the Month */}
                    <div className="space-y-0">
                        <button
                            type="button"
                            onClick={() => {
                                setIsHomeOfMonth(!isHomeOfMonth);
                                setIsDirty(true);
                            }}
                            className={`w-full flex items-center gap-3 p-3 transition-all duration-200 ${isHomeOfMonth
                                ? "bg-white/5 text-white rounded-t-lg"
                                : "bg-white/5 text-zinc-400 hover:bg-white/10 rounded-lg"
                                }`}
                        >
                            <div className={`p-1 rounded-full ${isHomeOfMonth ? "bg-accent/20" : "bg-red-500/10"}`}>
                                {isHomeOfMonth ? (
                                    <Check className="h-4 w-4 text-accent" />
                                ) : (
                                    <Ban className="h-4 w-4 text-red-500" />
                                )}
                            </div>
                            <span className="font-medium text-sm">Home of Month</span>
                        </button>

                        {/* Home of Month Description */}
                        {isHomeOfMonth && (
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
                                    value={homeOfMonthDescription}
                                    onChange={(e) => {
                                        setHomeOfMonthDescription(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = target.scrollHeight + 'px';
                                    }}
                                    placeholder="Why this home is featured..."
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
                    <div className="flex items-center justify-between pb-3">
                        <h3 className="text-sm font-medium text-white flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-accent" />
                            Location
                        </h3>
                        {/* Show Address Toggle */}
                        <div className="flex items-center bg-black/30 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddress(false);
                                    setIsDirty(true);
                                }}
                                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${!showAddress
                                    ? "bg-accent text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                            >
                                Private
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddress(true);
                                    setIsDirty(true);
                                }}
                                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${showAddress
                                    ? "bg-accent text-white shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300"
                                    }`}
                            >
                                Public
                            </button>
                        </div>
                    </div>

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
                                placeholder="Street"
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
                                const val = e.target.value.replace(/\D/g, "");
                                let formatted = val;
                                if (val.length > 0) {
                                    if (val.length <= 3) formatted = val;
                                    else if (val.length <= 6) formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                                    else formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6, 10)}`;
                                }
                                setPhone(formatted);
                                setIsDirty(true);
                            }}
                            className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                            placeholder="(555) 123-4567"
                            maxLength={14}
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
                            placeholder="contact@example.com"
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
                                // Recursively search for entry in tree
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

                                return (
                                    <div key={taxonomy.id} className="space-y-2">
                                        <TaxonomySelector
                                            taxonomy={taxonomy}
                                            value={selectedId}
                                            onChange={(newId: string) => {
                                                // Remove any existing entry from this taxonomy
                                                const otherIds = taxonomyEntryIds.filter(id =>
                                                    !findEntryInTree(taxonomy.entries, id)
                                                );
                                                // Add new ID if selected (not empty)
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
        </div >
    );
}
