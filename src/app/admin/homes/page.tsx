"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Home as HomeIcon, MapPin, Pencil, Trash2, Search, Loader2, Tag } from "lucide-react";
import type { Home, Taxonomy } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { HomeForm } from "@/components/admin/HomeForm";
import { getHomes, createHome, updateHome, deleteHome, type CreateHomeInput } from "@/lib/services/homeService";
import { useNotification } from "@/contexts/NotificationContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { getTaxonomies } from "@/lib/services/taxonomyService";
import { getTaxonomyEntries, type TaxonomyEntry } from "@/lib/services/taxonomyEntryService";

const ITEMS_PER_PAGE = 10;

export default function HomesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [homes, setHomes] = useState<Home[]>([]);
    const [filteredHomes, setFilteredHomes] = useState<Home[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
    const [taxonomyEntries, setTaxonomyEntries] = useState<Record<string, TaxonomyEntry>>({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingHome, setEditingHome] = useState<Home | null>(null);


    // Delete state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Home | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showNotification } = useNotification();

    const fetchHomes = useCallback(async () => {
        try {
            setError(null);
            const data = await getHomes();
            setHomes(data);
            setFilteredHomes(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load homes");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchTaxonomies = useCallback(async () => {
        try {
            const taxonomyData = await getTaxonomies();
            setTaxonomies(taxonomyData);

            // Fetch all entries for each taxonomy
            const entriesMap: Record<string, TaxonomyEntry> = {};
            for (const taxonomy of taxonomyData) {
                const entries = await getTaxonomyEntries(taxonomy.id);
                // Flatten the tree structure and create a map
                const flattenEntries = (entries: TaxonomyEntry[]): void => {
                    entries.forEach(entry => {
                        entriesMap[entry.id] = entry;
                        if (entry.children && entry.children.length > 0) {
                            flattenEntries(entry.children);
                        }
                    });
                };
                flattenEntries(entries);
            }
            setTaxonomyEntries(entriesMap);
        } catch (err) {
            console.error("Failed to fetch taxonomies:", err);
        }
    }, []);

    useEffect(() => {
        fetchHomes();
        fetchTaxonomies();
    }, [fetchHomes, fetchTaxonomies]);

    // Handle URL query params: ?action=create or ?edit=home-slug
    useEffect(() => {
        const action = searchParams.get('action');
        const editSlug = searchParams.get('edit');

        if (action === 'create') {
            setEditingHome(null);
            setIsFormOpen(true);
            // Clear the query param
            router.replace('/admin/homes', { scroll: false });
        } else if (editSlug && homes.length > 0) {
            // Find the home to edit by slug
            const homeToEdit = homes.find(h => h.slug === editSlug);
            if (homeToEdit) {
                setEditingHome(homeToEdit);
                setIsFormOpen(true);
            } else {
                // Home not found, clear the param
                router.replace('/admin/homes', { scroll: false });
            }
        }
    }, [searchParams, router, homes]);


    // Search Filtering
    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = homes.filter((h) =>
            h.title.toLowerCase().includes(query) ||
            h.slug.toLowerCase().includes(query) ||
            (h.address?.city || "").toLowerCase().includes(query)
        );
        setFilteredHomes(filtered);
        setCurrentPage(1);
    }, [searchQuery, homes]);

    const handleOpenCreate = () => {
        setEditingHome(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (home: Home) => {
        setEditingHome(home);
        setIsFormOpen(true);
        // Update URL to reflect editing state
        router.push(`/admin/homes?edit=${home.slug}`, { scroll: false });
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingHome(null);
        // Clear URL parameter
        router.push('/admin/homes', { scroll: false });
    };

    const handleSave = async (data: Partial<Home>) => {
        try {
            if (editingHome) {
                await updateHome(editingHome.id, data);
                showNotification("Home Updated", data.title || "Home updated successfully");
            } else {
                // Ensure required fields for create
                if (!data.title || !data.slug) {
                    throw new Error("Title and Slug are required");
                }
                await createHome(data as CreateHomeInput);
                showNotification("Home Created", data.title);
            }
            await fetchHomes();
            handleCloseForm();
        } catch (err) {
            console.error("Save error:", err);
            throw err; // Re-throw for form to handle
        }
    };

    const handleDelete = (home: Home) => {
        setItemToDelete(home);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            await deleteHome(itemToDelete.id);
            await fetchHomes();
            showNotification("Home Deleted", "Home has been removed");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredHomes.length / itemsPerPage);
    const paginatedHomes = filteredHomes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const columns: ColumnDef<Home>[] = [
        {
            key: "title",
            header: "Home",
            render: (home) => (
                <button
                    type="button"
                    onClick={() => handleOpenEdit(home)}
                    className="flex items-center text-left hover:opacity-80 transition-opacity"
                >
                    <HomeIcon className={`mr-2 h-5 w-5 hidden md:block ${home.status === 'published' ? 'text-emerald-500' : 'text-zinc-500'}`} />
                    <div>
                        <div className="font-medium text-white hover:text-accent transition-colors">
                            {home.displayReferenceNumber ? "Ref: " : ""}{home.title}
                        </div>
                        <div className="text-xs text-zinc-500 hidden md:block">{home.slug}</div>
                    </div>
                </button>
            ),
        },
        {
            key: "location-classification",
            header: "Location",
            render: (home) => {
                const locationTaxonomy = taxonomies.find(t =>
                    t.singularName?.toLowerCase() === 'location' || t.pluralName?.toLowerCase() === 'locations'
                );
                const locationEntry = home.taxonomyEntryIds?.map(id => taxonomyEntries[id]).find(entry => entry && locationTaxonomy && entry.taxonomyId === locationTaxonomy.id);

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
                    <div className="flex items-center text-sm text-zinc-400">
                        <MapPin className="mr-1 h-3.5 w-3.5 hidden md:block" />
                        {buildPath(locationEntry)}
                    </div>
                );
            },
        },
        {
            key: "type",
            header: "Type",
            render: (home) => {
                const typeTaxonomy = taxonomies.find(t =>
                    t.singularName?.toLowerCase() === 'home type' || t.pluralName?.toLowerCase() === 'home types'
                );
                const typeEntry = home.taxonomyEntryIds?.map(id => taxonomyEntries[id]).find(entry => entry && typeTaxonomy && entry.taxonomyId === typeTaxonomy.id);
                return (
                    <div className="flex items-center text-sm text-zinc-400">
                        <Tag className="mr-1 h-3.5 w-3.5 hidden md:block" />
                        {typeEntry ? typeEntry.name : "—"}
                    </div>
                );
            },
        },
        // {
        //     key: "details",
        //     header: "Details",
        //     render: (home) => (
        //         <span className="text-sm text-zinc-400">
        //             {home.bedrooms ?? '-'} Bed · {home.bathrooms ?? '-'} Bath
        //         </span>
        //     ),
        // },
        // {
        //     key: "price",
        //     header: "Price",
        //     render: (home) => (
        //         <span className="text-sm font-medium text-accent">
        //             {home.price ? `$${home.price.toLocaleString()}` : '-'}
        //         </span>
        //     ),
        // },
    ];

    const renderActions = (home: Home) => (
        <>
            <button className="btn-ghost" onClick={() => handleOpenEdit(home)}>
                <Pencil className="h-4 w-4" />
            </button>
            <button
                className="btn-danger"
                onClick={() => handleDelete(home)}
                disabled={isDeleting && itemToDelete?.id === home.id}
            >
                {isDeleting && itemToDelete?.id === home.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="h-4 w-4" />
                )}
            </button>
        </>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Fixed Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">Homes</h1>
                        <p className="text-xs md:text-sm text-zinc-400 mt-1">Manage residential care home listings</p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2"
                    >
                        <Plus className="h-5 w-5 md:hidden" />
                        <span className="hidden md:flex md:items-center md:gap-2">
                            <Plus className="h-5 w-5" />
                            Add Home
                        </span>
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search homes..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="input-field pl-10"
                    />
                </div>
            </div>

            {/* Scrollable Table Section */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="card h-full flex flex-col">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <DataTable
                            columns={columns}
                            data={paginatedHomes}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="title"
                            emptyMessage={searchQuery ? "No homes match your search." : "No homes yet."}
                        />
                    </div>

                    {/* Pagination */}
                    {filteredHomes.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredHomes.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    )}
                </div>
            </div>

            {/* Slide-in Form Panel */}
            <HomeForm
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                home={editingHome}
            />

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Home"
                message={
                    <span>
                        Are you sure you want to delete <strong>{itemToDelete?.title}</strong>?
                        <br />
                        This action cannot be undone.
                    </span>
                }
                confirmLabel="Delete Home"
                isDangerous={true}
                isLoading={isDeleting}
            />
        </div>
    );
}
