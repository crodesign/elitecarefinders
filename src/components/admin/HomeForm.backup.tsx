"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Home, Bed, Image, Users, MapPin, Phone, FileText, Hash, Globe, Tags, Check, Ban, Plus, X, Layers, Save, Circle, Minus, ChevronUp, ChevronDown, Mail, DollarSign } from "lucide-react";
import { ICON_MAP } from "@/components/ui/IconPicker";
import type {
    Home as HomeType,
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
import { MediaGallery } from "@/components/admin/media/MediaGallery";
import { ensureLocationFolders } from "@/lib/services/mediaFolderService";
import { useNotification } from "@/contexts/NotificationContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

const RichTextEditor = dynamic(
    () => import("@/components/ui/RichTextEditor").then((mod) => mod.RichTextEditor),
    { ssr: false }
);

interface HomeFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<HomeType>) => Promise<void>;
    home?: HomeType | null;
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
    "Featured Home",
    "Coming Soon",
    "New Listing",
    "Great Value",
    "Desirable Location"
];

interface TaxonomyWithEntries extends Taxonomy {
    entries: any[]; // Using any[] to allow tree structure since imported type might be strictly flat in other contexts, but here we expect recursive structure
}

import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

// ... (existing imports)

export function HomeForm({ isOpen, onClose, onSave, home }: HomeFormProps) {
    const { isDirty, setIsDirty, registerSaveHandler } = useUnsavedChanges();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [activeTab, setActiveTab] = useState<TabId>("information");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync activeTab with URL
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ["information", "rooms", "location", "gallery", "provider"].includes(tab)) {
            setActiveTab(tab as TabId);
        }
    }, [searchParams]);

    const handleTabChange = (id: TabId) => {
        setActiveTab(id);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', id);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Form State
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // ... (rest of state items, simplified for search)

    // Use ref to keep track of latest handleSaveInternal without re-registering
    const saveHandlerRef = useRef<() => Promise<boolean>>(async () => false);

    // Update ref when state changes (effectively on every render)
    useEffect(() => {
        saveHandlerRef.current = handleSaveInternal;
    });

    // Register save handler when form is open
    useEffect(() => {
        if (isOpen) {
            registerSaveHandler(async () => {
                // Return promise that resolves to true if saved, false if failed
                // We need to wrap handleSubmit logic here to return boolean
                // Since handleSubmit uses e: FormEvent, we need to extract logic
                // But simplified: trigger the submit button click? No.
                // Call handleSubmit manually? It expects an event.

                // Let's refactor handleSubmit slightly to be callable without event
                // and return success status.
                return await saveHandlerRef.current();
            });
        }
        return () => {
            // Cleanup handled by context on route change, but good practice to clear if closing form
            setIsDirty(false);
        };
    }, [isOpen, registerSaveHandler /* dependencies for handleSaveInternal need to be stable or ref used */]);



    // Handle form changes - No longer needed manually as useEffect covers it
    const handleFormChange = () => {
        // Kept for prop compatibility/referential integrity if passed elsewhere, but no-op or purely for logging
    };

    // Internal save function that mirrors handleSubmit but returns boolean
    const handleSaveInternal = async (): Promise<boolean> => {
        if (!title.trim()) {
            setError("Title is required");
            return false;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const formData: Partial<HomeType> = {
                title,
                slug,
                description,
                phone,
                email,
                displayReferenceNumber,
                showAddress,
                status,
                taxonomyEntryIds,
                isFeatured,
                hasFeaturedVideo,
                isHomeOfMonth,
                featuredLabel,
                homeOfMonthDescription,
                address: {
                    street,
                    city,
                    state,
                    zip
                },
                images,
                roomDetails
            };

            await onSave(formData);

            setIsDirty(false); // Clear dirty state on success
            return true;
        } catch (err) {
            console.error("Error saving home:", err);
            setError(err instanceof Error ? err.message : "Failed to save home");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };



    // ... (rest of component)
    const [displayReferenceNumber, setDisplayReferenceNumber] = useState(false);
    const [showAddress, setShowAddress] = useState(true);

    // Address State
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");

    // Status & Taxonomies
    const [status, setStatus] = useState<'published' | 'draft'>('published');
    const [taxonomyEntryIds, setTaxonomyEntryIds] = useState<string[]>([]);
    const [availableTaxonomies, setAvailableTaxonomies] = useState<TaxonomyWithEntries[]>([]);

    // Promotions State
    const [isFeatured, setIsFeatured] = useState(false);
    const [hasFeaturedVideo, setHasFeaturedVideo] = useState(false);
    const [isHomeOfMonth, setIsHomeOfMonth] = useState(false);
    const [featuredLabel, setFeaturedLabel] = useState("");
    const [isCustomLabelMode, setIsCustomLabelMode] = useState(false);
    const [labelSearch, setLabelSearch] = useState("");
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);
    const [homeOfMonthDescription, setHomeOfMonthDescription] = useState("");

    // Taxonomy Management State
    const [managingTaxonomy, setManagingTaxonomy] = useState<Taxonomy | null>(null);
    const [taxonomyEntries, setTaxonomyEntries] = useState<TaxonomyEntry[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(false);

    // Media Gallery State
    const [galleryFolderId, setGalleryFolderId] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);

    // Fetch Gallery Folder - Only on initial load or if missing
    // We removed the auto-update logic to prevent folder migration issues.
    // This now only ensures a folder exists based on current data if one isn't already set.
    useEffect(() => {
        const fetchFolder = async () => {
            // If we already have a folder ID, do NOT update it automatically on location change
            // This prevents the "Gallery disappeared" issue and "Move Files" requirement.
            if (galleryFolderId) return;

            // Find "Location" or "Locations" taxonomy
            const locationTaxonomy = availableTaxonomies.find(t =>
                t.slug === 'location' || t.slug === 'locations' || t.name === 'Location' || t.name === 'Locations'
            );

            let derivedState = state;
            let derivedCity = city;
            let hasLocationSelection = false;

            // Helper to traverse tree and find entry + path
            const findEntryAndPath = (entries: any[], targetId: string, path: any[] = []): { entry: any, path: any[] } | null => {
                for (const entry of entries) {
                    const currentPath = [...path, entry];
                    if (entry.id === targetId) return { entry, path: currentPath };
                    if (entry.children) {
                        const found = findEntryAndPath(entry.children, targetId, currentPath);
                        if (found) return found;
                    }
                }
                return null;
            };

            if (locationTaxonomy && locationTaxonomy.entries) {
                const selectedEntryId = taxonomyEntryIds.find(id => {
                    return !!findEntryAndPath(locationTaxonomy.entries, id);
                });

                if (selectedEntryId) {
                    const result = findEntryAndPath(locationTaxonomy.entries, selectedEntryId);
                    if (result) {
                        const { path } = result;
                        if (path.length > 0) {
                            derivedState = path[0].name; // Root
                            derivedCity = path[path.length - 1].name; // Leaf (Selected)
                            hasLocationSelection = true;
                        }
                    }
                }
            }

            const validLocation = hasLocationSelection || (state && city);

            if (validLocation && title) {
                // Use full state name for folder structure if using address state code
                let stateName = derivedState;
                if (!hasLocationSelection && derivedState.length === 2) {
                    const stateObj = US_STATES.find(s => s.code === derivedState || s.name === derivedState);
                    stateName = stateObj ? stateObj.name : derivedState;
                }

                try {
                    const id = await ensureLocationFolders(stateName, derivedCity, title, 'home');
                    setGalleryFolderId(id);
                } catch (error) {
                    console.error("Error ensuring location folders:", error);
                    setGalleryFolderId(null);
                }
            }
        };
        fetchFolder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, city, title, taxonomyEntryIds, availableTaxonomies, galleryFolderId]);

    // Room Fields State
    // Room Fields State
    const [roomCategories, setRoomCategories] = useState<RoomFieldCategory[]>([]);
    const [roomDefinitions, setRoomDefinitions] = useState<RoomFieldDefinition[]>([]);
    const [fixedFieldOptions, setFixedFieldOptions] = useState<RoomFixedFieldOption[]>([]);
    const [fixedFieldIcons, setFixedFieldIcons] = useState<Record<string, string>>({});
    const [roomDetails, setRoomDetails] = useState<RoomDetails>({ customFields: {} });
    const [invalidEmailFields, setInvalidEmailFields] = useState<Set<string>>(new Set());

    const formatPhoneNumber = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length === 0) return '';
        if (numbers.length <= 3) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    };

    // Check for existence of fields for sections
    const hasRoomFields = roomDefinitions.some(f =>
        f.isActive && (f.targetType === 'home' || f.targetType === 'both') &&
        roomCategories.find(c => c.id === f.categoryId)?.section === 'room_details'
    );

    const hasLocationFields = roomDefinitions.some(f =>
        f.isActive && (f.targetType === 'home' || f.targetType === 'both') &&
        roomCategories.find(c => c.id === f.categoryId)?.section === 'location_details'
    );

    const hasProviderFields = roomDefinitions.some(f =>
        f.isActive && (f.targetType === 'home' || f.targetType === 'both') &&
        roomCategories.find(c => c.id === f.categoryId)?.section === 'care_provider_details'
    );

    const tabs: Tab[] = [
        { id: "information", label: "Home Information", icon: Home },
        ...(hasRoomFields ? [{ id: "rooms" as const, label: "Room Details", icon: Bed }] : []),
        ...(hasLocationFields ? [{ id: "location" as const, label: "Location Details", icon: MapPin }] : []),
        { id: "gallery", label: "Gallery", icon: Image },
        ...(hasProviderFields ? [{ id: "provider" as const, label: "Provider Details", icon: Users }] : []),
    ];

    // Using Notification Context
    const { showNotification } = useNotification();

    const isEditing = !!home;

    // Fetch Taxonomies
    const loadTaxonomies = async () => {
        try {
            const allTaxonomies = await getTaxonomies();
            const homeTaxonomies = allTaxonomies.filter(t =>
                t.contentTypes?.some(ct => ['home', 'Home', 'homes', 'Homes'].includes(ct))
            );

            const taxesWithEntries = await Promise.all(homeTaxonomies.map(async (t) => {
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

    // Reset tab on open
    useEffect(() => {
        if (isOpen) {
            // Only reset if no tab is specified in URL (handled by URL sync effect)
            // But URL sync effect runs separately. 
            // We want to verify if this is a "New Open" vs "Update".
            // Since this effect only runs on [isOpen], it runs when opening.
            // We can default to 'information'.
            // However, existing URL param might exist if we refreshed page.
            // The existing searchParams effect handles that.
            // Let's just set to information here as default for "Opening".
            // If URL has something else, that effect will override it or we should check here.
            if (!searchParams.get('tab')) {
                setActiveTab("information");
            }
        }
    }, [isOpen, searchParams]);

    // Reset or populate form
    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (home) {
                setTitle(home.title);
                setSlug(home.slug);
                setDescription(home.description);
                setPhone(home.phone || "");
                setEmail(home.email || "");
                setDisplayReferenceNumber(home.displayReferenceNumber || false);
                setShowAddress(home.showAddress !== false); // default true
                setStatus(home.status || 'published');
                setTaxonomyEntryIds(home.taxonomyEntryIds || []);

                setIsFeatured(home.isFeatured || false);
                setHasFeaturedVideo(home.hasFeaturedVideo || false);
                setIsHomeOfMonth(home.isHomeOfMonth || false);
                setFeaturedLabel(home.featuredLabel || "");
                setIsCustomLabelMode(!!home.featuredLabel && !FEATURED_LABELS.includes(home.featuredLabel));
                setHomeOfMonthDescription(home.homeOfMonthDescription || "");

                // Address
                setStreet(home.address?.street || "");
                setCity(home.address?.city || "");
                setState(home.address?.state || "");
                setZip(home.address?.zip || "");

                // Room Details
                setRoomDetails(home.roomDetails || { customFields: {} });

                // Images
                setImages(home.images || []);
            } else {
                // Reset
                setTitle("");
                setSlug("");
                setDescription("");
                setPhone("");
                setEmail("");
                setDisplayReferenceNumber(true);
                setShowAddress(false); // Default Private
                setStatus('published');
                setTaxonomyEntryIds([]);
                setStreet("");
                setCity("");
                setState("");
                setZip("");

                setIsFeatured(false);
                setHasFeaturedVideo(false);
                setIsHomeOfMonth(false);
                setFeaturedLabel("");
                setIsCustomLabelMode(false);
                setHomeOfMonthDescription("");

                // Reset Room Details
                setRoomDetails({ customFields: {} });

                // Reset Images
                setImages([]);
            }
        }
    }, [isOpen, home]);

    // Auto-generate slug from title if creating
    // Removed to handle in onChange instead to prevent overwriting existing slugs on load
    // useEffect(() => {
    //     if (!isEditing && title) {
    //         setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    //     }
    // }, [title, isEditing]);




    // Check if form state differs from initial/saved state
    useEffect(() => {
        if (!isOpen) return;

        const checkIsDirty = () => {
            // Helper for array comparison (order matters)
            const arraysEqual = (a: any[], b: any[]) => {
                if (a.length !== b.length) return false;
                return a.every((val, index) => val === b[index]);
            };

            // Helper for customs fields comparison
            const customFieldsEqual = (current: Record<string, any>, original: Record<string, any> | undefined) => {
                return JSON.stringify(current) === JSON.stringify(original || {});
            };

            if (!home) {
                // New Home Mode - check if any field has been modified from default
                if (title || slug || description || phone || email) return true;
                if (!displayReferenceNumber) return true; // default is true
                if (showAddress) return true; // default is false (Private)
                if (status !== 'published') return true;
                if (taxonomyEntryIds.length > 0) return true;
                if (street || city || state || zip) return true;
                if (images.length > 0) return true;

                // Promotions
                if (isFeatured || hasFeaturedVideo || isHomeOfMonth || featuredLabel || homeOfMonthDescription) return true;

                // Room Details
                if (Object.keys(roomDetails.customFields).length > 0) return true;
                if (roomDetails.roomPrice || roomDetails.bedroomType || roomDetails.bathroomType || roomDetails.showerType || (roomDetails.languages && roomDetails.languages.length > 0)) return true;

                return false;
            }

            // Edit Mode - compare against home prop
            if (title !== home.title) return true;
            if (slug !== home.slug) return true;
            if (description !== (home.description || "")) return true;
            if (phone !== (home.phone || "")) return true;
            if (email !== (home.email || "")) return true;
            if (displayReferenceNumber !== (home.displayReferenceNumber ?? false)) return true;
            if (showAddress !== (home.showAddress !== false)) return true;
            if (status !== (home.status || 'published')) return true;

            if (!arraysEqual(taxonomyEntryIds, home.taxonomyEntryIds || [])) return true;
            if (!arraysEqual(images, home.images || [])) return true;

            if (street !== (home.address?.street || "")) return true;
            if (city !== (home.address?.city || "")) return true;
            if (state !== (home.address?.state || "")) return true;
            if (zip !== (home.address?.zip || "")) return true;

            // Promotions
            if (isFeatured !== (home.isFeatured || false)) return true;
            if (hasFeaturedVideo !== (home.hasFeaturedVideo || false)) return true;
            if (isHomeOfMonth !== (home.isHomeOfMonth || false)) return true;
            if (featuredLabel !== (home.featuredLabel || "")) return true;
            if (homeOfMonthDescription !== (home.homeOfMonthDescription || "")) return true;

            // Room Details
            if (roomDetails.roomPrice !== home.roomDetails?.roomPrice) return true;
            if (roomDetails.bedroomType !== (home.roomDetails?.bedroomType || undefined)) return true;
            if (roomDetails.bathroomType !== (home.roomDetails?.bathroomType || undefined)) return true;
            if (roomDetails.showerType !== (home.roomDetails?.showerType || undefined)) return true;

            // Languages (array order irrelevant usually, but simple sort check or strict check)
            // Assuming strict order for simplicity, or sort
            const currentLangs = [...(roomDetails.languages || [])].sort();
            const originalLangs = [...(home.roomDetails?.languages || [])].sort();
            if (!arraysEqual(currentLangs, originalLangs)) return true;

            if (!customFieldsEqual(roomDetails.customFields, home.roomDetails?.customFields)) return true;

            return false;
        };

        setIsDirty(checkIsDirty());

    }, [
        isOpen, home, setIsDirty,
        title, slug, description, phone, email,
        displayReferenceNumber, showAddress, status,
        taxonomyEntryIds, images,
        street, city, state, zip,
        isFeatured, hasFeaturedVideo, isHomeOfMonth, featuredLabel, homeOfMonthDescription,
        roomDetails
    ]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleSaveInternal();
        // Don't close on save, keep user on the same tab
    };

    const renderTabContent = () => {
        // Helper to render a single category
        const renderCategory = (category: RoomFieldCategory) => {
            const categoryFields = roomDefinitions.filter(f =>
                f.categoryId === category.id &&
                f.isActive &&
                (f.targetType === 'home' || f.targetType === 'both' || !f.targetType)
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

                                {field.type === 'dropdown' && (
                                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 rounded-lg transition-all bg-white/5">
                                        <span className="font-medium text-sm text-white/80">{field.name}</span>
                                        <SimpleSelect
                                            value={roomDetails.customFields[field.id] as string || ""}
                                            onChange={(val) => {
                                                setIsDirty(true);
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: val }
                                                }));
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
                                                setIsDirty(true);
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: e.target.value }
                                                }));
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
                                                setIsDirty(true);
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: e.target.value }
                                                }));
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
                                                    setIsDirty(true);
                                                    setRoomDetails((prev: RoomDetails) => ({
                                                        ...prev,
                                                        customFields: { ...prev.customFields, [field.id]: e.target.value }
                                                    }));
                                                }}
                                                className="w-full rounded-md px-2 pl-3 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="0"
                                            />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseInt(roomDetails.customFields[field.id] as string) || 0;
                                                        setIsDirty(true);
                                                        setRoomDetails((prev: RoomDetails) => ({
                                                            ...prev,
                                                            customFields: { ...prev.customFields, [field.id]: (current + 1).toString() }
                                                        }));
                                                    }}
                                                    className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                                >
                                                    <ChevronUp className="h-2 w-2" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = parseInt(roomDetails.customFields[field.id] as string) || 0;
                                                        setIsDirty(true);
                                                        setRoomDetails((prev: RoomDetails) => ({
                                                            ...prev,
                                                            customFields: { ...prev.customFields, [field.id]: Math.max(0, current - 1).toString() }
                                                        }));
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
                                                onChange={(e) => setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    customFields: { ...prev.customFields, [field.id]: e.target.value }
                                                }))}
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
                                )}</div>
                        ))
                        }
                    </div >
                </div >
            );
        };

        switch (activeTab) {
            case "information":
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
                                            onChange={(e) => setStreet(e.target.value)}
                                            className="w-full rounded-md py-1.5 px-3 text-sm text-left focus:outline-none transition-colors bg-black/30 text-white placeholder-zinc-500 hover:bg-black/50 focus:bg-black/50"
                                            placeholder="Street"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
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
                                                onChange={(e) => setZip(e.target.value)}
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
                                        onChange={(e) => setEmail(e.target.value)}
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
                                                        onChange={(newId) => {
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
            case "rooms":
                // Helper to render a single category
                // Moved to top of function scope

                return (
                    /* 4-Column Grid Layout */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">

                        {/* Column 1: General Info & Col 1 Categories */}
                        <div className="space-y-6">
                            {/* Fixed Fields Section (General Room Info) */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-4 pb-2">
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
                                                onChange={(e) => setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: parseFloat(e.target.value) || undefined }))}
                                                className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-black/30 text-white placeholder-zinc-600 hover:bg-black/50 focus:bg-black/50"
                                                placeholder="0.00"
                                            />
                                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: (prev.roomPrice || 0) + 1 }))}
                                                    className="p-0.5 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                                                >
                                                    <ChevronUp className="h-2 w-2" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: Math.max(0, (prev.roomPrice || 0) - 1) }))}
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
                                            onChange={(val) => setRoomDetails((prev: RoomDetails) => ({ ...prev, bedroomType: val }))}
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
                                            onChange={(val) => setRoomDetails((prev: RoomDetails) => ({ ...prev, bathroomType: val }))}
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
                                            onChange={(val) => setRoomDetails((prev: RoomDetails) => ({ ...prev, showerType: val }))}
                                            options={fixedFieldOptions.filter(o => o.fieldType === 'shower').map(o => o.value)}
                                            placeholder="Select..."
                                            className="w-32 text-sm"
                                        />
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

                            {/* Custom Categories: Column 1 */}
                            {roomCategories
                                .filter(c => (c.columnNumber === 1 || (!c.columnNumber)) && c.section === 'room_details') // Default to Col 1 if null
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

                    </div >
                );
            case "gallery":
                return (
                    <div className="space-y-6">
                        <div className="bg-[#0b1115] border border-white/5 rounded-lg p-6">
                            {!galleryFolderId || !title ? (
                                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                                    <p className="text-zinc-400 mb-2">Location Classification and Name Required</p>
                                    <p className="text-sm text-zinc-500">Please select a Location Classification (Taxonomy) and enter the Home Name to access the gallery.</p>
                                </div>
                            ) : (
                                <MediaGallery
                                    folderId={galleryFolderId}
                                    title={`${title} Gallery`}
                                    selectedUrls={images}
                                    onSelectionChange={setImages}
                                />
                            )}
                        </div>
                    </div>
                );
            case "provider":
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
            case "location":
                // Render only location_details categories
                const hasLocationFields = roomDefinitions.some(f =>
                    f.isActive && (f.targetType === 'home' || f.targetType === 'both') &&
                    roomCategories.find(c => c.id === f.categoryId)?.section === 'location_details'
                );

                if (!hasLocationFields) {
                    return (
                        <div className="p-8 text-center text-zinc-500">
                            No location details fields configured.
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        {/* Column 1 */}
                        <div className="space-y-6">
                            {roomCategories
                                .filter(c => c.section === 'location_details' && (c.columnNumber === 1 || !c.columnNumber))
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
                    </div>
                );
            default:
                return null;
        }
    };
    // Close Handler
    const [showCloseWarning, setShowCloseWarning] = useState(false);

    const handleCloseInternal = () => {
        if (isDirty) {
            setShowCloseWarning(true);
        } else {
            onClose();
        }
    };

    const handleDiscardChanges = () => {
        setShowCloseWarning(false);
        setIsDirty(false); // Clear dirty state
        onClose();
    };

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={handleCloseInternal}
                title={isEditing ? "Edit Home" : "Add Home"}
                subtitle={isEditing ? "Update home details and settings" : "Add a new residential care home"}
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
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                                        ${isActive
                                            ? "border-accent text-white"
                                            : "border-transparent text-zinc-400 hover:text-white hover:border-white/10"
                                        }
                                    `}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? "text-accent" : ""}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                form="home-form"
                                disabled={!isDirty || isSubmitting}
                                className="ml-4 mr-2 md:mr-0 p-[5px] md:w-auto md:h-auto md:px-6 md:py-1.5 flex items-center justify-center text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-black/20"
                            >
                                {isSubmitting ? (
                                    "Saving..."
                                ) : (
                                    <>
                                        <span className="hidden md:inline">{isEditing ? "Update Home" : "Create Home"}</span>
                                        <Save className="h-7 w-7 md:hidden" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                }
            >
                {renderTabContent()}

            </SlidePanel>

            <ConfirmationModal
                isOpen={showCloseWarning}
                onClose={() => setShowCloseWarning(false)}
                onConfirm={handleDiscardChanges}
                title="Unsaved Changes"
                message="You have unsaved changes. Are you sure you want to close? Your changes will be lost."
                confirmLabel="Discard Changes"
                cancelLabel="Keep Editing"
                isDangerous={true}
            />
        </>
    );
}
