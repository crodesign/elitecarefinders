"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Tags, Pencil, Trash2, Loader2, Search } from "lucide-react";
import type { Taxonomy, TaxonomyType } from "@/types";
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

const ITEMS_PER_PAGE = 10;

export default function TaxonomiesPage() {
    const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
    const [filteredTaxonomies, setFilteredTaxonomies] = useState<Taxonomy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTaxonomy, setEditingTaxonomy] = useState<Taxonomy | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

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

    // Filter taxonomies based on search
    useEffect(() => {
        const filtered = taxonomies.filter(
            (t) =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.type.toLowerCase().includes(searchQuery.toLowerCase())
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
    };

    const handleSave = async (data: CreateTaxonomyInput) => {
        if (editingTaxonomy) {
            await updateTaxonomy(editingTaxonomy.id, data);
        } else {
            await createTaxonomy(data);
        }
        await fetchTaxonomies();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this taxonomy?")) return;

        setDeletingId(id);
        try {
            await deleteTaxonomy(id);
            await fetchTaxonomies();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete");
        } finally {
            setDeletingId(null);
        }
    };

    const getBadgeClass = (type: TaxonomyType) => {
        switch (type) {
            case "neighborhood":
                return "badge-neighborhood";
            case "amenity":
                return "badge-amenity";
            case "service":
                return "badge-service";
            case "care-type":
                return "badge-care-type";
            default:
                return "bg-zinc-500/10 text-zinc-400";
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
            key: "name",
            header: "Name",
            render: (taxonomy) => (
                <div className="flex items-center">
                    <Tags className="mr-2 h-5 w-5 text-zinc-500 hidden md:block" />
                    <span className="font-medium text-white">{taxonomy.name}</span>
                </div>
            ),
        },
        {
            key: "type",
            header: "Type",
            render: (taxonomy) => (
                <span className={`badge ${getBadgeClass(taxonomy.type)}`}>
                    {taxonomy.type}
                </span>
            ),
        },
        {
            key: "slug",
            header: "Slug",
            render: (taxonomy) => (
                <span className="text-sm text-zinc-400">{taxonomy.slug}</span>
            ),
        },
        {
            key: "description",
            header: "Description",
            hideOnMobile: true,
            render: (taxonomy) => (
                <span className="text-sm text-zinc-400 max-w-xs truncate block">
                    {taxonomy.description || "-"}
                </span>
            ),
        },
    ];

    const renderActions = (taxonomy: Taxonomy) => (
        <>
            <button
                onClick={() => handleOpenEdit(taxonomy)}
                className="btn-ghost"
                title="Edit"
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                onClick={() => handleDelete(taxonomy.id)}
                disabled={deletingId === taxonomy.id}
                className="btn-danger"
                title="Delete"
            >
                {deletingId === taxonomy.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="h-4 w-4" />
                )}
            </button>
        </>
    );

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <>
            {/* Fixed Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                {/* Title Row */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">Taxonomies</h1>
                        <p className="text-xs md:text-sm text-zinc-400 mt-1">
                            Manage categories, neighborhoods, amenities, and more
                        </p>
                    </div>
                    <button onClick={handleOpenCreate} className="btn-primary text-sm">
                        <Plus className="-ml-1 mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5 inline" />
                        <span className="hidden md:inline">Add Taxonomy</span>
                        <span className="md:hidden">Add</span>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search taxonomies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field pl-10"
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
                <div className="card h-full flex flex-col">
                    {/* Table/Cards Container */}
                    <div className="flex-1 min-h-0 overflow-auto">
                        <DataTable
                            columns={columns}
                            data={paginatedTaxonomies}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="name"
                            emptyMessage={
                                searchQuery
                                    ? "No taxonomies match your search."
                                    : 'No taxonomies yet. Click "Add Taxonomy" to create one.'
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
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    )}
                </div>
            </div>

            {/* Slide-in Form Panel */}
            <TaxonomyForm
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                taxonomy={editingTaxonomy}
            />
        </>
    );
}
