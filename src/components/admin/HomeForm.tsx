"use client";

import { useState, useEffect, useRef } from "react";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Home, Bed, Image, Users, MapPin, Phone, FileText, Hash, Globe, Tags, Check, Ban, Plus, X, Layers, Save, Circle, Minus, ChevronUp, ChevronDown, Mail, DollarSign, Youtube, Search } from "lucide-react";
import { ICON_MAP } from "@/components/ui/IconPicker";
import { FEATURED_LABELS, US_STATES } from "@/lib/constants/formConstants";
import type {
    Home as HomeType,
    Taxonomy,
    RoomFieldCategory,
    RoomFieldDefinition,
    RoomFixedFieldOption,
    RoomDetails,
    VideoEntry,
    SeoFields
} from "@/types";
import { getTaxonomies } from "@/lib/services/taxonomyService";
import { updateHomeSeo } from "@/lib/services/homeService";
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
import { HomeInformationTab } from "./forms/home/HomeInformationTab";
import { HomeRoomsTab } from "./forms/home/HomeRoomsTab";
import { HomeLocationTab } from "./forms/home/HomeLocationTab";
import { HomeProviderTab } from "./forms/home/HomeProviderTab";
import { HomeGalleryTab } from "./forms/home/HomeGalleryTab";
import { HomeVideosTab } from "./forms/home/HomeVideosTab";
import { HomeSeoTab } from "./forms/home/HomeSeoTab";
import { TaxonomySelector } from "./TaxonomySelector";
import { SimpleSelect } from "./SimpleSelect";
import { EntryTree } from "./taxonomy/EntryTree";
import { MediaGallery } from "@/components/admin/media/MediaGallery";
import { ensureLocationFolders } from "@/lib/services/mediaFolderService";
import { useNotification } from "@/contexts/NotificationContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";



interface HomeFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<HomeType>) => Promise<void>;
    home?: HomeType | null;
}

type TabId = "information" | "rooms" | "location" | "gallery" | "videos" | "provider" | "seo";

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
}





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

    // Form State
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // ... (rest of state items, simplified for search)

    // Use ref to keep track of latest handleSaveInternal without re-registering
    const saveHandlerRef = useRef<() => Promise<boolean>>(async () => false);

    // Track original title for rename detection
    const originalTitleRef = useRef<string>("");

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

        // SLUG OVERWRITE FIX: Generate the final slug synchronously BEFORE saving to the database
        // so that if the title changed, we don't accidentally send the old cached `slug` state variable back to the DB!
        const finalSlug = (home?.id && title !== originalTitleRef.current)
            ? (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : slug)
            : slug;

        let finalImages = images;
        let finalTeamImages = teamImages;
        let finalCuisineImages = cuisineImages;

        try {
            // ── Transparent Rename Detection ──
            // If title changed on an existing entity, call rename API first
            if (home?.id && title !== originalTitleRef.current && originalTitleRef.current) {
                console.log(`[HomeForm] Title changed: "${originalTitleRef.current}" → "${title}", triggering rename...`);
                try {
                    const renameRes = await fetch('/api/media/rename-entity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            entityType: 'home',
                            entityId: home.id,
                            oldTitle: originalTitleRef.current,
                            newTitle: title,
                            folderId: galleryFolderId,
                        }),
                    });
                    const renameData = await renameRes.json();
                    if (!renameRes.ok) {
                        console.error('[HomeForm] Rename failed:', renameData.error);
                    } else {
                        console.log('[HomeForm] Rename succeeded:', renameData.results);
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
                    console.error('[HomeForm] Rename API error:', renameErr);
                }
            }

            const formData: Partial<HomeType> = {
                title,
                slug: finalSlug,
                description,
                excerpt,
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
                images: finalImages,
                teamImages: finalTeamImages,
                cuisineImages: finalCuisineImages,
                videos,
                roomDetails,
            };

            // For BOTH new and existing homes: ensure the gallery folder is in the right location.
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
                        for (const tid of taxonomyEntryIds) {
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
                        const fid = await ensureLocationFolders(stateName, cityName, title, 'home', galleryFolderId);
                        if (!galleryFolderId) setGalleryFolderId(fid);
                    }
                } catch (err) {
                    console.error("Error creating/moving gallery folder on save:", err);
                }
            }

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
    const [displayReferenceNumber, setDisplayReferenceNumber] = useState(true);
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

    // SEO State
    const [seo, setSeo] = useState<SeoFields>({ indexable: true });

    async function handleSaveSeo() {
        if (!home?.id) return;
        await updateHomeSeo(home.id, seo);
    }

    // Media Gallery State
    const [galleryFolderId, setGalleryFolderId] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [teamImages, setTeamImages] = useState<string[]>([]);
    const [cuisineImages, setCuisineImages] = useState<string[]>([]);
    const [videos, setVideos] = useState<VideoEntry[]>([]);

    // Fetch Gallery Folder - Only on initial load for EXISTING homes
    // For NEW homes, folder is created in the save handler.
    // This prevents orphaned partial-name folders from being created while typing.
    useEffect(() => {
        const fetchFolder = async () => {
            // Only run for existing homes, and only once
            if (galleryFolderId) return;
            if (!home?.id) return; // New home — folder created in save handler

            // Use the SAVED title from the home record, not the live typing state
            const savedTitle = home.title;
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

            if (validLocation) {
                // Use full state name for folder structure if using address state code
                let stateName = derivedState;
                if (!hasLocationSelection && derivedState.length === 2) {
                    const stateObj = US_STATES.find(s => s.code === derivedState || s.name === derivedState);
                    stateName = stateObj ? stateObj.name : derivedState;
                }

                try {
                    const id = await ensureLocationFolders(stateName, derivedCity, savedTitle, 'home');
                    setGalleryFolderId(id);
                } catch (error) {
                    console.error("Error ensuring location folders:", error);
                    setGalleryFolderId(null);
                }
            }
        };
        fetchFolder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, city, taxonomyEntryIds, availableTaxonomies, galleryFolderId, home?.id]);

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
        ...(hasProviderFields ? [{ id: "provider" as const, label: "Provider Details", icon: Users }] : []),
        { id: "gallery", label: "Gallery", icon: Image },
        { id: "videos", label: "Videos", icon: Youtube },
        { id: "seo", label: "SEO & Metadata", icon: Search },
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

    // Hydration flag to prevent premature dirty state checks
    const isInitializedRef = useRef(false);

    // Reset or populate form
    useEffect(() => {
        if (isOpen) {
            setError(null);
            isInitializedRef.current = false; // Reset hydration flag

            // Only reset to empty if we are explicitly in "Create New Home" mode (isOpen && home is undefined/null)
            // If home is provided, we populate. If it's missing, we reset.
            // Note: The parent component should ensure 'home' is fully loaded before setting isOpen=true for edits.
            if (home) {
                setGalleryFolderId(null); // Reset so fetchFolder re-runs for this home
                setTitle(home.title);
                originalTitleRef.current = home.title;
                setSlug(home.slug);
                setDescription(home.description);
                setExcerpt(home.excerpt || "");
                setPhone(home.phone || "");
                setEmail(home.email || "");
                setDisplayReferenceNumber(home.displayReferenceNumber ?? true);
                setShowAddress(home.showAddress !== false); // default true
                setStatus(((home.status === 'archived' ? 'draft' : home.status) as 'published' | 'draft') || 'published');
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

                // Images & Videos
                setImages(home.images || []);
                setTeamImages(home.teamImages || []);
                setCuisineImages(home.cuisineImages || []);
                setVideos(home.videos || []);

                // SEO
                setSeo(home.seo ?? { indexable: true });

                // Explicitly clear dirty state when we finish populating from a prop
                // We use a timeout to allow the React state queue to flush so checkIsDirty runs against the NEW state
                setTimeout(() => {
                    setIsDirty(false);
                    isInitializedRef.current = true;
                }, 50);

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

                // Reset SEO
                setSeo({ indexable: true });

                // Reset Images
                setGalleryFolderId(null);
                setImages([]);

                // Clear dirty state on reset
                setTimeout(() => {
                    setIsDirty(false);
                    isInitializedRef.current = true;
                }, 50);
            }
        } else {
            isInitializedRef.current = false;
        }
    }, [isOpen, home, setIsDirty]);

    // Auto-generate slug from title if creating
    // Removed to handle in onChange instead to prevent overwriting existing slugs on load
    // useEffect(() => {
    //     if (!isEditing && title) {
    //         setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    //     }
    // }, [title, isEditing]);




    // Check if form state differs from initial/saved state
    useEffect(() => {
        if (!isOpen || !isInitializedRef.current) return;

        const checkIsDirty = () => {
            // Helper for array comparison (order matters, treats null/undefined as empty)
            const arraysEqual = (a: any[] | null | undefined, b: any[] | null | undefined) => {
                const arrA = a || [];
                const arrB = b || [];
                if (arrA.length !== arrB.length) return false;
                return arrA.every((val, index) => val === arrB[index]);
            };

            // Helper for customs fields comparison (treats null/undefined as empty object)
            const customFieldsEqual = (current: Record<string, any> | null | undefined, original: Record<string, any> | null | undefined) => {
                const objCurrent = current || {};
                const objOriginal = original || {};

                // Remove undefined or empty values before comparison to ensure { key: "" } equals {}
                const cleanObj = (obj: Record<string, any>) => {
                    return Object.entries(obj).reduce((acc, [k, v]) => {
                        if (v !== undefined && v !== null && v !== "") {
                            acc[k] = v;
                        }
                        return acc;
                    }, {} as Record<string, any>);
                };

                return JSON.stringify(cleanObj(objCurrent)) === JSON.stringify(cleanObj(objOriginal));
            };

            // Helper to compare rich text by stripping HTML attributes that the editor might add
            const cleanHtml = (html: string | undefined | null) => {
                if (!html) return "";
                // Remove class attributes and other formatting the editor injects on load
                return html.replace(/ class="[^"]*"/g, '').replace(/ dir="[^"]*"/g, '').trim();
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
                if (Object.keys(roomDetails.customFields || {}).length > 0) return true;
                if (roomDetails.roomPrice || roomDetails.bedroomType || roomDetails.bathroomType || roomDetails.showerType || (roomDetails.languages && roomDetails.languages.length > 0)) return true;

                return false;
            }

            // Edit Mode Debug Logging function
            const check = (condition: boolean, field: string, curr: any, orig: any) => {
                if (condition) {
                    console.log(`[HomeForm IS DIRTY]: field '${field}' changed from '${orig}' to '${curr}'`);
                }
                return condition;
            };

            // Edit Mode - compare against home prop
            if (check(title !== home.title, "title", title, home.title)) return true;
            if (check(slug !== home.slug, "slug", slug, home.slug)) return true;
            if (check(cleanHtml(description) !== cleanHtml(home.description), "description", cleanHtml(description), cleanHtml(home.description))) return true;
            if (check(phone !== (home.phone || ""), "phone", phone, home.phone)) return true;
            if (check(email !== (home.email || ""), "email", email, home.email)) return true;
            if (check(displayReferenceNumber !== (home.displayReferenceNumber ?? false), "displayReferenceNumber", displayReferenceNumber, home.displayReferenceNumber)) return true;
            if (check(showAddress !== (home.showAddress !== false), "showAddress", showAddress, home.showAddress)) return true;
            if (check(status !== (home.status || 'published'), "status", status, home.status)) return true;

            if (check(!arraysEqual(taxonomyEntryIds, home.taxonomyEntryIds), "taxonomyEntryIds", taxonomyEntryIds, home.taxonomyEntryIds)) return true;
            if (check(!arraysEqual(images, home.images), "images", images, home.images)) return true;
            if (JSON.stringify(videos) !== JSON.stringify(home.videos || [])) return true;

            if (check(street !== (home.address?.street || ""), "street", street, home.address?.street)) return true;
            if (check(city !== (home.address?.city || ""), "city", city, home.address?.city)) return true;
            if (check(state !== (home.address?.state || ""), "state", state, home.address?.state)) return true;
            if (check(zip !== (home.address?.zip || ""), "zip", zip, home.address?.zip)) return true;

            // Promotions
            if (check(isFeatured !== (home.isFeatured || false), "isFeatured", isFeatured, home.isFeatured)) return true;
            if (check(hasFeaturedVideo !== (home.hasFeaturedVideo || false), "hasFeaturedVideo", hasFeaturedVideo, home.hasFeaturedVideo)) return true;
            if (check(isHomeOfMonth !== (home.isHomeOfMonth || false), "isHomeOfMonth", isHomeOfMonth, home.isHomeOfMonth)) return true;
            if (check(featuredLabel !== (home.featuredLabel || ""), "featuredLabel", featuredLabel, home.featuredLabel)) return true;
            if (check(homeOfMonthDescription !== (home.homeOfMonthDescription || ""), "homeOfMonthDescription", homeOfMonthDescription, home.homeOfMonthDescription)) return true;

            // Room Details
            if (check(roomDetails.roomPrice !== home.roomDetails?.roomPrice && !(roomDetails.roomPrice === undefined && home.roomDetails?.roomPrice === null), "roomPrice", roomDetails.roomPrice, home.roomDetails?.roomPrice)) return true;
            if (check(roomDetails.bedroomType !== (home.roomDetails?.bedroomType || undefined), "bedroomType", roomDetails.bedroomType, home.roomDetails?.bedroomType)) return true;
            if (check(roomDetails.bathroomType !== (home.roomDetails?.bathroomType || undefined), "bathroomType", roomDetails.bathroomType, home.roomDetails?.bathroomType)) return true;
            if (check(roomDetails.showerType !== (home.roomDetails?.showerType || undefined), "showerType", roomDetails.showerType, home.roomDetails?.showerType)) return true;

            // Languages (array order irrelevant usually, but simple sort check or strict check)
            // Assuming strict order for simplicity, or sort
            const currentLangs = [...(roomDetails.languages || [])].sort();
            const originalLangs = [...(home.roomDetails?.languages || [])].sort();
            if (check(!arraysEqual(currentLangs, originalLangs), "languages", currentLangs, originalLangs)) return true;

            if (check(!customFieldsEqual(roomDetails.customFields, home.roomDetails?.customFields), "customFields", roomDetails.customFields, home.roomDetails?.customFields)) return true;

            return false;
        };

        setIsDirty(checkIsDirty());

    }, [
        isOpen, home, setIsDirty,
        title, slug, description, phone, email,
        displayReferenceNumber, showAddress, status,
        taxonomyEntryIds, images, videos,
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
        switch (activeTab) {
            case "information":
                return (
                    <HomeInformationTab
                        displayReferenceNumber={displayReferenceNumber}
                        setDisplayReferenceNumber={setDisplayReferenceNumber}
                        title={title}
                        setTitle={setTitle}
                        slug={slug}
                        setSlug={setSlug}
                        description={description}
                        setDescription={setDescription}
                        excerpt={excerpt}
                        setExcerpt={setExcerpt}
                        isFeatured={isFeatured}
                        setIsFeatured={setIsFeatured}
                        featuredLabel={featuredLabel}
                        setFeaturedLabel={setFeaturedLabel}
                        isCustomLabelMode={isCustomLabelMode}
                        setIsCustomLabelMode={setIsCustomLabelMode}
                        showLabelDropdown={showLabelDropdown}
                        setShowLabelDropdown={setShowLabelDropdown}
                        labelSearch={labelSearch}
                        setLabelSearch={setLabelSearch}
                        hasFeaturedVideo={hasFeaturedVideo}
                        setHasFeaturedVideo={setHasFeaturedVideo}
                        isHomeOfMonth={isHomeOfMonth}
                        setIsHomeOfMonth={setIsHomeOfMonth}
                        homeOfMonthDescription={homeOfMonthDescription}
                        setHomeOfMonthDescription={setHomeOfMonthDescription}
                        showAddress={showAddress}
                        setShowAddress={setShowAddress}
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
                        availableTaxonomies={availableTaxonomies}
                        taxonomyEntryIds={taxonomyEntryIds}
                        setTaxonomyEntryIds={setTaxonomyEntryIds}
                        setManagingTaxonomy={setManagingTaxonomy}
                        setIsDirty={setIsDirty}
                    />
                );
            case "rooms":
                return (
                    <HomeRoomsTab
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
            case "location":
                return (
                    <HomeLocationTab
                        roomCategories={roomCategories}
                        roomDefinitions={roomDefinitions}
                        roomDetails={roomDetails}
                        setRoomDetails={setRoomDetails}
                        setIsDirty={setIsDirty}
                        invalidEmailFields={invalidEmailFields}
                        setInvalidEmailFields={setInvalidEmailFields}
                    />
                );
            case "provider":
                return (
                    <HomeProviderTab
                        roomCategories={roomCategories}
                        roomDefinitions={roomDefinitions}
                        roomDetails={roomDetails}
                        setRoomDetails={setRoomDetails}
                        setIsDirty={setIsDirty}
                        invalidEmailFields={invalidEmailFields}
                        setInvalidEmailFields={setInvalidEmailFields}
                    />
                );
            case "gallery":
                return (
                    <HomeGalleryTab
                        images={images}
                        setImages={setImages}
                        teamImages={teamImages}
                        setTeamImages={setTeamImages}
                        cuisineImages={cuisineImages}
                        setCuisineImages={setCuisineImages}
                        galleryFolderId={galleryFolderId}
                        title={title}
                        setIsDirty={setIsDirty}
                        isDirty={isDirty}
                    />
                );
            case "videos":
                return (
                    <HomeVideosTab
                        videos={videos}
                        setVideos={setVideos}
                        setIsDirty={setIsDirty}
                        title={title}
                    />
                );
            case "seo":
                return (
                    <HomeSeoTab
                        seo={seo}
                        onChange={(field, value) => setSeo(prev => ({ ...prev, [field]: value }))}
                        setIsDirty={setIsDirty}
                        defaultTitle={title || undefined}
                        defaultDescription={description || undefined}
                        defaultImage={images[0] || undefined}
                        recordId={home?.id}
                        onSaveSeo={home?.id ? handleSaveSeo : undefined}
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
    const homeTypeTaxonomy = availableTaxonomies.find(t => t.singularName === 'Home Type' || t.name === 'Home Type');
    const locationTaxonomy = availableTaxonomies.find(t => t.singularName === 'Location' || t.name === 'Location' || t.slug === 'location');
    const hasHomeType = homeTypeTaxonomy ? taxonomyEntryIds.some(id => findEntryInTree(homeTypeTaxonomy.entries ?? [], id)) : true;
    const hasLocation = locationTaxonomy ? taxonomyEntryIds.some(id => findEntryInTree(locationTaxonomy.entries ?? [], id)) : true;
    const canCreate = !!title.trim() && hasHomeType && hasLocation;

    return (
        <>
            <SlidePanel
                isOpen={isOpen}
                onClose={handleCloseInternal}
                title={isEditing ? "Edit Home" : "Add Home"}
                subtitle={isEditing ? (title || "Update home details and settings") : "Add a new residential care home"}
                fullScreen
                contentClassName={activeTab === 'gallery' ? 'p-6 overflow-y-auto sm:flex-1 sm:overflow-hidden sm:flex sm:flex-col' : activeTab === 'videos' ? 'flex-1 overflow-hidden p-6 flex flex-col' : activeTab === 'information' ? 'flex-1 overflow-y-auto p-6 flex flex-col' : 'flex-1 overflow-y-auto p-6'}
                actions={
                    <button
                        type="submit"
                        form="home-form"
                        disabled={isEditing ? (!isDirty || isSubmitting) : (!canCreate || isSubmitting)}
                        className="px-6 py-1.5 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-black/20"
                    >
                        {isSubmitting ? "Saving..." : (isEditing ? "Update Home" : "Create Home")}
                    </button>
                }
                headerChildren={
                    <div className="flex items-center justify-between pl-4 pr-6 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>
                        <div className="flex flex-1 items-start overflow-visible gap-1 pt-2 px-2 justify-center sm:justify-start">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                const isDisabled = !home?.id && tab.id !== 'information';
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
                                            whitespace-nowrap
                                            transition-colors duration-150 select-none
                                            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                                            ${isActive
                                                ? 'pt-[10px] pb-[11px] text-content-primary z-10 rounded-tl-lg rounded-tr-lg'
                                                : 'pt-2 pb-2 bg-transparent text-content-muted hover:text-content-secondary hover:bg-surface-input rounded-lg'
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
                            <div className="flex bg-surface-input p-1 rounded-lg hidden md:flex">
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
                        </div>
                    </div>
                }
            >
                <form id="home-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className={activeTab === 'gallery' ? 'sm:flex sm:flex-col sm:flex-1 sm:min-h-0' : (activeTab === 'videos' || activeTab === 'information') ? 'flex flex-col flex-1 min-h-0' : 'flex-1'}>{renderTabContent()}</div>
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
                message="Please fill out required fields (Title, Home Type, Location) and save the Home before accessing other tabs."
                confirmLabel="Understood"
                hideCancel={true}
            />
        </>
    );
}


