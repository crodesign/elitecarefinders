"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { MediaGallery } from "@/components/admin/media/MediaGallery";
import { FacilityInformationTab } from "./forms/facility/FacilityInformationTab";
import { FacilityRoomsTab } from "./forms/facility/FacilityRoomsTab";
import { FacilityLocationTab } from "./forms/facility/FacilityLocationTab";
import { FacilityGalleryTab } from "./forms/facility/FacilityGalleryTab";
import { FacilityProviderTab } from "./forms/facility/FacilityProviderTab";
import { ensureLocationFolders } from "@/lib/services/mediaFolderService";
import { useNotification } from "@/contexts/NotificationContext";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

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
    const { isDirty, setIsDirty, registerSaveHandler } = useUnsavedChanges();
    const router = useRouter(); // Import useRouter here implicitly by variable name change? No, check import
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
        // Kept for prop compatibility
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

    // Media Gallery State
    const [galleryFolderId, setGalleryFolderId] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [teamImages, setTeamImages] = useState<string[]>([]);

    // Fetch Gallery Folder based on taxonomy location (matches Home system)
    useEffect(() => {
        const fetchFolder = async () => {
            // If we already have a folder ID, do NOT update it automatically on location change
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
                        if (found) found;
                    }
                }
                return null;
            };

            if (locationTaxonomy && locationTaxonomy.entries) {
                const selectedEntryId = taxonomyIds.find(id => {
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
                    const id = await ensureLocationFolders(stateName, derivedCity, title, 'facility');
                    setGalleryFolderId(id);
                } catch (error) {
                    console.error("Error ensuring location folders:", error);
                    setGalleryFolderId(null);
                }
            }
        };
        fetchFolder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, city, title, taxonomyIds, availableTaxonomies, galleryFolderId]);

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

    // Reset tab on open
    useEffect(() => {
        if (isOpen) {
            if (!searchParams.get('tab')) {
                setActiveTab("information");
            }
        }
    }, [isOpen, searchParams]);

    // Reset or populate form
    useEffect(() => {
        if (isOpen) {
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

                // Images
                setImages(facility.images || []);
                setTeamImages(facility.teamImages || []);
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

                // Images
                setImages([]);
                setTeamImages([]);
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

            if (!facility) {
                // New Facility Mode
                if (title || slug || description || licenseNumber || capacity) return true;
                if (status !== 'published') return true;
                if (taxonomyIds.length > 0) return true;
                if (street || city || state || zip) return true;
                if (phone || email) return true;
                if (images.length > 0) return true;
                if (teamImages.length > 0) return true;

                // Promotions
                if (isFeatured || hasFeaturedVideo || isFacilityOfMonth || featuredLabel || facilityOfMonthDescription) return true;

                // Room Details
                if (Object.keys(roomDetails.customFields).length > 0) return true;
                if (roomDetails.roomPrice || roomDetails.bedroomType || roomDetails.bathroomType || roomDetails.showerType || (roomDetails.languages && roomDetails.languages.length > 0)) return true;

                return false;
            }

            // Edit Mode - compare against facility prop
            if (title !== facility.title) return true;
            if (slug !== facility.slug) return true;
            if (description !== (facility.description || "")) return true;
            if (licenseNumber !== (facility.licenseNumber || "")) return true;
            // capacity can be number or string ""
            const currentCapacity = capacity === "" ? null : Number(capacity);
            if (currentCapacity !== (facility.capacity || null)) return true;

            if (status !== (facility.status || 'published')) return true;

            if (!arraysEqual(taxonomyIds, facility.taxonomyIds || [])) return true;
            if (!arraysEqual(images, facility.images || [])) return true;
            if (!arraysEqual(teamImages, (facility as any).teamImages || [])) return true;

            if (street !== (facility.address?.street || "")) return true;
            if (city !== (facility.address?.city || "")) return true;
            if (state !== (facility.address?.state || "")) return true;
            if (zip !== (facility.address?.zip || "")) return true;

            if (phone !== ((facility as any).phone || "")) return true;
            if (email !== ((facility as any).email || "")) return true;

            // Promotions - casts needed as per existing code structure
            if (isFeatured !== ((facility as any).isFeatured || false)) return true;
            if (hasFeaturedVideo !== ((facility as any).hasFeaturedVideo || false)) return true;
            if (isFacilityOfMonth !== ((facility as any).isFacilityOfMonth || false)) return true;
            if (featuredLabel !== ((facility as any).featuredLabel || "")) return true;
            if (facilityOfMonthDescription !== ((facility as any).facilityOfMonthDescription || "")) return true;

            // Room Details
            if (roomDetails.roomPrice !== (facility as any).roomDetails?.roomPrice) return true;
            if (roomDetails.bedroomType !== ((facility as any).roomDetails?.bedroomType || undefined)) return true;
            if (roomDetails.bathroomType !== ((facility as any).roomDetails?.bathroomType || undefined)) return true;
            if (roomDetails.showerType !== ((facility as any).roomDetails?.showerType || undefined)) return true;

            // Languages
            const currentLangs = [...(roomDetails.languages || [])].sort();
            const originalLangs = [...((facility as any).roomDetails?.languages || [])].sort();
            if (!arraysEqual(currentLangs, originalLangs)) return true;

            if (!customFieldsEqual(roomDetails.customFields, (facility as any).roomDetails?.customFields)) return true;

            return false;
        };

        setIsDirty(checkIsDirty());

    }, [
        isOpen, facility, setIsDirty,
        title, slug, description, licenseNumber, capacity,
        status, taxonomyIds, images, teamImages,
        street, city, state, zip, phone, email,
        isFeatured, hasFeaturedVideo, isFacilityOfMonth, featuredLabel, facilityOfMonthDescription,
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
                } as any),
                images,
                teamImages,
                roomDetails,
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
        await handleSaveInternal();
        // Don't close on save, keep user on the same tab
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "information":
                return (
                    <FacilityInformationTab
                        title={title}
                        setTitle={setTitle}
                        slug={slug}
                        setSlug={setSlug}
                        description={description}
                        setDescription={setDescription}
                        street={street}
                        setStreet={setStreet}
                        city={city}
                        setCity={setCity}
                        state={state}
                        setState={setState}
                        zip={zip}
                        setZip={setZip}
                        phone={phone}
                        setPhone={setPhone}
                        email={email}
                        setEmail={setEmail}
                        status={status}
                        setStatus={setStatus}
                        taxonomyIds={taxonomyIds}
                        setTaxonomyIds={setTaxonomyIds}
                        availableTaxonomies={availableTaxonomies}
                        isFeatured={isFeatured}
                        setIsFeatured={setIsFeatured}
                        hasFeaturedVideo={hasFeaturedVideo}
                        setHasFeaturedVideo={setHasFeaturedVideo}
                        isFacilityOfMonth={isFacilityOfMonth}
                        setIsFacilityOfMonth={setIsFacilityOfMonth}
                        featuredLabel={featuredLabel}
                        setFeaturedLabel={setFeaturedLabel}
                        isCustomLabelMode={isCustomLabelMode}
                        setIsCustomLabelMode={setIsCustomLabelMode}
                        labelSearch={labelSearch}
                        setLabelSearch={setLabelSearch}
                        showLabelDropdown={showLabelDropdown}
                        setShowLabelDropdown={setShowLabelDropdown}
                        facilityOfMonthDescription={facilityOfMonthDescription}
                        setFacilityOfMonthDescription={setFacilityOfMonthDescription}
                        setIsDirty={setIsDirty}
                        setManagingTaxonomy={setManagingTaxonomy}
                    />
                );
            case "rooms":
                return (
                    <FacilityRoomsTab
                        roomDetails={roomDetails}
                        setRoomDetails={setRoomDetails}
                        setIsDirty={setIsDirty}
                        roomCategories={roomCategories}
                        roomDefinitions={roomDefinitions}
                        fixedFieldOptions={fixedFieldOptions}
                        invalidEmailFields={invalidEmailFields}
                        setInvalidEmailFields={setInvalidEmailFields}
                    />
                );
            case "location":
                return (
                    <FacilityLocationTab
                        roomDetails={roomDetails}
                        setRoomDetails={setRoomDetails}
                        setIsDirty={setIsDirty}
                        roomCategories={roomCategories}
                        roomDefinitions={roomDefinitions}
                        fixedFieldOptions={fixedFieldOptions}
                        fixedFieldIcons={fixedFieldIcons}
                        invalidEmailFields={invalidEmailFields}
                        setInvalidEmailFields={setInvalidEmailFields}
                    />
                );
            case "gallery":
                return (
                    <FacilityGalleryTab
                        title={title}
                        galleryFolderId={galleryFolderId}
                        images={images}
                        setImages={setImages}
                        teamImages={teamImages}
                        setTeamImages={setTeamImages}
                        setIsDirty={setIsDirty}
                        isDirty={isDirty}
                    />
                );
            case "provider":
                return (
                    <FacilityProviderTab
                        roomDetails={roomDetails}
                        setRoomDetails={setRoomDetails}
                        setIsDirty={setIsDirty}
                        roomCategories={roomCategories}
                        roomDefinitions={roomDefinitions}
                        invalidEmailFields={invalidEmailFields}
                        setInvalidEmailFields={setInvalidEmailFields}
                    />
                );
            default:
                return null;
        }
    };
    // Close Handler
    const [showCloseWarning, setShowCloseWarning] = useState(false);
    const [showDisabledTabAlert, setShowDisabledTabAlert] = useState(false);

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

    // Compute whether all required fields are filled (for new records only)
    const findEntryInTree = (entries: any[], id: string): boolean =>
        entries.some(e => e.id === id || (e.children && findEntryInTree(e.children, id)));
    const facilityTypeTaxonomy = availableTaxonomies.find(t => t.singularName === 'Facility Type' || t.name === 'Facility Type');
    const locationTaxonomy = availableTaxonomies.find(t => t.singularName === 'Location' || t.name === 'Location' || t.slug === 'location');
    const hasFacilityType = facilityTypeTaxonomy ? taxonomyIds.some(id => findEntryInTree(facilityTypeTaxonomy.entries ?? [], id)) : true;
    const hasLocation = locationTaxonomy ? taxonomyIds.some(id => findEntryInTree(locationTaxonomy.entries ?? [], id)) : true;
    const canCreate = !!title.trim() && hasFacilityType && hasLocation;

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={handleCloseInternal}
                title={isEditing ? "Editing Facility" : "Add New Facility"}
                subtitle={isEditing ? (title || facility?.title || "Update facility details") : "Create a new facility listing"}
                fullScreen
                contentClassName={activeTab === 'gallery' ? 'flex-1 overflow-hidden p-6 flex flex-col' : 'flex-1 overflow-y-auto p-6'}
                headerChildren={
                    <div className="flex items-center justify-between pl-4 pr-6 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>
                        <div className="flex items-end overflow-visible gap-0.5 pt-2 px-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                const isDisabled = !facility?.id && tab.id !== 'information';
                                // Tab color matches the border color exactly
                                const tabColor = 'var(--surface-tab)';

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        aria-disabled={isDisabled}
                                        onClick={() => {
                                            if (isDisabled) {
                                                setShowDisabledTabAlert(true);
                                                return;
                                            }
                                            handleTabChange(tab.id);
                                        }}
                                        className={`
                                            relative flex items-center gap-2 px-4 text-sm font-medium
                                            rounded-tl-lg rounded-tr-lg whitespace-nowrap
                                            transition-all duration-150 select-none
                                            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                                            ${isActive
                                                ? 'pt-[10px] pb-[11px] text-content-primary z-10'
                                                : 'pt-2 pb-2 bg-transparent text-content-secondary hover:text-content-primary hover:bg-surface-hover'
                                            }
                                        `}
                                        style={isActive ? { backgroundColor: tabColor } : undefined}
                                    >
                                        {/* Left concave corner notch (active only) */}
                                        {isActive && (
                                            <span className="absolute bottom-0 left-[-8px] w-2 h-2 pointer-events-none">
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M8 0 L8 8 L0 8 A 8 8 0 0 0 8 0 Z" fill={tabColor} />
                                                </svg>
                                            </span>
                                        )}
                                        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-accent' : ''}`} />
                                        {tab.label}
                                        {/* Right concave corner notch (active only) */}
                                        {isActive && (
                                            <span className="absolute bottom-0 right-[-8px] w-2 h-2 pointer-events-none">
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M0 0 L0 8 L8 8 A 8 8 0 0 1 0 0 Z" fill={tabColor} />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-surface-input p-1 rounded-lg mr-2 hidden md:flex">
                                <button
                                    type="button"
                                    onClick={() => { setStatus('published'); setIsDirty(true); }}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${status === 'published' ? "bg-emerald-600 text-white shadow-sm" : "text-content-muted hover:text-content-secondary"}`}
                                >
                                    Published
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStatus('draft'); setIsDirty(true); }}
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${status === 'draft' ? "bg-surface-hover text-white shadow-sm" : "text-content-muted hover:text-content-secondary"}`}
                                >
                                    Draft
                                </button>
                            </div>
                            <button
                                type="submit"
                                form="facility-form"
                                disabled={isEditing ? (!isDirty || isSubmitting) : (!canCreate || isSubmitting)}
                                className="ml-4 mr-2 md:mr-0 p-[5px] md:w-auto md:h-auto md:px-6 md:py-1.5 flex items-center justify-center text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-black/20"
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
                    </div>
                }
            >
                {error && (
                    <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* Tab Content */}
                <form id="facility-form" onSubmit={handleSubmit} className="flex flex-col flex-1" onChange={handleFormChange}>
                    <div className={activeTab === 'gallery' ? 'flex flex-col flex-1 min-h-0' : 'flex-1 min-h-full'}>
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
                showOverlay={true}
                stackLevel={1}
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

            <ConfirmationModal
                isOpen={showDisabledTabAlert}
                onClose={() => setShowDisabledTabAlert(false)}
                onConfirm={() => setShowDisabledTabAlert(false)}
                title="Action Required"
                message="Please fill out required fields (Title, Facility Type, Location) and save the Facility before accessing other tabs."
                confirmLabel="Understood"
                hideCancel={true}
            />
        </>
    );
}

