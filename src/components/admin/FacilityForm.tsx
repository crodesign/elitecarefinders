"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building2, Bed, MapPin, Phone, FileText, Hash, Globe, Tags, Check, Ban, Plus, X, Layers, Save, Circle, Users, MapPinned, ChevronUp, ChevronDown, Mail, DollarSign, Youtube, Search, Image } from "lucide-react";
import { ICON_MAP } from "@/components/ui/IconPicker";
import type {
    Facility,
    Taxonomy,
    RoomFieldCategory,
    RoomFieldDefinition,
    RoomFixedFieldOption,
    RoomDetails,
    VideoEntry,
    SeoFields
} from "@/types";
import { getTaxonomies } from "@/lib/services/taxonomyService";
import { updateFacilitySeo } from "@/lib/services/facilityService";
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
import { DraftApprovalBanner } from "./DraftApprovalBanner";
import { TaxonomySelector } from "./TaxonomySelector";
import { SimpleSelect } from "./SimpleSelect";
import { EntryTree } from "./taxonomy/EntryTree";
import { MediaGallery } from "@/components/admin/media/MediaGallery";
import { FacilityInformationTab } from "./forms/facility/FacilityInformationTab";
import { FacilityRoomsTab } from "./forms/facility/FacilityRoomsTab";
import { FacilityLocationTab } from "./forms/facility/FacilityLocationTab";
import { FacilityGalleryTab } from "./forms/facility/FacilityGalleryTab";
import { FacilityVideosTab } from "./forms/facility/FacilityVideosTab";
import { FacilityProviderTab } from "./forms/facility/FacilityProviderTab";
import { FacilitySeoTab } from "./forms/facility/FacilitySeoTab";
import { ensureLocationFolders } from "@/lib/services/mediaFolderService";
import { useNotification } from "@/contexts/NotificationContext";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useAuth } from "@/contexts/AuthContext";
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

type TabId = "information" | "rooms" | "location" | "gallery" | "videos" | "provider" | "seo";

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
    const { isLocalUser, isLocationManager } = useAuth();
    const isFieldLocked = isLocalUser || isLocationManager;
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
        if (tab && ["information", "rooms", "location", "gallery", "videos", "provider", "seo"].includes(tab)) {
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

    // Track original title for rename detection
    const originalTitleRef = useRef<string>("");

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
    const [excerpt, setExcerpt] = useState("");
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

    // SEO State
    const [seo, setSeo] = useState<SeoFields>({ indexable: true });

    async function handleSaveSeo() {
        if (!facility?.id) return;
        await updateFacilitySeo(facility.id, seo);
    }

    // Media Gallery State
    const [galleryFolderId, setGalleryFolderId] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [teamImages, setTeamImages] = useState<string[]>([]);
    const [cuisineImages, setCuisineImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<VideoEntry[]>([]);

    // Fetch Gallery Folder - Only on initial load for EXISTING facilities
    // For NEW facilities, folder is created in the save handler.
    useEffect(() => {
        const fetchFolder = async () => {
            if (galleryFolderId) return;
            if (!facility?.id) return; // New facility — folder created in save handler

            const savedTitle = facility.title;
            if (!savedTitle) return;

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
                const selectedEntryId = taxonomyIds.find(id => {
                    return !!findEntryAndPath(locationTaxonomy.entries, id);
                });

                if (selectedEntryId) {
                    const result = findEntryAndPath(locationTaxonomy.entries, selectedEntryId);
                    if (result) {
                        const { path } = result;
                        if (path.length > 0) {
                            derivedState = path[0].name;
                            derivedCity = path[path.length - 1].name;
                            hasLocationSelection = true;
                        }
                    }
                }
            }

            const validLocation = hasLocationSelection || (state && city);

            if (validLocation) {
                let stateName = derivedState;
                if (!hasLocationSelection && derivedState.length === 2) {
                    const stateObj = US_STATES.find(s => s.code === derivedState || s.name === derivedState);
                    stateName = stateObj ? stateObj.name : derivedState;
                }

                try {
                    const id = await ensureLocationFolders(stateName, derivedCity, savedTitle, 'facility');
                    setGalleryFolderId(id);
                } catch (error) {
                    console.error("Error ensuring location folders:", error);
                    setGalleryFolderId(null);
                }
            }
        };
        fetchFolder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, city, taxonomyIds, availableTaxonomies, galleryFolderId, facility?.id]);

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
        ...(hasLocationFields ? [{ id: "location" as const, label: "Location Details", icon: MapPinned }] : []),
        { id: "gallery", label: "Gallery", icon: Image },
        { id: "videos", label: "Videos", icon: Youtube },
        ...(hasProviderFields ? [{ id: "provider" as const, label: "Provider Details", icon: Users }] : []),
        ...(!isFieldLocked ? [{ id: "seo" as const, label: "SEO & Metadata", icon: Search }] : []),
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
                originalTitleRef.current = facility.title;
                setSlug(facility.slug);
                setDescription(facility.description || "");
                setExcerpt(facility.excerpt || "");
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

                // Images & Videos
                setImages(facility.images || []);
                setTeamImages(facility.teamImages || []);
                setCuisineImages(facility.cuisineImages || []);
                setVideos(facility.videos || []);

                // SEO
                setSeo((facility as any).seo ?? { indexable: true });
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
                setCuisineImages([]);
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

                // Reset SEO
                setSeo({ indexable: true });
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
                if (cuisineImages.length > 0) return true;

                // Promotions
                if (isFeatured || hasFeaturedVideo || isFacilityOfMonth || featuredLabel || facilityOfMonthDescription) return true;

                // Room Details
                if (Object.keys(roomDetails.customFields).length > 0) return true;
                if (roomDetails.roomPrice || (roomDetails.bedroomTypes && roomDetails.bedroomTypes.length > 0) || roomDetails.bathroomType || roomDetails.showerType || (roomDetails.languages && roomDetails.languages.length > 0)) return true;

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
            if (!arraysEqual(cuisineImages, (facility as any).cuisineImages || [])) return true;
            if (JSON.stringify(videos) !== JSON.stringify(facility.videos || [])) return true;

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

            const currentBedroomTypes = [...(roomDetails.bedroomTypes || [])].sort();
            const originalBedroomTypes = [...((facility as any).roomDetails?.bedroomTypes || [])].sort();
            if (!arraysEqual(currentBedroomTypes, originalBedroomTypes)) return true;

            if (roomDetails.bathroomType !== (facility as any).roomDetails?.bathroomType) return true;
            if (roomDetails.showerType !== (facility as any).roomDetails?.showerType) return true;

            const currentRoomTypes = [...(roomDetails.roomTypes || [])].sort();
            const originalRoomTypes = [...((facility as any).roomDetails?.roomTypes || [])].sort();
            if (!arraysEqual(currentRoomTypes, originalRoomTypes)) return true;

            // Languages
            const currentLangs = [...(roomDetails.languages || [])].sort();
            const originalLangs = [...((facility as any).roomDetails?.languages || [])].sort();
            if (!arraysEqual(currentLangs, originalLangs)) return true;

            // Level of Care
            const currentLOC = [...(roomDetails.levelOfCare || [])].sort();
            const originalLOC = [...((facility as any).roomDetails?.levelOfCare || [])].sort();
            if (!arraysEqual(currentLOC, originalLOC)) return true;

            if (!customFieldsEqual(roomDetails.customFields, (facility as any).roomDetails?.customFields)) return true;

            return false;
        };

        setIsDirty(checkIsDirty());

    }, [
        isOpen, facility, setIsDirty,
        title, slug, description, licenseNumber, capacity,
        status, taxonomyIds, images, teamImages, cuisineImages, videos,
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

        // SLUG OVERWRITE FIX: Generate the final slug synchronously BEFORE saving to the database
        // so that if the title changed, we don't accidentally send the old cached `slug` state variable back to the DB!
        const finalSlug = (facility?.id && title !== originalTitleRef.current)
            ? (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : slug)
            : slug;

        let finalImages = images;
        let finalTeamImages = teamImages;
        let finalCuisineImages = cuisineImages;

        try {
            // ── Transparent Rename Detection ──
            if (facility?.id && title !== originalTitleRef.current && originalTitleRef.current) {
                console.log(`[FacilityForm] Title changed: "${originalTitleRef.current}" → "${title}", triggering rename...`);
                try {
                    const renameRes = await fetch('/api/media/rename-entity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            entityType: 'facility',
                            entityId: facility.id,
                            oldTitle: originalTitleRef.current,
                            newTitle: title,
                            folderId: galleryFolderId,
                        }),
                    });
                    const renameData = await renameRes.json();
                    if (!renameRes.ok) {
                        console.error('[FacilityForm] Rename failed:', renameData.error);
                    } else {
                        console.log('[FacilityForm] Rename succeeded:', renameData.results);
                        originalTitleRef.current = title;

                        // IMPORTANT: Update local arrays with renamed files so onSave doesn't overwrite the DB with the old ones!
                        if (renameData.renamedFiles && Object.keys(renameData.renamedFiles).length > 0) {
                            const mapUrl = (url: string) => renameData.renamedFiles[url] || url;
                            finalImages = images.map(mapUrl);
                            setImages(finalImages);
                            finalTeamImages = teamImages.map(mapUrl);
                            setTeamImages(finalTeamImages);
                            finalCuisineImages = cuisineImages.map(mapUrl);
                            setCuisineImages(finalCuisineImages);
                        }
                    }
                } catch (renameErr) {
                    console.error('[FacilityForm] Rename API error:', renameErr);
                }
            }

            const formData: Partial<Facility> = {
                title,
                slug: finalSlug,
                description,
                excerpt,
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
                images: finalImages,
                teamImages: finalTeamImages,
                cuisineImages: finalCuisineImages,
                videos,
                roomDetails,
            };
            // For BOTH new and existing facilities: ensure the gallery folder is in the right location.
            // If the city/state changed, ensureLocationFolders will move the existing folder.
            if (title) {
                try {
                    const locationTaxonomy = availableTaxonomies.find(t =>
                        t.slug === 'location' || t.slug === 'locations' || t.name === 'Location' || t.name === 'Locations'
                    );
                    let stateName = state || '';
                    let cityName = city || '';
                    let hasTaxonomyLocation = false;

                    if (locationTaxonomy?.entries) {
                        const findEntry = (entries: any[], id: string, path: any[] = []): any[] | null => {
                            for (const e of entries) {
                                const p = [...path, e];
                                if (e.id === id) return p;
                                if (e.children) { const r = findEntry(e.children, id, p); if (r) return r; }
                            }
                            return null;
                        };
                        for (const tid of taxonomyIds) {
                            const p = findEntry(locationTaxonomy.entries, tid);
                            if (p && p.length > 0) {
                                stateName = p[0].name;
                                cityName = p[p.length - 1].name;
                                hasTaxonomyLocation = true;
                                break;
                            }
                        }
                    }

                    if (hasTaxonomyLocation || (stateName && cityName)) {
                        if (stateName.length === 2 && !hasTaxonomyLocation) {
                            const stateObj = US_STATES.find(s => s.code === stateName);
                            if (stateObj) stateName = stateObj.name;
                        }
                        const fid = await ensureLocationFolders(stateName, cityName, title, 'facility', galleryFolderId);
                        if (!galleryFolderId) setGalleryFolderId(fid);
                    }
                } catch (err) {
                    console.error("Error creating/moving gallery folder on save:", err);
                }
            }

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
                        isLocalUser={isFieldLocked}
                        title={title}
                        setTitle={setTitle}
                        slug={slug}
                        setSlug={setSlug}
                        description={description}
                        setDescription={setDescription}
                        excerpt={excerpt}
                        setExcerpt={setExcerpt}
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
            case "videos":
                return (
                    <FacilityVideosTab
                        videos={videos}
                        setVideos={setVideos}
                        setIsDirty={setIsDirty}
                        title={title}
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
                        cuisineImages={cuisineImages}
                        setCuisineImages={setCuisineImages}
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
            case "seo":
                return (
                    <FacilitySeoTab
                        seo={seo}
                        onChange={(field, value) => setSeo(prev => ({ ...prev, [field]: value }))}
                        setIsDirty={setIsDirty}
                        defaultTitle={title || undefined}
                        defaultDescription={description || undefined}
                        defaultImage={images[0] || undefined}
                        recordId={facility?.id}
                        onSaveSeo={facility?.id ? handleSaveSeo : undefined}
                    />
                );
            default:
                return null;
        }
    };
    // Close Handler
    const [showDisabledTabAlert, setShowDisabledTabAlert] = useState(false);

    const handleCloseInternal = () => {
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
                contentClassName={activeTab === 'gallery' ? 'p-4 md:p-6 overflow-y-auto sm:flex-1 sm:overflow-hidden sm:flex sm:flex-col' : activeTab === 'videos' ? 'flex-1 overflow-hidden p-4 md:p-6 flex flex-col' : activeTab === 'information' ? 'flex-1 overflow-hidden flex flex-col p-4 md:p-6' : 'flex-1 overflow-y-auto p-4 md:p-6'}
                actions={
                    <button
                        type="submit"
                        form="facility-form"
                        disabled={isEditing ? (!isDirty || isSubmitting) : (!canCreate || isSubmitting)}
                        className="px-6 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-black/20"
                    >
                        {isSubmitting ? "Saving..." : (isEditing ? "Update Facility" : "Create Facility")}
                    </button>
                }
                headerChildren={
                    <div className="flex items-center justify-between px-4 sm:pr-6 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>
                        <div className="flex flex-1 items-start overflow-visible gap-1 pt-2 px-2 justify-center sm:justify-start">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                const isDisabled = !facility?.id && tab.id !== 'information';
                                // Tab color matches the border color exactly
                                const tabColor = 'var(--nav-active-bg)';

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
                                            whitespace-nowrap
                                            transition-colors duration-150 select-none
                                            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                                            ${isActive
                                                ? 'pt-[10px] pb-[11px] text-content-primary z-10 rounded-tl-lg rounded-tr-lg'
                                                : 'form-tab-hover pt-2 pb-2 bg-transparent text-content-muted hover:text-content-secondary rounded-lg'
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
                                        <span className="hidden sm:inline">{tab.label}</span>
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
                            {!isFieldLocked && (
                                <div className="flex bg-surface-input p-1 rounded-lg hidden md:flex" style={{ border: '2px solid var(--form-border)' }}>
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
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${status === 'draft' ? "bg-surface-hover text-content-primary shadow-sm" : "text-content-muted hover:text-content-secondary"}`}
                                    >
                                        Draft
                                    </button>
                                </div>
                            )}
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
                <form id="facility-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" onChange={handleFormChange}>
                    {facility?.id && (facility as any).local_user_draft_status === 'pending_review' && (facility as any).local_user_draft && (
                        <DraftApprovalBanner
                            entityId={facility.id}
                            entityType="facility"
                            draft={(facility as any).local_user_draft}
                            onApprove={async () => {
                                await fetch('/api/admin/listing-draft', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ entityId: facility.id, entityType: 'facility', action: 'approve' }),
                                });
                            }}
                            onReject={async () => {
                                await fetch('/api/admin/listing-draft', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ entityId: facility.id, entityType: 'facility', action: 'reject' }),
                                });
                            }}
                        />
                    )}
                    <div className={activeTab === 'gallery' ? 'sm:flex sm:flex-col sm:flex-1 sm:min-h-0' : (activeTab === 'videos' || activeTab === 'information') ? 'flex flex-col flex-1 min-h-0' : 'flex-1 min-h-full'}>
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

