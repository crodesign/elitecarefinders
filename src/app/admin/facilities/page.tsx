"use client";

import { useState, useMemo } from "react";
import { Plus, Building2, MapPin, Pencil, Trash2, Search } from "lucide-react";
import type { Facility } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";

// Mock data
const initialFacilities: Facility[] = [
    {
        id: "1",
        title: "Sunrise Care Center",
        slug: "sunrise-care-center",
        description: "Premier assisted living facility",
        images: [],
        createdAt: "2024-01-10T12:00:00Z",
        updatedAt: "2024-01-10T12:00:00Z",
        address: { street: "789 Care Blvd", city: "Scottsdale", state: "AZ", zip: "85251" },
        licenseNumber: "LIC-123456",
        capacity: 50,
        taxonomyIds: ["3"]
    },
    {
        id: "2",
        title: "Golden Years Home",
        slug: "golden-years-home",
        description: "Memory care specialists",
        images: [],
        createdAt: "2024-01-12T12:00:00Z",
        updatedAt: "2024-01-12T12:00:00Z",
        address: { street: "321 Senior Ct", city: "Mesa", state: "AZ", zip: "85201" },
        licenseNumber: "LIC-789012",
        capacity: 25,
        taxonomyIds: ["3", "1"]
    }
];

export default function FacilitiesPage() {
    const [facilities] = useState<Facility[]>(initialFacilities);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredFacilities = useMemo(() =>
        facilities.filter(
            (f) =>
                f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.address.city.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [facilities, searchQuery]
    );

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
                <div className="flex items-center">
                    <Building2 className="mr-2 h-5 w-5 text-zinc-500 hidden md:block" />
                    <div>
                        <div className="font-medium text-white">{facility.title}</div>
                        <div className="text-xs text-zinc-500 hidden md:block">{facility.slug}</div>
                    </div>
                </div>
            ),
        },
        {
            key: "location",
            header: "Location",
            render: (facility) => (
                <div className="flex items-center text-sm text-zinc-400">
                    <MapPin className="mr-1 h-3.5 w-3.5 hidden md:block" />
                    {facility.address.city}, {facility.address.state}
                </div>
            ),
        },
        {
            key: "license",
            header: "License",
            render: (facility) => (
                <span className="text-sm text-zinc-400">{facility.licenseNumber}</span>
            ),
        },
        {
            key: "capacity",
            header: "Capacity",
            render: (facility) => (
                <span className="text-sm text-zinc-400">{facility.capacity} residents</span>
            ),
        },
    ];

    const renderActions = (facility: Facility) => (
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
                        <h1 className="text-xl md:text-2xl font-bold text-white">Facilities</h1>
                        <p className="text-xs md:text-sm text-zinc-400 mt-1">Manage care facility listings</p>
                    </div>
                    <button className="btn-primary text-sm">
                        <Plus className="-ml-1 mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5 inline" />
                        <span className="hidden md:inline">Add Facility</span>
                        <span className="md:hidden">Add</span>
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
        </>
    );
}
