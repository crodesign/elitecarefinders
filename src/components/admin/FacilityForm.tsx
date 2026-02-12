"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Building2, Bed, MapPin, Phone, FileText, Hash, Globe, Tags, Check, Ban, Plus, X, Layers, Save, Circle, Users, Map, ChevronUp, ChevronDown, Mail, DollarSign } from "lucide-react";
import { ICON_MAP } from "@/components/ui/IconPicker";
import type {
    Facility,
    Taxonomy,
    RoomFieldCategory,
    RoomFieldDefinition,
    RoomFixedFieldOption,
    RoomDetails
} from "@/types";
import { getTaxonomies } from "@/lib/services/taxonomyService";
import {
    getTaxonomyEntries,
    createTaxonomyEntry,
    updateTaxonomyEntry,
    deleteTaxonomyEntry,
    type TaxonomyEntry
} from "@/lib/services/taxonomyEntryService";
import {
    getRoomFieldCategories,
    getRoomFieldDefinitions,
    getFixedFieldOptions,
    getFixedFieldTypeIcons,
} from "@/lib/services/roomFieldService";
import { SlidePanel } from "./SlidePanel";
import { TaxonomySelector } from "./TaxonomySelector";
import { SimpleSelect } from "./SimpleSelect";
import { EntryTree } from "./taxonomy/EntryTree";
import { useNotification } from "@/contexts/NotificationContext";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

const RichTextEditor = dynamic(
    () => import("@/components/ui/RichTextEditor").then((mod) => mod.RichTextEditor),
    { ssr: false }
);

interface FacilityFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<Facility>) => Promise<void>;
    facility?: Facility | null;
}

type TabId = "information" | "rooms" | "location" | "gallery" | "provider";

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

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

export function FacilityForm({ isOpen, onClose, onSave, facility }: FacilityFormProps) {
    const { setIsDirty, registerSaveHandler } = useUnsavedChanges();
    const [activeTab, setActiveTab] = useState<TabId>("information");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use ref to keep track of latest handleSaveInternal without re-registering
    const saveHandlerRef = useRef<() => Promise<boolean>>(async () => false);

    // Update ref when state changes
    useEffect(() => {
        saveHandlerRef.current = handleSaveInternal;
    });

    // Register save handler when form is open
    useEffect(() => {
        if (isOpen) {
            registerSaveHandler(async () => await saveHandlerRef.current());
        }
        return () => setIsDirty(false);
    }, [isOpen, registerSaveHandler]);

    const handleFormChange = () => {
        if (isOpen) setIsDirty(true);
    };

    // Form State
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [capacity, setCapacity] = useState<number | "">("");

    // Address State
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");

    // Contact State
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // Status & Taxonomies
    const [status, setStatus] = useState<'published' | 'draft'>('published');
    const [taxonomyIds, setTaxonomyIds] = useState<string[]>([]);
    const [availableTaxonomies, setAvailableTaxonomies] = useState<TaxonomyWithEntries[]>([]);

    // Promotions State
    const [isFeatured, setIsFeatured] = useState(false);
    const [hasFeaturedVideo, setHasFeaturedVideo] = useState(false);
    const [isFacilityOfMonth, setIsFacilityOfMonth] = useState(false);
    const [featuredLabel, setFeaturedLabel] = useState("");
    const [isCustomLabelMode, setIsCustomLabelMode] = useState(false);
    const [labelSearch, setLabelSearch] = useState("");
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);
    const [facilityOfMonthDescription, setFacilityOfMonthDescription] = useState("");

    // Taxonomy Management State
    const [managingTaxonomy, setManagingTaxonomy] = useState<Taxonomy | null>(null);
    const [taxonomyEntries, setTaxonomyEntries] = useState<TaxonomyEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);

    // Room Fields State (for Facility Details tab)
    const [roomCategories, setRoomCategories] = useState<RoomFieldCategory[]>([]);
    const [roomDefinitions, setRoomDefinitions] = useState<RoomFieldDefinition[]>([]);
    const [fixedFieldOptions, setFixedFieldOptions] = useState<RoomFixedFieldOption[]>([]);
    const [fixedFieldIcons, setFixedFieldIcons] = useState<Record<string, string>>({});
    const [invalidEmailFields, setInvalidEmailFields] = useState<Set<string>>(new Set());
    const [roomDetails, setRoomDetails] = useState<RoomDetails>({ customFields: {} });

    const formatPhoneNumber = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length === 0) return '';
        if (numbers.length <= 3) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    // Check for existence of active fields for each section targeting this entity type
    const hasRoomFields = roomDefinitions.some(f =>
        f.isActive &&
        (f.targetType === 'facility' || f.targetType === 'both') &&
        roomCategories.find(c => c.id === f.categoryId)?.section === 'room_details'
    );

    const hasLocationFields = roomDefinitions.some(f =>
        f.isActive &&
        (f.targetType === 'facility' || f.targetType === 'both') &&
        roomCategories.find(c => c.id === f.categoryId)?.section === 'location_details'
    );

    const hasProviderFields = roomDefinitions.some(f =>
        f.isActive &&
        (f.targetType === 'facility' || f.targetType === 'both') &&
        roomCategories.find(c => c.id === f.categoryId)?.section === 'care_provider_details'
    );

    const tabs: Tab[] = [
        { id: "information", label: "Facility Information", icon: Building2 },
        ...(hasRoomFields ? [{ id: "rooms" as const, label: "Room Details", icon: Bed }] : []),
        ...(hasLocationFields ? [{ id: "location" as const, label: "Location Details", icon: Map }] : []),
        { id: "gallery", label: "Gallery", icon: FileText },
        ...(hasProviderFields ? [{ id: "provider" as const, label: "Provider Details", icon: Users }] : []),
    ];

    const { showNotification } = useNotification();

    const isEditing = !!facility;

    // Fetch Taxonomies
    const loadTaxonomies = async () => {
        try {
            const allTaxonomies = await getTaxonomies();
            const facilityTaxonomies = allTaxonomies.filter(t =>
                t.contentTypes?.some(ct => ['facility', 'Facility', 'facilities', 'Facilities'].includes(ct))
            );

            const taxesWithEntries = await Promise.all(facilityTaxonomies.map(async (t) => {
                const entries = await getTaxonomyEntries(t.id);
                return { ...t, entries };
            }));

            setAvailableTaxonomies(taxesWithEntries);
        } catch (err) {
            console.error("Failed to fetch taxonomies", err);
        }
    };

    // Fetch Initial Data
    useEffect(() => {
        loadTaxonomies();
        Promise.all([
            getRoomFieldCategories(),
            getRoomFieldDefinitions(),
            getFixedFieldOptions(),
            getFixedFieldTypeIcons()
        ]).then(([cats, defs, opts, icons]) => {
            setRoomCategories(cats);
            setRoomDefinitions(defs);
            setFixedFieldOptions(opts);
            setFixedFieldIcons(icons);
        }).catch(err => console.error("Failed to load room fields", err));
    }, []);

    // Reset or populate form
    useEffect(() => {
        if (isOpen) {
            setActiveTab("information");
            setError(null);
            if (facility) {
                setTitle(facility.title);
                setSlug(facility.slug);
                setDescription(facility.description);
                setLicenseNumber(facility.licenseNumber || "");
                setCapacity(facility.capacity || "");
                setStatus(facility.status || 'published');
                setTaxonomyIds(facility.taxonomyIds || []);

                // Promotions
                setIsFeatured((facility as any).isFeatured || false);
                setHasFeaturedVideo((facility as any).hasFeaturedVideo || false);
                setIsFacilityOfMonth((facility as any).isFacilityOfMonth || false);
                setFeaturedLabel((facility as any).featuredLabel || "");
                setIsCustomLabelMode(!!(facility as any).featuredLabel && !FEATURED_LABELS.includes((facility as any).featuredLabel));
                setFacilityOfMonthDescription((facility as any).facilityOfMonthDescription || "");

                // Address
                setStreet(facility.address?.street || "");
                setCity(facility.address?.city || "");
                setState(facility.address?.state || "");
                setZip(facility.address?.zip || "");

                // Contact
                setPhone((facility as any).phone || "");
                setEmail((facility as any).email || "");

                // Room Details (if stored)
                setRoomDetails((facility as any).roomDetails || { customFields: {} });
            } else {
                // Reset
                setTitle("");
                setSlug("");
                setDescription("");
                setLicenseNumber("");
                setCapacity("");
                setStatus('published');
                setTaxonomyIds([]);
                setStreet("");
                setCity("");
                setState("");
                setZip("");
                setRoomDetails({ customFields: {} });
                // Reset contact
                setPhone("");
                setEmail("");
                // Reset promotions
                setIsFeatured(false);
                setHasFeaturedVideo(false);
                setIsFacilityOfMonth(false);
                setFeaturedLabel("");
                setIsCustomLabelMode(false);
                setFacilityOfMonthDescription("");
            }
        }
    }, [isOpen, facility]);

    // Taxonomy Entry Management Handlers
    const fetchTaxonomyEntries = async (taxonomyId: string) => {
        setLoadingEntries(true);
        try {
            const data = await getTaxonomyEntries(taxonomyId);
            setTaxonomyEntries(data);
        } catch (err) {
            console.error("Failed to load entries:", err);
            setError("Failed to load taxonomy entries");
        } finally {
            setLoadingEntries(false);
        }
    };

    useEffect(() => {
        if (managingTaxonomy) {
            fetchTaxonomyEntries(managingTaxonomy.id);
        } else {
            setTaxonomyEntries([]);
        }
    }, [managingTaxonomy]);

    const handleAddEntry = async (name: string, parentId?: string) => {
        if (!managingTaxonomy?.id) return;
        try {
            await createTaxonomyEntry(managingTaxonomy.id, name, parentId);
            await fetchTaxonomyEntries(managingTaxonomy.id);
            showNotification(`${managingTaxonomy.singularName} Added`, name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add entry");
        }
    };

    const handleEditEntry = async (id: string, name: string) => {
        if (!managingTaxonomy?.id) return;
        try {
            await updateTaxonomyEntry(id, name);
            await fetchTaxonomyEntries(managingTaxonomy.id);
            showNotification(`${managingTaxonomy.singularName} Updated`, name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update entry");
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!managingTaxonomy?.id) return;
        try {
            await deleteTaxonomyEntry(id);
            await fetchTaxonomyEntries(managingTaxonomy.id);
            showNotification(`${managingTaxonomy.singularName} Deleted`, "Entry removed");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete entry");
        }
    };

    const handleSaveInternal = async (): Promise<boolean> => {
        setError(null);
        setIsSubmitting(true);

        try {
            const formData: Partial<Facility> = {
                title,
                slug,
                description,
                licenseNumber,
                capacity: capacity === "" ? 0 : capacity,
                status,
                taxonomyIds,
                address: {
                    street,
                    city,
                    state,
                    zip
                },
                // Contact
                ...({
                    phone,
                    email,
                } as any),
                // Promotions (cast to any since Facility type may not have these yet)
                ...({
                    isFeatured,
                    hasFeaturedVideo,
                    isFacilityOfMonth,
                    featuredLabel: isFeatured ? featuredLabel : "",
                    facilityOfMonthDescription: isFacilityOfMonth ? facilityOfMonthDescription : "",
                } as any)
            };
            await onSave(formData);
            setIsDirty(false);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleSaveInternal();
        if (success) {
            onClose();
        }
    };

    const renderTabContent = () => {
        // Helper to render a single category - only show facility-related fields
        const renderCategory = (category: RoomFieldCategory) => {
            const categoryFields = roomDefinitions.filter(f =>
                f.categoryId === category.id &&
                f.isActive &&
                (f.targetType === 'facility' || f.targetType === 'both')
            );
            if (categoryFields.length === 0) return null;

            return (
                <div key={category.id} className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-base font-medium text-white mb-4 flex items-center gap-2">
                        {category.icon && ICON_MAP[category.icon] && (() => { const CatIcon = ICON_MAP[category.icon!]; return <CatIcon className="h-4 w-4 text-accent" />; })()}
                        {category.name}
                    </h3>
                    <div className="space-y-3">
                        {categoryFields.map(field => (
                            <div key={field.id} className="space-y-1">
                                {field.type !== 'boolean' && field.type !== 'single' && field.type !== 'multi' && field.type !== 'dropdown' && field.type !== 'text' && field.type !== 'textarea' && field.type !== 'number' && field.type !== 'phone' && field.type !== 'email' && field.type !== 'currency' && (
                                    <label className="text-sm font-medium text-white/80">{field.name}</label>
                                )}

                                {/* Boolean Field */}
                                {field.type === 'boolean' && (
                                    <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between gap-3">
                                        <span className="font-medium text-sm text-white/80">{field.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = roomDetails.customFields[field.id];
                                                let nextVal: boolean | undefined;

                                                if (current === true) nextVal = false;
                                                else if (current === false) nextVal = undefined;
                                                else nextVal = true;

                                                setRoomDetails((prev: RoomDetails) => {
                                                    const newCustomFields = { ...prev.customFields };
                                                    if (nextVal === undefined) {
                                                        delete newCustomFields[field.id];
                                                    } else {
                                                        newCustomFields[field.id] = nextVal;
                                                    }
                                                    setIsDirty(true);
                                                    return { ...prev, customFields: newCustomFields };
                                                });
                                            }}
                                            className={`h-8 px-3 rounded-full flex items-center gap-2 transition-all ${roomDetails.customFields[field.id] === true
                                                ? "bg-accent text-white shadow-lg shadow-accent/20"
                                                : roomDetails.customFields[field.id] === false
                                                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                                                    : "bg-black/20 text-zinc-500 hover:bg-black/40"
                                                }`}
                                        >
                                            <span className="text-xs font-medium uppercase">
                                                {roomDetails.customFields[field.id] === true
                                                    ? "Yes"
                                                    : roomDetails.customFields[field.id] === false
                                                        ? "No"
                                                        : "Select"}
                                            </span>
                                            <div className={`p-0.5 rounded-full bg-white/20`}>
                                                {roomDetails.customFields[field.id] === true ? (
                                                    <Check className="h-3 w-3" />
                                                ) : roomDetails.customFields[field.id] === false ? (
                                                    <X className="h-3 w-3" />
                                                ) : (
                                                    <div className="h-3 w-3" />
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                )}

                                {/* Single Select */}
                                {field.type === 'single' && (
                                    <div className="bg-white/5 border border-white/5 rounded-lg p-3 space-y-3">
                                        <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                            {field.options?.map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => setRoomDetails((prev: RoomDetails) => {
                                                        const current = prev.customFields[field.id];
                                                        const newCustomFields = { ...prev.customFields };
                                                        if (current === opt) {
                                                            delete newCustomFields[field.id];
                                                        } else {
                                                            newCustomFields[field.id] = opt;
                                                        }
                                                        setIsDirty(true);
                                                        return { ...prev, customFields: newCustomFields };
                                                    })}
                                                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${roomDetails.customFields[field.id] === opt
                                                        ? "bg-black/20 border-transparent text-white"
                                                        : "bg-black/20 border-transparent hover:bg-black/40 text-zinc-400"
                                                        }`}
                                                >
                                                    <span className="text-sm font-medium">{opt}</span>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${roomDetails.customFields[field.id] === opt
                                                        ? "border-accent bg-accent text-white"
                                                        : "border-zinc-600 bg-transparent"
                                                        }`}>
                                                        {roomDetails.customFields[field.id] === opt && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Dropdown */}
                                {field.type === 'dropdown' && (
                                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 rounded-lg transition-all bg-white/5">
                                        <span className="font-medium text-sm text-white/80">{field.name}</span>
                                        <SimpleSelect
                                            value={roomDetails.customFields[field.id] as string || ""}
                                            onChange={(val) => {
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: val }
                                                }));
                                                setIsDirty(true);
                                            }}
                                            options={field.options || []}
                                            placeholder="Select..."
                                            className="w-36 text-sm text-right"
                                        />
                                    </div>
                                )}

                                {/* Text Field */}
                                {field.type === 'text' && (
                                    <div className="bg-white/5 rounded-lg p-3 transition-all space-y-2">
                                        <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                        <input
                                            type="text"
                                            value={roomDetails.customFields[field.id] as string || ""}
                                            onChange={(e) => {
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: e.target.value }
                                                }));
                                                setIsDirty(true);
                                            }}
                                            className="w-full rounded-md px-3 py-2 text-left text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                            placeholder={`Enter ${field.name.toLowerCase()}...`}
                                        />
                                    </div>
                                )}

                                {/* Text Block (Textarea) */}
                                {field.type === 'textarea' && (
                                    <div className="bg-white/5 rounded-lg p-3 transition-all space-y-2">
                                        <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                        <textarea
                                            value={roomDetails.customFields[field.id] as string || ""}
                                            onChange={(e) => {
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: e.target.value }
                                                }));
                                                setIsDirty(true);
                                            }}
                                            className="w-full rounded-md px-3 py-2 text-left text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50 min-h-[100px] resize-y"
                                            placeholder={`Enter ${field.name.toLowerCase()}...`}
                                        />
                                    </div>
                                )}

                                {/* Number Field */}
                                {field.type === 'number' && (
                                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/5 rounded-lg transition-all">
                                        <label className="text-sm font-medium text-white/80">{field.name}</label>
                                        <div className="relative w-32">
                                            <input
                                                type="number"
                                                value={roomDetails.customFields[field.id] as string || ""}
                                                onChange={(e) => {
                                                    setRoomDetails((prev: RoomDetails) => ({
                                                        ...prev,
                                                        customFields: { ...prev.customFields, [field.id]: e.target.value }
                                                    }));
                                                    setIsDirty(true);
                                                }}
                                                className="w-full rounded-md px-2 pl-3 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="0"
                                            />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseInt(roomDetails.customFields[field.id] as string) || 0;
                                                        setRoomDetails((prev: RoomDetails) => ({
                                                            ...prev,
                                                            customFields: { ...prev.customFields, [field.id]: (current + 1).toString() }
                                                        }));
                                                        setIsDirty(true);
                                                    }}
                                                    className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                                >
                                                    <ChevronUp className="h-2 w-2" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseInt(roomDetails.customFields[field.id] as string) || 0;
                                                        setRoomDetails((prev: RoomDetails) => ({
                                                            ...prev,
                                                            customFields: { ...prev.customFields, [field.id]: Math.max(0, current - 1).toString() }
                                                        }));
                                                        setIsDirty(true);
                                                    }}
                                                    className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                                >
                                                    <ChevronDown className="h-2 w-2" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Phone Field */}
                                {field.type === 'phone' && (
                                    <div className="bg-white/5 rounded-lg p-3 transition-all space-y-2">
                                        <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                            <input
                                                type="tel"
                                                value={roomDetails.customFields[field.id] as string || ""}
                                                onChange={(e) => {
                                                    const formatted = formatPhoneNumber(e.target.value);
                                                    setRoomDetails((prev: RoomDetails) => ({
                                                        ...prev,
                                                        customFields: { ...prev.customFields, [field.id]: formatted }
                                                    }));
                                                    setIsDirty(true);
                                                }}
                                                className="w-full rounded-md pl-9 pr-3 py-2 text-left text-sm focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="(555) 555-5555"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Email Field */}
                                {field.type === 'email' && (
                                    <div className={`bg-white/5 rounded-lg p-3 transition-all space-y-2 ${invalidEmailFields.has(field.id) ? 'border border-red-500/50' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                            {invalidEmailFields.has(field.id) && (
                                                <span className="text-[10px] text-red-400 font-medium px-1.5 py-0.5 bg-red-500/10 rounded">Invalid format</span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${invalidEmailFields.has(field.id) ? 'text-red-400' : 'text-zinc-500'}`} />
                                            <input
                                                type="email"
                                                value={roomDetails.customFields[field.id] as string || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setRoomDetails((prev: RoomDetails) => ({
                                                        ...prev,
                                                        customFields: { ...prev.customFields, [field.id]: val }
                                                    }));
                                                    setIsDirty(true);

                                                    // Check format
                                                    if (val && (!val.includes('@') || val.indexOf('.', val.indexOf('@')) === -1)) {
                                                        setInvalidEmailFields(prev => new Set(prev).add(field.id));
                                                    } else {
                                                        setInvalidEmailFields(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(field.id);
                                                            return next;
                                                        });
                                                    }
                                                }}
                                                className={`w-full rounded-md pl-9 pr-3 py-2 text-left text-sm focus:outline-none transition-colors ${invalidEmailFields.has(field.id)
                                                    ? "bg-red-500/10 text-white placeholder-red-300/50 focus:bg-red-500/20"
                                                    : "bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                    }`}
                                                placeholder="example@email.com"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Currency Field */}
                                {field.type === 'currency' && (
                                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-white/5 rounded-lg transition-all">
                                        <label className="text-sm font-medium text-white/80">{field.name}</label>
                                        <div className="relative w-32">
                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${roomDetails.customFields[field.id] ? "text-white/80" : "text-zinc-500"}`}>$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={roomDetails.customFields[field.id] as string || ""}
                                                onChange={(e) => {
                                                    setRoomDetails((prev: RoomDetails) => ({
                                                        ...prev,
                                                        customFields: { ...prev.customFields, [field.id]: e.target.value }
                                                    }));
                                                    setIsDirty(true);
                                                }}
                                                className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="0.00"
                                            />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseFloat(roomDetails.customFields[field.id] as string) || 0;
                                                        setRoomDetails((prev: RoomDetails) => ({
                                                            ...prev,
                                                            customFields: { ...prev.customFields, [field.id]: (current + 1).toFixed(2) }
                                                        }));
                                                        setIsDirty(true);
                                                    }}
                                                    className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                                >
                                                    <ChevronUp className="h-2 w-2" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseFloat(roomDetails.customFields[field.id] as string) || 0;
                                                        setRoomDetails((prev: RoomDetails) => ({
                                                            ...prev,
                                                            customFields: { ...prev.customFields, [field.id]: Math.max(0, current - 1).toFixed(2) }
                                                        }));
                                                        setIsDirty(true);
                                                    }}
                                                    className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                                >
                                                    <ChevronDown className="h-2 w-2" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Multi Select */}
                                {field.type === 'multi' && (
                                    <div className="bg-white/5 border border-white/5 rounded-lg p-3 space-y-3">
                                        <label className="text-sm font-medium text-white/80 block">{field.name}</label>
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                            {field.options?.map((opt) => {
                                                const currentValues = (roomDetails.customFields[field.id] as string[]) || [];
                                                const isSelected = currentValues.includes(opt);
                                                return (
                                                    <button
                                                        key={opt}
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = isSelected
                                                                ? currentValues.filter(v => v !== opt)
                                                                : [...currentValues, opt];
                                                            setRoomDetails((prev: RoomDetails) => ({
                                                                ...prev,
                                                                customFields: { ...prev.customFields, [field.id]: updated }
                                                            }));
                                                            setIsDirty(true);
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${isSelected
                                                            ? "bg-black/20 border-transparent text-white"
                                                            : "bg-black/20 border-transparent hover:bg-black/40 text-zinc-400"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">{opt}</span>
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected
                                                            ? "border-accent bg-accent text-white"
                                                            : "border-zinc-600 bg-transparent"
                                                            }`}>
                                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        switch (activeTab) {
            case "information":
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
                                        className={`w-full rounded-lg py-3 pl-10 pr-4 text-lg text-white focus:outline-none transition-colors ${title
                                            ? "bg-accent/40 text-white placeholder-white/50"
                                            : "bg-white/5 text-white placeholder-zinc-500 focus:bg-white/10"
                                            }`}
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
                                                                className="w-full px-3 py-1.5 text-xs bg-black/30 border border-transparent rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                                                            />
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
            case "rooms":
                // Helper moved to function scope

                // Check if there are any facility-related fields at all
                const hasFacilityFields = roomDefinitions.some(f =>
                    f.isActive && (f.targetType === 'facility' || f.targetType === 'both')
                );

                if (!hasFacilityFields) {
                    return (
                        <div className="p-8 text-center text-zinc-500">
                            No facility-specific detail fields have been configured yet.
                            <br />
                            <span className="text-sm">Add fields in Setup → Room Fields with target type "Facility" or "Both".</span>
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                        {/* Column 1: General Info & Col 1 Categories */}
                        <div className="space-y-6">
                            {/* Fixed Fields Section (General Room Info) */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Bed className="h-4 w-4 text-accent" />
                                    <h3 className="text-base font-medium text-white">General Info</h3>
                                </div>

                                <div className="space-y-3">
                                    {/* Room Price */}
                                    <div className="min-h-[40px] flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 rounded-lg transition-all bg-white/5">
                                        <label className="text-sm font-medium text-white/80">Room Price</label>
                                        <div className="relative w-32">
                                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${roomDetails.roomPrice ? "text-white/80" : "text-zinc-500"}`}>$</span>
                                            <input
                                                type="number"
                                                value={roomDetails.roomPrice || ""}
                                                onChange={(e) => {
                                                    setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: parseFloat(e.target.value) || undefined }));
                                                    setIsDirty(true);
                                                }}
                                                className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="0.00"
                                            />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: (prev.roomPrice || 0) + 1 }));
                                                        setIsDirty(true);
                                                    }}
                                                    className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                                >
                                                    <ChevronUp className="h-2 w-2" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: Math.max(0, (prev.roomPrice || 0) - 1) }));
                                                        setIsDirty(true);
                                                    }}
                                                    className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                                >
                                                    <ChevronDown className="h-2 w-2" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bedroom Type */}
                                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 border rounded-lg transition-all bg-white/5 border-white/5">
                                        <label className="text-sm font-medium text-white/80">Bedroom Type</label>
                                        <SimpleSelect
                                            value={roomDetails.bedroomType || ""}
                                            onChange={(val) => {
                                                setRoomDetails((prev: RoomDetails) => ({ ...prev, bedroomType: val }));
                                                setIsDirty(true);
                                            }}
                                            options={fixedFieldOptions.filter(o => o.fieldType === 'bedroom').map(o => o.value)}
                                            placeholder="Select..."
                                            className="w-32 text-sm"
                                        />
                                    </div>

                                    {/* Bathroom Type */}
                                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 border rounded-lg transition-all bg-white/5 border-white/5">
                                        <label className="text-sm font-medium text-white/80">Bathroom Type</label>
                                        <SimpleSelect
                                            value={roomDetails.bathroomType || ""}
                                            onChange={(val) => {
                                                setRoomDetails((prev: RoomDetails) => ({ ...prev, bathroomType: val }));
                                                setIsDirty(true);
                                            }}
                                            options={fixedFieldOptions.filter(o => o.fieldType === 'bathroom').map(o => o.value)}
                                            placeholder="Select..."
                                            className="w-32 text-sm"
                                        />
                                    </div>

                                    {/* Shower Type */}
                                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 border rounded-lg transition-all bg-white/5 border-white/5">
                                        <label className="text-sm font-medium text-white/80">Shower Type</label>
                                        <SimpleSelect
                                            value={roomDetails.showerType || ""}
                                            onChange={(val) => {
                                                setRoomDetails((prev: RoomDetails) => ({ ...prev, showerType: val }));
                                                setIsDirty(true);
                                            }}
                                            options={fixedFieldOptions.filter(o => o.fieldType === 'shower').map(o => o.value)}
                                            placeholder="Select..."
                                            className="w-32 text-sm"
                                        />
                                    </div>

                                    {/* Room Types Available */}
                                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 border rounded-lg transition-all bg-white/5 border-white/5">
                                        <label className="text-sm font-medium text-white/80">Room Types</label>
                                        <SimpleSelect
                                            value={roomDetails.roomTypes?.[0] || ""}
                                            onChange={(val) => {
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    roomTypes: val ? [val] : []
                                                }));
                                                setIsDirty(true);
                                            }}
                                            options={fixedFieldOptions.filter(o => o.fieldType === 'roomType').map(o => o.value)}
                                            placeholder="Select..."
                                            className="w-32 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Custom Categories: Column 1 */}
                            {roomCategories
                                .filter(c => (c.columnNumber === 1 || (!c.columnNumber)) && c.section === 'room_details')
                                .map(renderCategory)}
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.columnNumber === 2 && c.section === 'room_details')
                                .map(renderCategory)}
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.columnNumber === 3 && c.section === 'room_details')
                                .map(renderCategory)}
                        </div>

                        {/* Column 4 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.columnNumber === 4 && c.section === 'room_details')
                                .map(renderCategory)}
                        </div>
                    </div>
                );
            case "location":
                // Render only location_details categories
                const hasLocationFields = roomDefinitions.some(f =>
                    f.isActive && (f.targetType === 'facility' || f.targetType === 'both') &&
                    roomCategories.find(c => c.id === f.categoryId)?.section === 'location_details'
                );

                if (!hasLocationFields) {
                    return (
                        <div className="p-8 text-center text-zinc-500">
                            No location-specific detail fields have been configured yet.
                            <br />
                            <span className="text-sm">Add fields in Setup → Room Fields with section "Location Details".</span>
                        </div>
                    );
                }

                // Helper to render a category for location (reuse same logic or similar but filtered by section)
                // We reuse renderCategory which filters by ID, so we just need to pass the right categories

                return (

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                        {/* Column 1: Levels of Care (Fixed) */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="bg-white/5 rounded-lg p-3 space-y-3">
                                    {(() => {
                                        const Icon = fixedFieldIcons["levelOfCare"] ? ICON_MAP[fixedFieldIcons["levelOfCare"]] : null;
                                        return (
                                            <div className="flex items-center gap-2 mb-2">
                                                {Icon && <Icon className="h-5 w-5 text-accent" />}
                                                <label className="text-base font-medium text-white/80 block">Levels of Care</label>
                                            </div>
                                        );
                                    })()}
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {fixedFieldOptions
                                            .filter(o => o.fieldType === 'levelOfCare')
                                            .map((opt) => {
                                                const currentValues = roomDetails.levelOfCare || [];
                                                const isSelected = currentValues.includes(opt.value);
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = isSelected
                                                                ? currentValues.filter(v => v !== opt.value)
                                                                : [...currentValues, opt.value];
                                                            setRoomDetails((prev: RoomDetails) => ({
                                                                ...prev,
                                                                levelOfCare: updated
                                                            }));
                                                            setIsDirty(true);
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${isSelected
                                                            ? "bg-black/20 border-transparent text-white"
                                                            : "bg-black/20 border-transparent hover:bg-black/40 text-zinc-400"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">{opt.value}</span>
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected
                                                            ? "border-accent bg-accent text-white"
                                                            : "border-zinc-600 bg-transparent"
                                                            }`}>
                                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>

                            {/* Languages Spoken (Fixed) */}
                            <div className="space-y-4">
                                <div className="bg-white/5 rounded-lg p-3 space-y-3">
                                    {(() => {
                                        const Icon = fixedFieldIcons["language"] ? ICON_MAP[fixedFieldIcons["language"]] : null;
                                        return (
                                            <div className="flex items-center gap-2 mb-2">
                                                {Icon && <Icon className="h-5 w-5 text-accent" />}
                                                <label className="text-base font-medium text-white/80 block">Languages Spoken</label>
                                            </div>
                                        );
                                    })()}
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {fixedFieldOptions
                                            .filter(o => o.fieldType === 'language')
                                            .map((opt) => {
                                                const currentValues = roomDetails.languages || [];
                                                const isSelected = currentValues.includes(opt.value);
                                                return (
                                                    <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = isSelected
                                                                ? currentValues.filter(v => v !== opt.value)
                                                                : [...currentValues, opt.value];
                                                            setRoomDetails((prev: RoomDetails) => ({
                                                                ...prev,
                                                                languages: updated
                                                            }));
                                                            setIsDirty(true);
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${isSelected
                                                            ? "bg-black/20 border-transparent text-white"
                                                            : "bg-black/20 border-transparent hover:bg-black/40 text-zinc-400"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">{opt.value}</span>
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected
                                                            ? "border-accent bg-accent text-white"
                                                            : "border-zinc-600 bg-transparent"
                                                            }`}>
                                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>

                            {roomCategories
                                .filter(c => c.section === 'location_details' && c.columnNumber === 1)
                                .map(renderCategory)}
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.section === 'location_details' && c.columnNumber === 2)
                                .map(renderCategory)}
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.section === 'location_details' && c.columnNumber === 3)
                                .map(renderCategory)}
                        </div>

                        {/* Column 4 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.section === 'location_details' && c.columnNumber === 4)
                                .map(renderCategory)}
                        </div>
                    </div>
                );

            case "provider":
                const hasProviderFields = roomDefinitions.some(f =>
                    f.isActive && (f.targetType === 'facility' || f.targetType === 'both') &&
                    roomCategories.find(c => c.id === f.categoryId)?.section === 'care_provider_details'
                );

                if (!hasProviderFields) {
                    return (
                        <div className="p-8 text-center text-zinc-500">
                            No provider specific detail fields have been configured yet.
                            <br />
                            <span className="text-sm">Add fields in Setup → Room Fields with section "Provider Details".</span>
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                        {/* Column 1 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.section === 'care_provider_details' && (c.columnNumber === 1 || !c.columnNumber))
                                .map(renderCategory)}
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.section === 'care_provider_details' && c.columnNumber === 2)
                                .map(renderCategory)}
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.section === 'care_provider_details' && c.columnNumber === 3)
                                .map(renderCategory)}
                        </div>

                        {/* Column 4 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.section === 'care_provider_details' && c.columnNumber === 4)
                                .map(renderCategory)}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={onClose}
                title={isEditing ? "Editing Facility" : "Add New Facility"}
                subtitle={isEditing ? (title || facility?.title || "Update facility details") : "Create a new facility listing"}
                fullScreen
                headerChildren={
                    <div className="flex items-center justify-between px-6 border-b border-white/5">
                        <div className="flex overflow-x-auto overflow-y-hidden">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${isActive
                                            ? "text-accent border-accent"
                                            : "text-zinc-400 border-transparent hover:text-white hover:border-white/20"
                                            }`}
                                    >
                                        <Icon className="h-6 w-6 md:h-4 md:w-4" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="submit"
                            form="facility-form"
                            disabled={isSubmitting}
                            className="ml-4 mr-2 md:mr-0 p-[5px] md:w-auto md:h-auto md:px-6 md:py-1.5 flex items-center justify-center text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 transition-colors shadow-lg shadow-black/20"
                        >
                            {isSubmitting ? (
                                "Saving..."
                            ) : (
                                <>
                                    <span className="hidden md:inline">{isEditing ? "Update Facility" : "Create Facility"}</span>
                                    <Save className="h-7 w-7 md:hidden" />
                                </>
                            )}
                        </button>
                    </div>
                }
            >
                {error && (
                    <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* Tab Content */}
                <form id="facility-form" onSubmit={handleSubmit} className="flex flex-col flex-1">
                    <div className="flex-1 min-h-[300px]">
                        {renderTabContent()}
                    </div>
                </form>
            </SlidePanel>

            {/* Taxonomy List Management Panel */}
            <SlidePanel
                isOpen={!!managingTaxonomy}
                onClose={() => {
                    setManagingTaxonomy(null);
                    loadTaxonomies();
                }}
                title={managingTaxonomy?.pluralName || "Manage List"}
                subtitle={`Manage ${managingTaxonomy?.pluralName?.toLowerCase() || "items"} for this taxonomy`}
                showOverlay={false}
            >
                <EntryTree
                    entries={taxonomyEntries}
                    singularName={managingTaxonomy?.singularName || "Entry"}
                    onAddEntry={handleAddEntry}
                    onEditEntry={handleEditEntry}
                    onDeleteEntry={handleDeleteEntry}
                    isLoading={loadingEntries}
                />
            </SlidePanel>
        </>
    );
}
