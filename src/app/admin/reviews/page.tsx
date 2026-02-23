"use client";

import { useState, useMemo, useEffect } from "react";
import { Star, X, Search, Pencil, Save, Trash2, Loader2, Link as LinkIcon } from "lucide-react";
import type { Review } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { SlidePanel } from "@/components/admin/SlidePanel";
import { createClientComponentClient as createClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/NotificationContext";

export default function ReviewsPage() {
    const supabase = createClient();
    const { showNotification } = useNotification();

    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [editingReview, setEditingReview] = useState<Partial<Review> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchReviews();

        // Handle OAuth success/error callbacks
        const searchParams = new URLSearchParams(window.location.search);
        const successParam = searchParams.get('success');
        const errorParam = searchParams.get('error');

        if (successParam) {
            showNotification('Success', successParam);
            // Clean up the URL
            window.history.replaceState(null, '', window.location.pathname);
        } else if (errorParam) {
            showNotification('Error', errorParam);
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [showNotification]);

    const fetchReviews = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map database columns to camelCase
            const mappedReviews: Review[] = (data || []).map((row: any) => ({
                id: row.id,
                authorName: row.author_name,
                rating: row.rating,
                content: row.content,
                entityId: row.entity_id,
                status: row.status,
                createdAt: row.created_at,
                source: row.source,
                sourceLink: row.source_link,
                authorPhotoUrl: row.author_photo_url,
                externalId: row.external_id
            }));

            setReviews(mappedReviews);
        } catch (error: any) {
            console.error('Error fetching reviews:', error);
            showNotification("Error", "Failed to load reviews.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingReview) return;

        // Basic validation
        if (!editingReview.authorName?.trim() || !editingReview.content?.trim()) {
            showNotification("Error", "Name and Content are required.");
            return;
        }

        try {
            setIsSaving(true);
            const reviewData = {
                author_name: editingReview.authorName.trim(),
                rating: editingReview.rating || 5,
                content: editingReview.content.trim(),
                status: editingReview.status || 'pending',
                // Temporarily generic entity id for manually created reviews until linked
                entity_id: editingReview.entityId || '00000000-0000-0000-0000-000000000000'
            };

            if (isCreating) {
                const { error } = await supabase
                    .from('reviews')
                    .insert([reviewData]);

                if (error) throw error;
                showNotification("Success", "Review added successfully");
            } else {
                const { error } = await supabase
                    .from('reviews')
                    .update(reviewData)
                    .eq('id', editingReview.id);

                if (error) throw error;
                showNotification("Success", "Review updated successfully");
            }

            setEditingReview(null);
            fetchReviews();
        } catch (error: any) {
            console.error('Error saving review:', error);
            showNotification("Error", "Failed to save review");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this review?")) return;

        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showNotification("Success", "Review deleted successfully");
            fetchReviews();
        } catch (error: any) {
            console.error('Error deleting review:', error);
            showNotification("Error", "Failed to delete review");
        }
    };

    const handleSyncGoogle = async () => {
        try {
            setIsSyncing(true);
            const response = await fetch('/api/cron/sync-google-reviews?secret=sync-override');
            const data = await response.json();

            if (!response.ok) {
                if (data.message === 'No integration configured') {
                    showNotification("Info", "Google Business Profile not connected yet.");
                } else {
                    throw new Error(data.error || 'Failed to sync');
                }
            } else {
                showNotification("Success", data.message || "Successfully pulled reviews from Google");
                fetchReviews();
            }
        } catch (error: any) {
            console.error('Error syncing Google reviews:', error);
            showNotification("Error", error.message || "Failed to sync reviews");
        } finally {
            setIsSyncing(false);
        }
    };

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
                    {review.authorPhotoUrl ? (
                        <img
                            src={review.authorPhotoUrl}
                            alt={review.authorName}
                            className="h-8 w-8 rounded-full object-cover hidden md:block"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-surface-hover flex items-center justify-center hidden md:flex">
                            <span className="text-sm font-medium text-content-primary">
                                {review.authorName.charAt(0)}
                            </span>
                        </div>
                    )}
                    <div className="md:ml-3 flex flex-col items-start">
                        <div className="font-medium text-content-primary flex items-center gap-2">
                            {review.authorName}
                            {review.source === 'google' && (
                                <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            )}
                        </div>
                        <div className="text-xs text-content-muted">
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
                                : "text-content-muted"
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
                <div className="max-w-xs text-sm text-content-muted truncate">
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
                className="btn-ghost"
                onClick={() => {
                    setEditingReview({ ...review });
                    setIsCreating(false);
                }}
                title="Edit Review"
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                className="btn-danger"
                title="Delete Review"
                onClick={() => handleDelete(review.id)}
            >
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
                        <h1 className="text-xl md:text-2xl font-bold text-content-primary">Reviews</h1>
                        <p className="text-xs md:text-sm text-content-muted mt-1">Moderate and manage customer reviews</p>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href="/api/admin/google/auth"
                            className="btn-secondary flex items-center gap-2"
                            title="Connect Google Business Profile to sync reviews"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="hidden md:inline">Connect Google</span>
                        </a>
                        <button
                            onClick={handleSyncGoogle}
                            disabled={isSyncing}
                            className="btn-secondary flex items-center gap-2"
                            title="Force sync missing reviews from Google"
                        >
                            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                            <span className="hidden md:inline">Sync</span>
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => {
                                setEditingReview({ status: 'pending', rating: 5, content: '', authorName: '' });
                                setIsCreating(true);
                            }}
                        >
                            Add Review
                        </button>
                    </div>
                </div>

                <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted" />
                    <input
                        type="text"
                        placeholder="Search reviews..."
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
                        {isLoading ? (
                            <div className="flex items-center justify-center p-12 text-content-muted">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                <span>Loading reviews...</span>
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={paginatedReviews}
                                keyField="id"
                                actions={renderActions}
                                primaryColumn="author"
                                emptyMessage={searchQuery ? "No reviews match your search." : "No reviews found."}
                            />
                        )}
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

            {/* Edit/Create Review Slide Panel */}
            <SlidePanel
                isOpen={!!editingReview}
                onClose={() => setEditingReview(null)}
                title={isCreating ? "Add Review" : "Edit Review"}
                subtitle={editingReview?.authorName ? `By ${editingReview.authorName}` : ""}
                headerChildren={
                    <div className="flex items-center justify-between pl-4 pr-6 border-b-[6px]" style={{ borderColor: 'var(--surface-tab-border)' }}>
                        <div className="flex items-start overflow-visible gap-1 pt-2 px-2" />
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="ml-4 mr-2 md:mr-0 p-[5px] md:w-auto md:h-auto md:px-6 md:py-1.5 flex items-center justify-center text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-light transition-colors shadow-lg shadow-black/20"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <span className="hidden md:inline">{isCreating ? "Create Review" : "Update Review"}</span>
                                        <Save className="h-5 w-5 md:hidden" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                }
            >
                {editingReview && (
                    <div className="space-y-6">
                        {/* Status Section (Moved to top) */}
                        <div className="bg-surface-input rounded-lg p-4 space-y-4">
                            <label className="text-sm font-medium text-content-primary">
                                Status
                            </label>
                            <div className="flex bg-surface-input p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setEditingReview({ ...editingReview, status: 'pending' })}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${editingReview.status === 'pending'
                                        ? "bg-yellow-600 text-white shadow-sm"
                                        : "text-content-muted hover:text-content-secondary"
                                        }`}
                                >
                                    Pending
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingReview({ ...editingReview, status: 'approved' })}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${editingReview.status === 'approved'
                                        ? "bg-emerald-600 text-white shadow-sm"
                                        : "text-content-muted hover:text-content-secondary"
                                        }`}
                                >
                                    Approved
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingReview({ ...editingReview, status: 'rejected' })}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${editingReview.status === 'rejected'
                                        ? "bg-red-600 text-white shadow-sm"
                                        : "text-content-muted hover:text-content-secondary"
                                        }`}
                                >
                                    Rejected
                                </button>
                            </div>
                        </div>

                        {/* Author Form Field for Creating */}
                        {isCreating && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-content-primary">Author Name</label>
                                <input
                                    type="text"
                                    className="form-input w-full bg-surface-input text-content-primary p-3 rounded-md"
                                    value={editingReview.authorName || ''}
                                    onChange={(e) => setEditingReview({ ...editingReview, authorName: e.target.value })}
                                    placeholder="Enter author name..."
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-content-primary">Rating</label>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        onClick={() => setEditingReview({ ...editingReview, rating: i + 1 })}
                                        className={`h-5 w-5 cursor-pointer transition-colors ${i < (editingReview.rating || 0)
                                            ? "text-yellow-400 fill-current"
                                            : "text-content-muted hover:text-yellow-400/50"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-content-primary">Review Content</label>
                            <textarea
                                className="form-input w-full min-h-[150px] resize-y bg-surface-input text-content-primary p-3 rounded-md"
                                value={editingReview.content || ''}
                                onChange={(e) => setEditingReview({ ...editingReview, content: e.target.value })}
                                placeholder="Enter review content..."
                            />
                        </div>
                    </div>
                )}
            </SlidePanel>
        </>
    );
}
