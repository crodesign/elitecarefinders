"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Tags, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import type { Taxonomy } from "@/types";
import { TaxonomyForm } from "@/components/admin/TaxonomyForm";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import {
    getTaxonomies,
    createTaxonomy,
    updateTaxonomy,
    deleteTaxonomy,
    type CreateTaxonomyInput,
} from "@/lib/services/taxonomyService";
import { useNotification } from "@/contexts/NotificationContext";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { usePersistedPageSize } from "@/hooks/usePersistedPageSize";

export default function TaxonomiesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const manageId = searchParams.get('id');

    const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
    const [filteredTaxonomies, setFilteredTaxonomies] = useState<Taxonomy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTaxonomy, setEditingTaxonomy] = useState<Taxonomy | null>(null);


    // Delete state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Taxonomy | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedPageSize();

    const { showNotification } = useNotification();

    const fetchTaxonomies = useCallback(async () => {
        try {
            setError(null);
            const data = await getTaxonomies();
            setTaxonomies(data);
            setFilteredTaxonomies(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load taxonomies");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTaxonomies();
    }, [fetchTaxonomies]);

    // Handle URL-based management mode
    useEffect(() => {
        if (!isLoading && manageId && taxonomies.length > 0) {
            const target = taxonomies.find(t => t.id === manageId);
            if (target) {
                setEditingTaxonomy(target);
                setIsFormOpen(true);
            }
        }
    }, [isLoading, manageId, taxonomies]);

    // Filter taxonomies based on search
    useEffect(() => {
        const filtered = taxonomies.filter(
            (t) =>
                t.singularName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.pluralName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.slug.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredTaxonomies(filtered);
        setCurrentPage(1);
    }, [searchQuery, taxonomies]);

    const handleOpenCreate = () => {
        setEditingTaxonomy(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (taxonomy: Taxonomy) => {
        setEditingTaxonomy(taxonomy);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingTaxonomy(null);
        // Clear ID from URL
        if (manageId) {
            router.push('/admin/taxonomies');
        }
    };

    const handleSave = async (data: CreateTaxonomyInput) => {
        if (editingTaxonomy) {
            await updateTaxonomy(editingTaxonomy.id, data);
        } else {
            await createTaxonomy(data);
        }
        await fetchTaxonomies();
        showNotification("Taxonomy Saved", data.singularName);
    };

    const handleDelete = (taxonomy: Taxonomy) => {
        setItemToDelete(taxonomy);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            await deleteTaxonomy(itemToDelete.id);
            await fetchTaxonomies();
            showNotification("Taxonomy Deleted", itemToDelete.singularName);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredTaxonomies.length / itemsPerPage);
    const paginatedTaxonomies = filteredTaxonomies.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Column definitions for DataTable
    const columns: ColumnDef<Taxonomy>[] = [
        {
            key: "singularName",
            header: "Singular Name",
            render: (taxonomy) => (
                <div className="flex items-center">
                    <Tags className="mr-2 h-5 w-5 text-content-muted hidden md:block" />
                    <span className="font-medium text-content-primary">{taxonomy.singularName}</span>
                </div>
            ),
        },
        {
            key: "pluralName",
            header: "Plural Name",
            render: (taxonomy) => (
                <span className="text-content-primary">{taxonomy.pluralName}</span>
            ),
        },
        {
            key: "contentTypes",
            header: "Content Types",
            render: (taxonomy) => (
                <div className="flex flex-wrap gap-1">
                    {taxonomy.contentTypes && taxonomy.contentTypes.length > 0 ? (
                        taxonomy.contentTypes.map((type) => (
                            <span
                                key={type}
                                className="px-2 py-0.5 rounded text-xs bg-surface-hover text-content-secondary capitalize"
                            >
                                {type}
                            </span>
                        ))
                    ) : (
                        <span className="text-content-muted text-xs">-</span>
                    )}
                </div>
            ),
        },
        {
            key: "slug",
            header: "Slug",
            render: (taxonomy) => (
                <span className="text-sm text-content-secondary">{taxonomy.slug}</span>
            ),
        },
    ];

    const renderActions = (taxonomy: Taxonomy) => (
        <>
            <button
                onClick={() => handleOpenEdit(taxonomy)}
                className="btn-ghost"
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                onClick={() => handleDelete(taxonomy)}
                disabled={isDeleting && itemToDelete?.id === taxonomy.id}
                className="btn-danger"
            >
                {isDeleting && itemToDelete?.id === taxonomy.id ? (
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
                <HeartLoader />
            </div>
        );
    }


    // If in manage mode (ID in URL), hide the main list
    if (!isLoading && manageId) {
        return (
            <div className="h-full bg-surface-primary">
                <TaxonomyForm
                    isOpen={isFormOpen}
                    onClose={handleCloseForm}
                    onSave={handleSave}
                    taxonomy={editingTaxonomy}
                    autoOpenEntries={true}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Fixed Header Section */}
            <div className="flex-none space-y-4 md:space-y-6 p-4 md:p-8 pb-4">
                {/* Page Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-content-primary">Taxonomies</h1>
                        <p className="text-content-secondary mt-1 text-sm md:text-base">
                            Manage categories for filtering and URL structure
                        </p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2"
                    >
                        <Plus className="h-5 w-5 md:hidden" />
                        <span className="hidden md:flex md:items-center md:gap-2">
                            <Plus className="h-5 w-5" />
                            Add Taxonomy
                        </span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                    <input
                        type="text"
                        placeholder="Search taxonomies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-field pl-8"
                    />
                </div>

                {error && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                        {error}
                    </div>
                )}
            </div>

            {/* Scrollable Table/Card Section */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-surface-card rounded-xl h-full flex flex-col overflow-hidden">
                    {/* Table/Cards Container */}
                    <div className="flex-1 min-h-0 overflow-auto">
                        <DataTable
                            columns={columns}
                            data={paginatedTaxonomies}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="singularName"
                            emptyMessage={
                                searchQuery
                                    ? "No taxonomies match your search."
                                    : 'No taxonomies yet. Click "Add" to create one.'
                            }
                        />
                    </div>

                    {/* Pagination */}
                    {filteredTaxonomies.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredTaxonomies.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={(count) => {
                                setItemsPerPage(count);
                                setCurrentPage(1);
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Form Slide Panel */}
            <TaxonomyForm
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                taxonomy={editingTaxonomy}
            />

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Taxonomy"
                message={
                    <span>
                        Are you sure you want to delete <strong>{itemToDelete?.singularName}</strong>?
                        <br />
                        This action cannot be undone.
                    </span>
                }
                confirmLabel="Delete Taxonomy"
                isDangerous={true}
                isLoading={isDeleting}
            />
        </div>
    );
}
