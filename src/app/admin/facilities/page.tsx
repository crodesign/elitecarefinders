"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Building2, MapPin, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import type { Facility } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { FacilityForm } from "@/components/admin/FacilityForm";
import { getFacilities, createFacility, updateFacility, deleteFacility, type CreateFacilityInput } from "@/lib/services/facilityService";
import { useNotification } from "@/contexts/NotificationContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

const ITEMS_PER_PAGE = 10;

export default function FacilitiesPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);


    // Delete state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Facility | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showNotification } = useNotification();

    const fetchFacilities = useCallback(async () => {
        try {
            setError(null);
            const data = await getFacilities();
            setFacilities(data);
            setFilteredFacilities(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load facilities");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFacilities();
    }, [fetchFacilities]);

    // Handle ?action=create query param
    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            setEditingFacility(null);
            setIsFormOpen(true);
            // Clear the query param
            router.replace('/admin/facilities', { scroll: false });
        }
    }, [searchParams, router]);


    // Search Filtering
    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = facilities.filter((f) =>
            f.title.toLowerCase().includes(query) ||
            f.slug.toLowerCase().includes(query) ||
            (f.address?.city || "").toLowerCase().includes(query) ||
            (f.licenseNumber || "").toLowerCase().includes(query)
        );
        setFilteredFacilities(filtered);
        setCurrentPage(1);
    }, [searchQuery, facilities]);

    const handleOpenCreate = () => {
        setEditingFacility(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (facility: Facility) => {
        setEditingFacility(facility);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingFacility(null);
    };

    const handleSave = async (data: Partial<Facility>) => {
        try {
            if (editingFacility) {
                await updateFacility(editingFacility.id, data);
                showNotification("Facility Updated", data.title || "Facility updated successfully");
            } else {
                // Ensure required fields for create
                if (!data.title || !data.slug) {
                    throw new Error("Title and Slug are required");
                }
                await createFacility(data as CreateFacilityInput);
                showNotification("Facility Created", data.title);
            }
            await fetchFacilities();
            handleCloseForm();
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
            await deleteFacility(itemToDelete.id);
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
            header: "Facility",
            render: (facility) => (
                <button
                    type="button"
                    onClick={() => handleOpenEdit(facility)}
                    className="flex items-center text-left hover:opacity-80 transition-opacity"
                >
                    <Building2 className={`mr-2 h-5 w-5 hidden md:block ${facility.status === 'published' ? 'text-emerald-500' : 'text-zinc-500'}`} />
                    <div>
                        <div className="font-medium text-white hover:text-accent transition-colors">{facility.title}</div>
                        <div className="text-xs text-zinc-500 hidden md:block">{facility.slug}</div>
                    </div>
                </button>
            ),
        },
        {
            key: "location",
            header: "Location",
            render: (facility) => (
                <div className="flex items-center text-sm text-zinc-400">
                    <MapPin className="mr-1 h-3.5 w-3.5 hidden md:block" />
                    {facility.address?.city || "Unknown City"}, {facility.address?.state || "State"}
                </div>
            ),
        },
        {
            key: "license",
            header: "License",
            render: (facility) => (
                <span className="text-sm text-zinc-400">{facility.licenseNumber || "-"}</span>
            ),
        },
        {
            key: "capacity",
            header: "Capacity",
            render: (facility) => (
                <span className="text-sm text-zinc-400">{facility.capacity ? `${facility.capacity} residents` : "-"}</span>
            ),
        },
    ];

    const renderActions = (facility: Facility) => (
        <>
            <button className="btn-ghost" onClick={() => handleOpenEdit(facility)}>
                <Pencil className="h-4 w-4" />
            </button>
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
                        <h1 className="text-xl md:text-2xl font-bold text-white">Facilities</h1>
                        <p className="text-xs md:text-sm text-zinc-400 mt-1">Manage care facility listings</p>
                    </div>
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
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search facilities..."
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
                            data={paginatedFacilities}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="title"
                            emptyMessage={searchQuery ? "No facilities match your search." : "No facilities yet."}
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
