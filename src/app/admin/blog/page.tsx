"use client";

import { useState, useMemo } from "react";
import { Plus, FileText, Pencil, Trash2, Search } from "lucide-react";
import type { BlogPost } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";

// Mock data
const initialPosts: BlogPost[] = [
    {
        id: "1",
        title: "10 Tips for Choosing a Care Home",
        slug: "10-tips-choosing-care-home",
        description: "A comprehensive guide for families.",
        images: [],
        content: "# 10 Tips...",
        authorId: "admin",
        status: "published",
        createdAt: "2024-01-05T10:00:00Z",
        updatedAt: "2024-01-05T10:00:00Z",
        publishedAt: "2024-01-05T10:00:00Z",
        tags: ["guide", "senior-living"]
    },
    {
        id: "2",
        title: "Understanding Memory Care",
        slug: "understanding-memory-care",
        description: "What you need to know about dementia care.",
        images: [],
        content: "Memory care is...",
        authorId: "admin",
        status: "draft",
        createdAt: "2024-01-18T09:00:00Z",
        updatedAt: "2024-01-18T09:00:00Z",
        tags: ["memory-care", "dementia"]
    }
];

export default function BlogPage() {
    const [posts] = useState<BlogPost[]>(initialPosts);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredPosts = useMemo(() =>
        posts.filter(
            (p) =>
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [posts, searchQuery]
    );

    const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
    const paginatedPosts = filteredPosts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status: BlogPost['status']) => {
        switch (status) {
            case 'published':
                return 'bg-green-500/10 text-green-400';
            case 'draft':
                return 'bg-zinc-500/10 text-content-muted';
            case 'archived':
                return 'bg-red-500/10 text-red-400';
            default:
                return 'bg-zinc-500/10 text-content-muted';
        }
    };

    const columns: ColumnDef<BlogPost>[] = [
        {
            key: "title",
            header: "Post",
            render: (post) => (
                <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-content-muted hidden md:block" />
                    <div>
                        <div className="font-medium text-content-primary">{post.title}</div>
                        <div className="text-xs text-content-muted hidden md:block">{post.description}</div>
                    </div>
                </div>
            ),
        },
        {
            key: "status",
            header: "Status",
            render: (post) => (
                <span className={`badge ${getStatusBadge(post.status)}`}>
                    {post.status}
                </span>
            ),
        },
        {
            key: "date",
            header: "Date",
            render: (post) => (
                <span className="text-sm text-content-secondary">
                    {new Date(post.createdAt).toLocaleDateString()}
                </span>
            ),
        },
    ];

    const renderActions = (post: BlogPost) => (
        <>
            <button className="btn-ghost">
                <Pencil className="h-4 w-4" />
            </button>
            <button className="btn-danger">
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
                        <h1 className="text-xl md:text-2xl font-bold text-content-primary">Blog Posts</h1>
                        <p className="text-xs md:text-sm text-content-secondary mt-1">Manage blog content and articles</p>
                    </div>
                    <button
                        className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2"
                    >
                        <Plus className="h-5 w-5 md:hidden" />
                        <span className="hidden md:flex md:items-center md:gap-2">
                            <Plus className="h-5 w-5" />
                            New Post
                        </span>
                    </button>
                </div>

                <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                    <input
                        type="text"
                        placeholder="Search posts..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="search-field pl-8"
                    />
                </div>
            </div>

            {/* Scrollable Table Section */}
            <div className="flex-1 min-h-0 overflow-hidden px-4 md:px-8 pb-4 md:pb-8">
                <div className="bg-surface-card rounded-xl h-full flex flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-auto">
                        <DataTable
                            columns={columns}
                            data={paginatedPosts}
                            keyField="id"
                            actions={renderActions}
                            primaryColumn="title"
                            emptyMessage={searchQuery ? "No posts match your search." : "No blog posts yet."}
                        />
                    </div>

                    {/* Pagination */}
                    {filteredPosts.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredPosts.length}
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
