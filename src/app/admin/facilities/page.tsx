"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Building2, MapPin, Pencil, Trash2, Search, Loader2, Tag, ArrowUpAZ, ArrowDownAZ, Clock, Star, Video, Trophy, X, ExternalLink } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import type { Facility, Taxonomy } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { FacilityForm } from "@/components/admin/FacilityForm";
import { getFacilities, createFacility, updateFacility, deleteFacility, searchFacilities, type CreateFacilityInput } from "@/lib/services/facilityService";
import { useNotification } from "@/contexts/NotificationContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { getTaxonomies } from "@/lib/services/taxonomyService";
import { getTaxonomyEntries, getAllTaxonomyEntriesParentMap, type TaxonomyEntry } from "@/lib/services/taxonomyEntryService";
import { EnhancedSelect } from "@/components/admin/EnhancedSelect";
import { usePersistedPageSize } from "@/hooks/usePersistedPageSize";
import { useAuth } from "@/contexts/AuthContext";

function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year ago' : `${years} years ago`;
}

export default function FacilitiesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isLocalUser, user, loading: authLoading } = useAuth();
    const userRole = user?.role?.role;
    const isRestricted = isLocalUser || userRole === 'location_manager' || userRole === 'regional_manager';

    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
    const [taxonomyEntries, setTaxonomyEntries] = useState<Record<string, TaxonomyEntry>>({});

    // Sort state
    const [sortAsc, setSortAsc] = useState(true);
    const [sortByRecent, setSortByRecent] = useState(true);

    // Column filter state
    const [nameFilter, setNameFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState<string[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedPageSize();

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);


    // Delete state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Facility | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    const [isSearching, setIsSearching] = useState(false);
    const [searchResultSet, setSearchResultSet] = useState<Facility[] | null>(null);

    const { showNotification } = useNotification();

    const fetchFacilities = useCallback(async () => {
        if (authLoading) return;
        try {
            setError(null);
            const data = await getFacilities();
            if (isLocalUser) {
                const profileRes = await fetch('/api/profile');
                const profile = await profileRes.json();
                const assignedIds = new Set(
                    (profile.entities || [])
                        .filter((e: any) => e.entityType === 'facility')
                        .map((e: any) => e.entityId)
                );
                const allowed = data.filter(f => assignedIds.has(f.id));
                setFacilities(allowed);
                setFilteredFacilities(allowed);
            } else if (userRole === 'location_manager' || userRole === 'regional_manager') {
                const [profileRes, parentMap] = await Promise.all([
                    fetch('/api/profile'),
                    getAllTaxonomyEntriesParentMap()
                ]);
                const profile = await profileRes.json();
                const assignedIds = new Set<string>(
                    (profile.locationAssignments || []).map((la: any) => la.location_id)
                );
                const childrenMap = new Map<string, string[]>();
                parentMap.forEach(e => {
                    if (e.parentId) {
                        if (!childrenMap.has(e.parentId)) childrenMap.set(e.parentId, []);
                        childrenMap.get(e.parentId)!.push(e.id);
                    }
                });
                const expandedIds = new Set<string>(assignedIds);
                const queue = Array.from(assignedIds);
                while (queue.length > 0) {
                    const id = queue.shift()!;
                    (childrenMap.get(id) || []).forEach(cid => {
                        if (!expandedIds.has(cid)) { expandedIds.add(cid); queue.push(cid); }
                    });
                }
                const allowed = data.filter(f =>
                    (f.taxonomyEntryIds || []).some((id: string) => expandedIds.has(id))
                );
                setFacilities(allowed);
                setFilteredFacilities(allowed);
            } else {
                setFacilities(data);
                setFilteredFacilities(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load facilities");
        } finally {
            setIsLoading(false);
        }
    }, [isLocalUser, userRole, authLoading]);

    const fetchTaxonomies = useCallback(async () => {
        try {
            const taxonomyData = await getTaxonomies();
            setTaxonomies(taxonomyData);

            // Fetch all entries for each taxonomy in parallel
            const entriesMap: Record<string, TaxonomyEntry> = {};
            const allEntriesResults = await Promise.all(
                taxonomyData.map(taxonomy => getTaxonomyEntries(taxonomy.id))
            );

            // Flatten the tree structure and create a map
            const flattenEntries = (entries: TaxonomyEntry[]): void => {
                entries.forEach(entry => {
                    entriesMap[entry.id] = entry;
                    if (entry.children && entry.children.length > 0) {
                        flattenEntries(entry.children);
                    }
                });
            };

            allEntriesResults.forEach(entries => flattenEntries(entries));
            setTaxonomyEntries(entriesMap);
        } catch (err) {
            console.error("Failed to fetch taxonomies:", err);
        }
    }, []);

    const locationOptions = useMemo(() => {
        const tax = taxonomies.find(t =>
            t.singularName?.toLowerCase() === 'location' || t.pluralName?.toLowerCase() === 'locations'
        );
        if (!tax) return [];

        const usedIds = new Set<string>();
        facilities.forEach(f => {
            f.taxonomyIds?.forEach(id => {
                if (taxonomyEntries[id]?.taxonomyId === tax.id) usedIds.add(id);
            });
        });

        const allLoc = Object.values(taxonomyEntries).filter(e => e.taxonomyId === tax.id);
        const locIdSet = new Set(allLoc.map(e => e.id));
        const roots = allLoc
            .filter(e => !e.parentId || !locIdSet.has(e.parentId))
            .sort((a, b) => a.displayOrder - b.displayOrder);

        const hasUsed = (entry: TaxonomyEntry): boolean => {
            if (usedIds.has(entry.id)) return true;
            return (entry.children ?? []).some(c => hasUsed(c));
        };

        const result: Array<{ value: string; label: string; depth: number; isGroupHeader: boolean }> = [];
        const traverse = (entry: TaxonomyEntry, depth: number) => {
            if (!hasUsed(entry)) return;
            result.push({ value: entry.id, label: entry.name, depth, isGroupHeader: !usedIds.has(entry.id) });
            (entry.children ?? []).forEach(c => traverse(c, depth + 1));
        };
        roots.forEach(r => traverse(r, 0));
        return result;
    }, [taxonomies, taxonomyEntries, facilities]);

    const typeOptions = useMemo(() => {
        const tax = taxonomies.find(t =>
            t.singularName?.toLowerCase() === 'facility type' || t.pluralName?.toLowerCase() === 'facility types'
        );
        if (!tax) return [];
        return Object.values(taxonomyEntries)
            .filter(e => e.taxonomyId === tax.id)
            .map(e => ({ value: e.id, label: e.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [taxonomies, taxonomyEntries]);

    useEffect(() => {
        fetchFacilities();
        fetchTaxonomies();
    }, [fetchFacilities, fetchTaxonomies]);

    // Handle URL query params: ?action=create or ?edit=facility-slug
    useEffect(() => {
        const action = searchParams.get('action');
        const editSlug = searchParams.get('edit');

        if (action === 'create') {
            setEditingFacility(null);
            setIsFormOpen(true);
            // Clear the query param
            router.replace('/admin/facilities', { scroll: false });
        } else if (editSlug && facilities.length > 0) {
            // Find the facility to edit by slug
            const facilityToEdit = facilities.find(f => f.slug === editSlug);
            if (facilityToEdit) {
                setEditingFacility(facilityToEdit);
                setIsFormOpen(true);
            } else {
                // Facility not found, clear the param
                router.replace('/admin/facilities', { scroll: false });
            }
        }
    }, [searchParams, router, facilities]);


    // Sort and filter
    useEffect(() => {
        const activeSet = searchResultSet ?? facilities;
        let filtered = [...activeSet];
        if (nameFilter) {
            filtered = filtered.filter(f => f.title.toLowerCase().includes(nameFilter.toLowerCase()));
        }
        if (locationFilter) {
            filtered = filtered.filter(f => f.taxonomyIds?.includes(locationFilter));
        }
        if (typeFilter.length > 0) {
            filtered = filtered.filter(f => f.taxonomyIds?.some(id => typeFilter.includes(id)));
        }
        if (sortByRecent) {
            filtered.sort((a, b) =>
                new Date(b.updatedAt || b.slug).getTime() - new Date(a.updatedAt || a.slug).getTime()
            );
        } else {
            filtered.sort((a, b) =>
                sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
            );
        }
        setFilteredFacilities(filtered);
        setCurrentPage(1);
    }, [facilities, searchResultSet, nameFilter, sortAsc, sortByRecent, locationFilter, typeFilter]);


    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResultSet(null);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchFacilities(searchQuery.trim());
            setSearchResultSet(results);
            setCurrentPage(1);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
        setSearchResultSet(null);
        setCurrentPage(1);
    }, []);

    const handleOpenCreate = () => {
        setEditingFacility(null);
        setIsFormOpen(true);
        // Update URL to reflect creation state with default tab
        router.push(`/admin/facilities?action=create&tab=information`, { scroll: false });
    };

    const handleOpenEdit = (facility: Facility) => {
        setEditingFacility(facility);
        setIsFormOpen(true);
        // Update URL to reflect editing state with default tab
        router.push(`/admin/facilities?edit=${facility.slug}&tab=information`, { scroll: false });
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingFacility(null);
        // Clear URL parameter
        router.push('/admin/facilities', { scroll: false });
    };

    const handleSave = async (data: Partial<Facility>) => {
        try {
            let savedFacility: Facility;
            if (editingFacility) {
                savedFacility = await updateFacility(editingFacility.id, data);
                showNotification("Facility Updated", data.title || "Facility updated successfully");
            } else {
                // Ensure required fields for create
                if (!data.title || !data.slug) {
                    throw new Error("Title and Slug are required");
                }
                savedFacility = await createFacility(data as CreateFacilityInput);
                showNotification("Facility Created", data.title);
            }

            // Update the list
            await fetchFacilities();

            // Stay on the form, but update the editing state to the saved facility
            setEditingFacility(savedFacility);

            // Update URL to reflect the current resource
            const currentParams = new URLSearchParams(searchParams.toString());
            currentParams.delete('action');
            currentParams.set('edit', savedFacility.slug);

            router.replace(`/admin/facilities?${currentParams.toString()}`, { scroll: false });

        } catch (err) {
            console.error("Save error:", err);
            throw err; // Re-throw for form to handle
        }
    };

    const handleDelete = (facility: Facility) => {
        setItemToDelete(facility);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            await deleteFacility(itemToDelete.id, itemToDelete.slug);
            await fetchFacilities();
            showNotification("Facility Deleted", "Facility has been removed");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredFacilities.length / itemsPerPage);
    const paginatedFacilities = filteredFacilities.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const columns: ColumnDef<Facility>[] = [
        {
            key: "title",
            width: "35%",
            headerLabel: "Facility",
            header: (
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-content-muted pointer-events-none" />
                        <input
                            type="text"
                            value={nameFilter}
                            onChange={e => setNameFilter(e.target.value)}
                            placeholder="Facility"
                            className={`form-input w-60 pl-7 pr-7 py-2 text-xs${nameFilter ? ' ring-2 ring-accent' : ''}`}
                        />
                        {nameFilter && (
                            <button
                                type="button"
                                onClick={() => setNameFilter('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-content-muted hover:text-content-primary transition-colors z-10"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => { setSortByRecent(false); setSortAsc(prev => sortByRecent ? true : !prev); }}
                        title={sortByRecent ? "Sort A–Z" : (sortAsc ? "Sort Z–A" : "Sort A–Z")}
                        className={`p-1.5 rounded-lg transition-colors ${!sortByRecent ? "bg-accent text-white" : "bg-surface-input text-content-secondary hover:bg-surface-hover hover:text-content-primary"}`}
                    >
                        {(!sortByRecent && !sortAsc) ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortByRecent(true)}
                        title="Sort by most recent"
                        className={`p-1.5 rounded-lg transition-colors ${sortByRecent ? "bg-accent text-white" : "bg-surface-input text-content-secondary hover:bg-surface-hover hover:text-content-primary"}`}
                    >
                        <Clock className="h-4 w-4" />
                    </button>
                </div>
            ),
            render: (facility) => (
                <button
                    type="button"
                    onClick={() => handleOpenEdit(facility)}
                    className="flex items-center text-left hover:opacity-80 transition-opacity w-full group"
                >
                    <span className="hidden md:flex flex-col items-center gap-1 mr-2 flex-shrink-0">
                        <Star className={`h-3 w-3 ${ (facility as any).isFeatured ? 'text-accent fill-accent' : 'text-content-muted opacity-50'}`} />
                        <Video className={`h-3 w-3 ${ (facility as any).hasFeaturedVideo ? 'text-accent' : 'text-content-muted opacity-50'}`} />
                        <Trophy className={`h-3 w-3 ${ (facility as any).isFacilityOfMonth ? 'text-accent' : 'text-content-muted opacity-50'}`} />
                    </span>
                    <span className="mr-2 hidden md:block flex-shrink-0">
                        {facility.images && facility.images.length > 0 ? (
                            <img
                                src={facility.images[0].includes('/media/') ? facility.images[0].replace(/(\.[^.]+)$/, '-100x100.webp') : facility.images[0]}
                                alt={facility.title}
                                className="h-[60px] w-[60px] rounded object-cover"
                            />
                        ) : (
                            <div className="h-[60px] w-[60px] rounded border-2 border-ui-border flex items-center justify-center">
                                <Building2 className={`h-5 w-5 ${facility.status === 'published' ? 'text-emerald-500' : 'text-content-muted'}`} />
                            </div>
                        )}
                    </span>
                    <div>
                        <div className="font-medium text-content-primary group-hover:text-accent transition-colors flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${facility.status === 'published' ? 'bg-emerald-500' : 'bg-gray-400/50'}`} />
                            {facility.title}
                        </div>
                        <a
                href={`/facilities/${facility.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs text-content-muted hidden md:inline-flex items-center gap-1 hover:text-accent transition-colors"
            >
                View this facility <ExternalLink className="h-3 w-3" />
            </a>
                    </div>
                </button>
            ),
        },
        {
            key: "type",
            width: "22%",
            header: (
                <EnhancedSelect
                    multiValue={typeFilter}
                    onMultiChange={setTypeFilter}
                    options={typeOptions}
                    placeholder="Type"
                    textSize="text-xs"
                    isActive={typeFilter.length > 0}
                    onClear={() => setTypeFilter([])}
                    multiLabel="types"
                    className="w-32"
                />
            ),
            headerLabel: "Type",
            render: (facility) => {
                const typeTaxonomy = taxonomies.find(t =>
                    t.singularName?.toLowerCase() === 'facility type' || t.pluralName?.toLowerCase() === 'facility types'
                );
                const typeEntry = facility.taxonomyIds?.map(id => taxonomyEntries[id]).find(entry => entry && typeTaxonomy && entry.taxonomyId === typeTaxonomy.id);
                return (
                    <div className="flex items-center text-sm text-content-secondary">
                        <Tag className="mr-1 h-3.5 w-3.5 hidden md:block" />
                        {typeEntry ? typeEntry.name : "—"}
                    </div>
                );
            },
        },
        {
            key: "location-classification",
            width: "24%",
            header: (
                <EnhancedSelect
                    value={locationFilter}
                    onChange={setLocationFilter}
                    options={locationOptions}
                    placeholder="Location"
                    textSize="text-xs"
                    isActive={locationFilter !== ''}
                    onClear={() => setLocationFilter('')}
                    className="w-40"
                />
            ),
            headerLabel: "Location",
            render: (facility) => {
                const locationTaxonomy = taxonomies.find(t =>
                    t.singularName?.toLowerCase() === 'location' || t.pluralName?.toLowerCase() === 'locations'
                );
                // Note: Using taxonomyIds for facilities (should be taxonomyEntryIds for consistency)
                const locationEntry = facility.taxonomyIds?.map(id => taxonomyEntries[id]).find(entry => entry && locationTaxonomy && entry.taxonomyId === locationTaxonomy.id);

                // Build full path (e.g., "Hawaii - Oahu - Aiea")
                const buildPath = (entry: TaxonomyEntry | undefined): string => {
                    if (!entry) return "—";
                    const path: string[] = [entry.name];
                    let current = entry;
                    while (current?.parentId) {
                        const parent = taxonomyEntries[current.parentId];
                        if (parent) {
                            path.unshift(parent.name);
                            current = parent;
                        } else {
                            break;
                        }
                    }
                    return path.join(' - ');
                };

                return (
                    <div className="flex items-center text-sm text-content-secondary">
                        <MapPin className="mr-1 h-3.5 w-3.5 hidden md:block" />
                        {buildPath(locationEntry)}
                    </div>
                );
            },
        },
        {
            key: "updated_at",
            header: "Last Modified",
            render: (facility) => (
                <span className="text-sm text-content-muted">{timeAgo(facility.updatedAt)}</span>
            ),
        },
    ];

    const renderActions = (facility: Facility) => (
        <>
            <button className="btn-ghost" onClick={() => handleOpenEdit(facility)}>
                <Pencil className="h-4 w-4" />
            </button>
            {!isRestricted && (
                <button
                    className="btn-danger"
                    onClick={() => handleDelete(facility)}
                    disabled={isDeleting && itemToDelete?.id === facility.id}
                >
                    {isDeleting && itemToDelete?.id === facility.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </button>
            )}
        </>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <HeartLoader />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Fixed Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-content-primary">Facilities</h1>
                        <p className="text-xs md:text-sm text-content-secondary mt-1">Manage care facility listings</p>
                    </div>
                    {!isRestricted && (
                        <button
                            onClick={handleOpenCreate}
                            className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2"
                        >
                            <Plus className="h-5 w-5 md:hidden" />
                            <span className="hidden md:flex md:items-center md:gap-2">
                                <Plus className="h-5 w-5" />
                                Add Facility
                            </span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-80">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                        <input
                            type="text"
                            placeholder="Search facilities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            disabled={isSearching}
                            className="search-field pl-8 pr-8"
                        />
                        {searchResultSet !== null && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary transition-colors"
                                title="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="p-1.5 rounded-lg transition-colors text-content-secondary hover:bg-surface-hover hover:text-content-primary disabled:opacity-50"
                        title="Search"
                    >
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Scrollable Table Section */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-surface-card rounded-xl h-full flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <DataTable
                            columns={columns}
                            data={paginatedFacilities}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="title"
                            emptyMessage={searchResultSet !== null || nameFilter || locationFilter || typeFilter.length > 0 ? "No facilities match your filters." : "No facilities yet."}
                            mobileImageRender={(facility) =>
                                facility.images && facility.images.length > 0 ? (
                                    <img
                                        src={facility.images[0].includes('/media/') ? facility.images[0].replace(/(\.[^.]+)$/, '-100x100.webp') : facility.images[0]}
                                        alt={facility.title}
                                        className="h-[82px] w-[82px] rounded object-cover"
                                    />
                                ) : (
                                    <div className="h-[82px] w-[82px] rounded border-2 border-ui-border flex items-center justify-center">
                                        <Building2 className={`h-5 w-5 ${facility.status === 'published' ? 'text-emerald-500' : 'text-content-muted'}`} />
                                    </div>
                                )
                            }
                            mobileFarRightColumn="updated_at"
                        />
                    </div>

                    {/* Pagination */}
                    {filteredFacilities.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredFacilities.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    )}
                </div>
            </div>

            {/* Slide-in Form Panel */}
            <FacilityForm
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                facility={editingFacility}
            />

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Facility"
                message={
                    <span>
                        Are you sure you want to delete <strong>{itemToDelete?.title}</strong>?
                        <br />
                        This action cannot be undone.
                    </span>
                }
                confirmLabel="Delete Facility"
                isDangerous={true}
                isLoading={isDeleting}
            />
        </div>
    );
}
