"use client";

import { useState, useMemo } from "react";
import { Star, Check, X, Search } from "lucide-react";
import type { Review } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";

// Mock data
const initialReviews: Review[] = [
    {
        id: "1",
        authorName: "Jane Doe",
        rating: 5,
        content: "Absolutely loved the facility! The staff was amazing and very attentive to all our needs.",
        entityId: "1",
        createdAt: "2024-01-18T10:00:00Z",
        status: "pending"
    },
    {
        id: "2",
        authorName: "John Smith",
        rating: 3,
        content: "It was okay, but the food could be better. The rooms are clean though.",
        entityId: "2",
        createdAt: "2024-01-17T15:30:00Z",
        status: "approved"
    },
    {
        id: "3",
        authorName: "Robert Johnson",
        rating: 1,
        content: "Terrible experience. Would not recommend.",
        entityId: "1",
        createdAt: "2024-01-16T09:15:00Z",
        status: "rejected"
    }
];

export default function ReviewsPage() {
    const [reviews] = useState<Review[]>(initialReviews);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredReviews = useMemo(() =>
        reviews.filter(
            (r) =>
                r.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.content.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [reviews, searchQuery]
    );

    const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
    const paginatedReviews = filteredReviews.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status: Review['status']) => {
        switch (status) {
            case 'approved':
                return 'bg-green-500/10 text-green-400';
            case 'rejected':
                return 'bg-red-500/10 text-red-400';
            default:
                return 'bg-yellow-500/10 text-yellow-400';
        }
    };

    const columns: ColumnDef<Review>[] = [
        {
            key: "author",
            header: "Author",
            render: (review) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center hidden md:flex">
                        <span className="text-sm font-medium text-white">
                            {review.authorName.charAt(0)}
                        </span>
                    </div>
                    <div className="md:ml-3">
                        <div className="font-medium text-white">{review.authorName}</div>
                        <div className="text-xs text-zinc-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "rating",
            header: "Rating",
            render: (review) => (
                <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating
                                ? "text-yellow-400 fill-current"
                                : "text-zinc-600"
                                }`}
                        />
                    ))}
                </div>
            ),
        },
        {
            key: "content",
            header: "Content",
            hideOnMobile: true,
            render: (review) => (
                <div className="max-w-xs text-sm text-zinc-400 truncate">
                    {review.content}
                </div>
            ),
        },
        {
            key: "status",
            header: "Status",
            render: (review) => (
                <span className={`badge ${getStatusBadge(review.status)}`}>
                    {review.status}
                </span>
            ),
        },
    ];

    const renderActions = (review: Review) => (
        <>
            <button
                className="btn-ghost text-green-400 hover:bg-green-500/10"
                title="Approve"
            >
                <Check className="h-4 w-4" />
            </button>
            <button
                className="btn-danger"
                title="Reject"
            >
                <X className="h-4 w-4" />
            </button>
        </>
    );

    return (
        <>
            {/* Fixed Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-white">Reviews</h1>
                        <p className="text-xs md:text-sm text-zinc-400 mt-1">Moderate and manage customer reviews</p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search reviews..."
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
                            data={paginatedReviews}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="author"
                            emptyMessage={searchQuery ? "No reviews match your search." : "No reviews yet."}
                        />
                    </div>

                    {/* Pagination */}
                    {filteredReviews.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredReviews.length}
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
