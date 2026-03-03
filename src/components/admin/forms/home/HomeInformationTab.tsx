import { Dispatch, SetStateAction } from "react";
import { Check, Ban, X, ChevronDown, Plus, MapPin, Phone, Globe, Tags, Layers, Hash, Home, Star, Video, Trophy, AlignLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Taxonomy } from "@/types";
import { TaxonomySelector } from "../../TaxonomySelector";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { US_STATES, FEATURED_LABELS } from "@/lib/constants/formConstants";
import { SimpleSelect } from "@/components/admin/SimpleSelect";

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
    status: 'draft' | 'published';
    setStatus: (value: 'draft' | 'published') => void;
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Col B — Name + Description (order-2, wide) */}
            <div className="order-2 lg:col-span-2 flex flex-col">
                <div className="bg-surface-input rounded-lg p-[5px] space-y-4 flex flex-col flex-1">
                    {/* Home Name & Slug */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                {displayReferenceNumber ? "Reference No." : "Home Name"}
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                            </label>
                            <div className="flex items-center gap-2 flex-1">
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
                                    placeholder={displayReferenceNumber ? "Ref-12345" : "e.g. Sunnyvale Estate"}
                                />
                                {/* No./Name toggle */}
                                <div className="flex items-center bg-surface-input rounded-lg p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setDisplayReferenceNumber(true)}
                                        className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${displayReferenceNumber
                                            ? "bg-accent text-white shadow-sm"
                                            : "text-content-muted hover:text-content-secondary"
                                            }`}
                                    >
                                        No.
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDisplayReferenceNumber(false)}
                                        className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${!displayReferenceNumber
                                            ? "bg-accent text-white shadow-sm"
                                            : "text-content-muted hover:text-content-secondary"
                                            }`}
                                    >
                                        Name
                                    </button>
                                </div>
                            </div>
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
                    <div className="flex flex-col flex-1 gap-2">
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
                            placeholder="Describe the facility location, amenities, and care offered..."
                            minHeight="min-h-[200px]"
                            className="flex-1 bg-surface-input text-content-primary placeholder-content-muted border-none"
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
                                const selectedId = taxonomyEntryIds.find(id =>
                                    findEntryInTree(taxonomy.entries, id)
                                ) || "";
                                return (
                                    <div key={taxonomy.id} className="flex items-center justify-between gap-2 p-[5px] bg-surface-hover rounded-lg">
                                        <label className="text-sm font-medium text-content-secondary flex items-center gap-1.5 pl-[5px]">
                                            {taxonomy.singularName}
                                            {(taxonomy.singularName === "Home Type" || taxonomy.singularName === "Location") && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                            )}
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <TaxonomySelector
                                                taxonomy={taxonomy}
                                                value={selectedId}
                                                className="w-44 text-sm"
                                                onChange={(newId: string) => {
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
                        </h3>
                        {/* Show Address Toggle */}
                        <div className="flex items-center bg-surface-input rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddress(false);
                                    setIsDirty(true);
                                }}
                                className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${!showAddress
                                    ? "bg-accent text-white shadow-sm"
                                    : "text-content-muted hover:text-content-secondary"
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
                                    : "text-content-muted hover:text-content-secondary"
                                    }`}
                            >
                                Public
                            </button>
                        </div>
                    </div>

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
                                className="form-input text-left w-40 h-8 rounded-md px-3"
                                placeholder="(555) 123-4567"
                                maxLength={14}
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
                                placeholder="contact@example.com"
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Col C — Status + Classification + Promotions (order-3) */}
            <div className="order-3 space-y-[10px]">


                {/* Promotions */}
                <div className="space-y-2">
                    {/* Featured Home */}
                    <div className="bg-surface-hover rounded-lg transition-all">
                        <div className="flex items-center justify-between gap-2 p-[5px]">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                <Star className={`h-3.5 w-3.5 flex-shrink-0 ${isFeatured ? 'text-accent fill-accent' : 'text-content-secondary'}`} />
                                Featured Home
                            </label>
                            <Switch
                                checked={isFeatured}
                                onCheckedChange={(checked) => {
                                    setIsFeatured(checked);
                                    setIsDirty(true);
                                    if (checked && !featuredLabel) setFeaturedLabel("Featured");
                                    if (!checked) setFeaturedLabel("");
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
                                                    <div className="absolute top-full right-0 mt-1 dropdown-menu max-h-60 overflow-hidden z-50 min-w-[150px] flex flex-col">
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

                    {/* Home of the Month */}
                    <div className="bg-surface-hover rounded-lg transition-all">
                        <div className="flex items-center justify-between gap-2 p-[5px]">
                            <label className="text-sm font-medium text-content-secondary whitespace-nowrap flex items-center gap-1.5 pl-[5px]">
                                <Trophy className={`h-3.5 w-3.5 flex-shrink-0 ${isHomeOfMonth ? 'text-accent' : 'text-content-secondary'}`} />
                                Home of Month
                            </label>
                            <Switch
                                checked={isHomeOfMonth}
                                onCheckedChange={(checked) => { setIsHomeOfMonth(checked); setIsDirty(true); }}
                                className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-hover"
                            />
                        </div>
                        {isHomeOfMonth && (
                            <div className="flex flex-col gap-1.5 p-[5px] animate-in fade-in slide-in-from-top-1 duration-150">
                                <label className="text-xs font-medium text-content-muted pl-[5px]">Description</label>
                                <textarea
                                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                    value={homeOfMonthDescription}
                                    onChange={(e) => { setHomeOfMonthDescription(e.target.value); setIsDirty(true); }}
                                    onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                                    placeholder="Why this home is featured..."
                                    rows={3}
                                    className="form-input w-full py-1 px-2 text-xs resize-none overflow-hidden"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}



