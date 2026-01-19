"use client";

import { useState, useMemo } from "react";
import { Plus, Home as HomeIcon, MapPin, Pencil, Trash2, Search } from "lucide-react";
import type { Home } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";

// Mock data - will be replaced with Supabase
const initialHomes: Home[] = [
    {
        id: "1",
        title: "Sunnyvale Estate",
        slug: "sunnyvale-estate",
        description: "Beautiful estate in sunny valley",
        images: [],
        createdAt: "2024-01-15T12:00:00Z",
        updatedAt: "2024-01-15T12:00:00Z",
        address: { street: "123 Solar Way", city: "Phoenix", state: "AZ", zip: "85001" },
        price: 4500,
        bedrooms: 4,
        bathrooms: 3,
        sqft: 2500,
        taxonomyIds: ["1", "2"]
    },
    {
        id: "2",
        title: "Mountain Retreat",
        slug: "mountain-retreat",
        description: "Cozy cabin",
        images: [],
        createdAt: "2024-01-16T12:00:00Z",
        updatedAt: "2024-01-16T12:00:00Z",
        address: { street: "456 Peak Lane", city: "Flagstaff", state: "AZ", zip: "86001" },
        price: 3800,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1800,
        taxonomyIds: ["2"]
    }
];

export default function HomesPage() {
    const [homes] = useState<Home[]>(initialHomes);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredHomes = useMemo(() =>
        homes.filter(
            (h) =>
                h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                h.address.city.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [homes, searchQuery]
    );

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
                <div className="flex items-center">
                    <HomeIcon className="mr-2 h-5 w-5 text-zinc-500 hidden md:block" />
                    <div>
                        <div className="font-medium text-white">{home.title}</div>
                        <div className="text-xs text-zinc-500 hidden md:block">{home.slug}</div>
                    </div>
                </div>
            ),
        },
        {
            key: "location",
            header: "Location",
            render: (home) => (
                <div className="flex items-center text-sm text-zinc-400">
                    <MapPin className="mr-1 h-3.5 w-3.5 hidden md:block" />
                    {home.address.city}, {home.address.state}
                </div>
            ),
        },
        {
            key: "details",
            header: "Details",
            render: (home) => (
                <span className="text-sm text-zinc-400">
                    {home.bedrooms} Bed · {home.bathrooms} Bath · {home.sqft} sqft
                </span>
            ),
        },
        {
            key: "price",
            header: "Price",
            render: (home) => (
                <span className="text-sm font-medium text-accent">
                    ${home.price.toLocaleString()}
                </span>
            ),
        },
    ];

    const renderActions = (home: Home) => (
        <>
            <button className="btn-ghost" title="Edit">
                <Pencil className="h-4 w-4" />
            </button>
            <button className="btn-danger" title="Delete">
                <Trash2 className="h-4 w-4" />
            </button>
        </>
    );

    return (
        <>
            {/* Fixed Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">Homes</h1>
                        <p className="text-xs md:text-sm text-zinc-400 mt-1">Manage residential care home listings</p>
                    </div>
                    <button className="btn-primary text-sm">
                        <Plus className="-ml-1 mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5 inline" />
                        <span className="hidden md:inline">Add Home</span>
                        <span className="md:hidden">Add</span>
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
        </>
    );
}
