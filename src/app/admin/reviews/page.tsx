"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Star, X, Search, Pencil, Save, Trash2, Loader2, Link as LinkIcon, User, Upload, Globe, MessageSquare, Heart, Image as ImageIcon, Plus, Youtube, ExternalLink, ThumbsUp, ThumbsDown, Check, Ban } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook } from '@fortawesome/free-brands-svg-icons';
import Link from "next/link";
import { HeartLoader } from "@/components/ui/HeartLoader";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { EnhancedSelect } from "@/components/admin/EnhancedSelect";
import type { Review } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { SlidePanel } from "@/components/admin/SlidePanel";
import { createClientComponentClient as createClient } from "@/lib/supabase";
import { useNotification } from "@/contexts/NotificationContext";
import { Tooltip } from "@/components/ui/tooltip";
import { usePersistedPageSize } from "@/hooks/usePersistedPageSize";
import { uploadMedia } from "@/lib/services/mediaService";
import { getFolderBySlug } from "@/lib/services/mediaFolderService";

const GoogleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function ReviewsPage() {
    const supabase = createClient();
    const { showNotification } = useNotification();

    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState<string | null>(null);

    const SOURCE_OPTIONS = [
        { value: 'internal', label: 'Internal Source', icon: Heart, iconColor: 'text-red-500' },
        { value: 'video', label: 'Internal Video', icon: Youtube, iconColor: 'text-red-600' },
        { value: 'google', label: 'Google', icon: GoogleIcon },
        { value: 'facebook', label: 'Facebook', icon: ({ className }: { className?: string }) => <FontAwesomeIcon icon={faFacebook} className={className} />, iconColor: 'text-[#1877F2]' }
    ];

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedPageSize();
    const [editingReview, setEditingReview] = useState<Partial<Review> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isPostingReply, setIsPostingReply] = useState(false);
    const [isUploadingGallery, setIsUploadingGallery] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Reviews media folder
    const [reviewsFolderId, setReviewsFolderId] = useState<string | null>(null);
    useEffect(() => {
        getFolderBySlug('reviews').then(f => setReviewsFolderId(f?.id ?? null));
    }, []);

    // Photo upload state
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null);
    useEffect(() => {
        supabase.from('google_integrations').select('google_maps_url').limit(1).single()
            .then(({ data }) => setGoogleMapsUrl(data?.google_maps_url || null));
    }, []);

    const generateSlug = (review: Review) => {
        const nameSlug = (review.authorName || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `${nameSlug}-${review.id.slice(0, 6)}`;
    };

    useEffect(() => {
        fetchReviews();

        // Handle OAuth success/error callbacks
        const searchParamsLocal = new URLSearchParams(window.location.search);
        const successParam = searchParamsLocal.get('success');
        const errorParam = searchParamsLocal.get('error');

        if (successParam) {
            showNotification('Success', successParam);
            // Clean up the URL
            window.history.replaceState(null, '', window.location.pathname);
        } else if (errorParam) {
            showNotification('Error', errorParam);
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, [showNotification]);

    // Handle URL query for edit
    useEffect(() => {
        if (reviews.length === 0) return;

        const editId = searchParams.get('edit');
        const action = searchParams.get('action');

        if (action === 'create') {
            setEditingReview({ status: 'pending', rating: 5, content: '', authorName: '' });
            setIsCreating(true);
            router.replace('/admin/reviews', { scroll: false });
        } else if (editId) {
            const review = reviews.find(r => r.id === editId || generateSlug(r) === editId);
            if (review) {
                setEditingReview({ ...review });
                setIsCreating(false);
            } else {
                router.replace('/admin/reviews', { scroll: false });
            }
        }
    }, [searchParams, reviews, router]);

    const handleOpenEdit = (review: Review) => {
        setEditingReview({ ...review });
        setIsCreating(false);
        router.push(`/admin/reviews?edit=${generateSlug(review)}`, { scroll: false });
    };

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
                externalId: row.external_id,
                images: row.images || [],
                response: row.response || ''
            }));

            setReviews(mappedReviews);
        } catch (error: any) {
            console.error('Error fetching reviews:', error);
            showNotification("Error", "Failed to load reviews.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImageUrl(reader.result as string);
                setIsCropModalOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropSave = (croppedImageUrl: string) => {
        if (editingReview) {
            setEditingReview({ ...editingReview, authorPhotoUrl: croppedImageUrl });
        }
        setIsCropModalOpen(false);
        setSelectedImageUrl('');
    };

    const handleCropCancel = () => {
        setIsCropModalOpen(false);
        setSelectedImageUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!editingReview) return;

        // Basic validation
        const isVideo = editingReview.source === 'video';
        if (!editingReview.authorName?.trim()) {
            showNotification("Error", "Author name is required.");
            return;
        }
        if (isVideo && !editingReview.sourceLink?.trim()) {
            showNotification("Error", "YouTube URL is required for video reviews.");
            return;
        }
        if (!isVideo && !editingReview.content?.trim()) {
            showNotification("Error", "Review content is required.");
            return;
        }

        try {
            setIsSaving(true);

            let finalPhotoUrl = editingReview.authorPhotoUrl;

            // If photo was changed (data URL from cropper), upload it to R2
            if (finalPhotoUrl && finalPhotoUrl.startsWith('data:')) {
                const blob = await (await fetch(finalPhotoUrl)).blob();
                const file = new File([blob], 'review-author.jpg', { type: 'image/jpeg' });
                const item = await uploadMedia(file, reviewsFolderId);
                finalPhotoUrl = item.url;
            }

            const reviewData = {
                author_name: editingReview.authorName?.trim() || 'Anonymous',
                rating: editingReview.rating || 5,
                content: editingReview.content?.trim() || '',
                status: editingReview.status || 'pending',
                author_photo_url: finalPhotoUrl || null,
                images: editingReview.images || [],
                source: editingReview.source?.trim() || 'internal',
                source_link: editingReview.sourceLink?.trim() || null,
                response: editingReview.response?.trim() || null,
                entity_id: editingReview.entityId || '00000000-0000-0000-0000-000000000000'
            };

            if (isCreating) {
                const { data, error } = await supabase
                    .from('reviews')
                    .insert([reviewData])
                    .select()
                    .single();

                if (error) throw error;
                showNotification("Success", "Review added successfully");

                if (data) {
                    const mappedNewReview: Review = {
                        id: data.id,
                        authorName: data.author_name,
                        rating: data.rating,
                        content: data.content,
                        entityId: data.entity_id,
                        status: data.status,
                        createdAt: data.created_at,
                        source: data.source,
                        sourceLink: data.source_link,
                        authorPhotoUrl: data.author_photo_url,
                        externalId: data.external_id,
                        images: data.images || []
                    };
                    const currentParams = new URLSearchParams(searchParams.toString());
                    currentParams.delete('action');
                    currentParams.set('edit', generateSlug(mappedNewReview));
                    router.replace(`/admin/reviews?${currentParams.toString()}`, { scroll: false });
                }

            } else {
                const { error } = await supabase
                    .from('reviews')
                    .update(reviewData)
                    .eq('id', editingReview.id);

                if (error) throw error;
                showNotification("Success", "Review updated successfully");

                const currentParams = new URLSearchParams(searchParams.toString());
                currentParams.set('edit', generateSlug(editingReview as Review));
                router.replace(`/admin/reviews?${currentParams.toString()}`, { scroll: false });
            }

            // Let fetchReviews reload the state but also close the current dirty form handling
            // Do not null out editingReview here so the drawer stays open on save like other forms
            fetchReviews();
        } catch (error: any) {
            console.error('Error saving review:', error);
            const msg = error?.message || error?.details || JSON.stringify(error);
            showNotification("Error", `Failed to save review: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !editingReview) return;

        // Ensure we have an ID (for unsaved reviews, we might need to prompt save first or use a temp ID)
        if (!editingReview.id) {
            showNotification("Info", "Please save the review once before uploading gallery images.");
            return;
        }

        try {
            setIsUploadingGallery(true);
            const newImages = [...(editingReview.images || [])];

            for (let i = 0; i < files.length; i++) {
                const item = await uploadMedia(files[i], reviewsFolderId);
                newImages.push(item.url);
            }

            setEditingReview({ ...editingReview, images: newImages });
            showNotification("Success", `${files.length} image(s) uploaded successfully`);
        } catch (error: any) {
            console.error('Error uploading gallery images:', error);
            showNotification("Error", "Failed to upload gallery images");
        } finally {
            setIsUploadingGallery(false);
            if (galleryInputRef.current) galleryInputRef.current.value = '';
        }
    };

    const handleDeleteGalleryImage = (index: number) => {
        if (!editingReview || !editingReview.images) return;
        const newImages = [...editingReview.images];
        newImages.splice(index, 1);
        setEditingReview({ ...editingReview, images: newImages });
    };

    const handleDelete = (review: Review) => {
        setReviewToDelete(review);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!reviewToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', reviewToDelete.id);

            if (error) throw error;

            showNotification("Success", "Review deleted successfully");
            fetchReviews();
        } catch (error: any) {
            console.error('Error deleting review:', error);
            showNotification("Error", "Failed to delete review");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setReviewToDelete(null);
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
                    throw new Error(data.details || data.error || 'Failed to sync');
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
        reviews.filter((r) => {
            if (sourceFilter && (r.source || 'internal') !== sourceFilter) return false;
            if (!searchQuery) return true;
            return r.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.content.toLowerCase().includes(searchQuery.toLowerCase());
        }),
        [reviews, searchQuery, sourceFilter]
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
            header: (
                <div className="flex items-center gap-2">
                    <span>Author</span>
                    <div className="flex items-center gap-0.5 ml-1">
                        {[
                            { key: 'internal', icon: <Heart className={`h-4 w-4 ${sourceFilter === 'internal' ? 'text-red-500 fill-current' : 'text-content-muted opacity-40'}`} /> },
                            { key: 'google', icon: <GoogleIcon className={`h-4 w-4 ${sourceFilter === 'google' ? '' : 'opacity-40 grayscale'}`} /> },
                            { key: 'facebook', icon: <FontAwesomeIcon icon={faFacebook} className={`h-4 w-4 ${sourceFilter === 'facebook' ? 'text-[#1877F2]' : 'text-content-muted opacity-40'}`} /> },
                            { key: 'video', icon: <Youtube className={`h-4 w-4 ${sourceFilter === 'video' ? 'text-red-600' : 'text-content-muted opacity-40'}`} /> },
                        ].map(({ key, icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSourceFilter(sourceFilter === key ? null : key); setCurrentPage(1); }}
                                className="p-1 rounded hover:bg-surface-hover transition-colors"
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>
            ),
            headerLabel: "Author",
            render: (review) => (
                <button
                    type="button"
                    onClick={() => handleOpenEdit(review)}
                    className="flex items-center text-left hover:opacity-80 transition-opacity w-full group"
                >
                    <div className="relative h-8 w-8 flex-shrink-0 hidden md:block">
                        {review.authorPhotoUrl && (
                            <img
                                src={review.authorPhotoUrl}
                                alt={review.authorName}
                                className="absolute inset-0 h-8 w-8 rounded-full object-cover z-10"
                                referrerPolicy="no-referrer"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        )}
                        <div className="h-8 w-8 rounded-full bg-surface-hover flex items-center justify-center">
                            <span className="text-sm font-medium text-content-primary">
                                {review.authorName.charAt(0)}
                            </span>
                        </div>
                    </div>
                    <div className="md:ml-3 flex flex-col items-start w-full min-w-0">
                        <div className="font-medium text-content-primary flex items-center gap-2 group-hover:text-accent transition-colors truncate w-full">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${review.status === 'approved' ? 'bg-emerald-500' : 'bg-gray-400/50'}`} />
                            <span className="truncate">{review.authorName}</span>
                            {review.source === 'google' && (
                                <GoogleIcon className="h-3.5 w-3.5 flex-shrink-0" />
                            )}
                            {review.source === 'facebook' && (
                                <FontAwesomeIcon icon={faFacebook} className="h-3.5 w-3.5 flex-shrink-0 text-[#1877F2]" />
                            )}
                            {(!review.source || review.source === 'internal') && (
                                <Heart className="h-3.5 w-3.5 flex-shrink-0 text-red-500 fill-current" />
                            )}
                        </div>
                        <div className="text-xs text-content-muted">
                            {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </button>
            ),
        },
        {
            key: "rating",
            header: "Rating",
            render: (review) => (
                review.source === 'facebook' ? (
                    <div className="flex items-center gap-1.5">
                        {review.rating >= 4 ? (
                            <ThumbsUp className="h-4 w-4 text-[#1877F2] fill-current" />
                        ) : (
                            <ThumbsDown className="h-4 w-4 text-red-400 fill-current" />
                        )}
                        <span className={`text-xs font-medium ${review.rating >= 4 ? 'text-[#1877F2]' : 'text-red-400'}`}>
                            {review.rating >= 4 ? 'Recommends' : 'Doesn\'t Recommend'}
                        </span>
                    </div>
                ) : (
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
                )
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
            key: "responded",
            header: "Responded",
            render: (review) => (
                review.response?.trim() ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                    <Ban className="h-4 w-4 text-content-muted opacity-50" />
                )
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
                onClick={() => handleOpenEdit(review)}
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                className="btn-danger"
                onClick={() => handleDelete(review)}
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
                        <Tooltip content="Connect Google Business Profile to sync reviews">
                            <a
                                href="/api/admin/google/auth"
                                className="btn-secondary flex items-center gap-2"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span className="hidden md:inline">Connect Google</span>
                            </a>
                        </Tooltip>
                        <Tooltip content="Force sync missing reviews from Google">
                            <button
                                onClick={handleSyncGoogle}
                                disabled={isSyncing}
                                className="btn-secondary flex items-center gap-2"
                            >
                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                )}
                                <span className="hidden md:inline">Sync</span>
                            </button>
                        </Tooltip>
                        {googleMapsUrl && (
                            <Tooltip content="View business reviews on Google">
                                <a
                                    href={googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    <Globe className="h-4 w-4" />
                                    <span className="hidden md:inline">View on Google</span>
                                </a>
                            </Tooltip>
                        )}
                        <Tooltip content="Import Facebook reviews from Trustindex">
                            <Link
                                href="/admin/reviews/import"
                                className="btn-secondary flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faFacebook} className="h-4 w-4 text-[#1877F2]" />
                                <span className="hidden md:inline">Import Facebook</span>
                            </Link>
                        </Tooltip>
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
                            <div className="flex items-center justify-center p-12">
                                <HeartLoader />
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
                width={960}
                onClose={() => {
                    setEditingReview(null);
                    router.push('/admin/reviews', { scroll: false });
                }}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Column 1: Author, Image, Source, Rating, Status */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-8 items-start bg-surface-input rounded-lg p-6">
                                <div className="space-y-4">
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

                                    <div className="space-y-1.5">
                                        <input
                                            type="text"
                                            className="form-input w-full bg-surface-input text-content-primary p-3 rounded-md border-transparent hover:bg-surface-hover focus:bg-surface-hover transition-colors"
                                            value={editingReview.authorName || ''}
                                            onChange={(e) => setEditingReview({ ...editingReview, authorName: e.target.value })}
                                            placeholder="Author Name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <EnhancedSelect
                                            value={editingReview.source || 'internal'}
                                            onChange={(val) => setEditingReview({ ...editingReview, source: val })}
                                            options={SOURCE_OPTIONS}
                                            placeholder="Select Source"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative w-32 h-32">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={handlePhotoClick}
                                            className="w-full h-full rounded-full overflow-hidden bg-surface-secondary transition-colors group hover:bg-surface-hover"
                                        >
                                            {editingReview.authorPhotoUrl ? (
                                                <img
                                                    src={editingReview.authorPhotoUrl}
                                                    alt="Review Author"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-content-muted transition-colors">
                                                    <User className="h-10 w-10 mb-1" />
                                                    <span className="text-[10px] uppercase font-bold tracking-wider">Upload</span>
                                                </div>
                                            )}
                                        </button>
                                        <div
                                            className="absolute bottom-1 right-1 bg-accent rounded-full p-2 shadow-lg cursor-pointer hover:bg-accent-light transition-colors"
                                            onClick={handlePhotoClick}
                                        >
                                            <Upload className="h-4 w-4 text-white" />
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-content-muted uppercase font-bold tracking-widest">Author Photo</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-content-primary uppercase tracking-wider text-[11px]">
                                    {editingReview.source === 'facebook' ? 'Recommendation' : 'Rating'}
                                </label>
                                {editingReview.source === 'facebook' ? (
                                    <div className="flex bg-surface-input p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setEditingReview({ ...editingReview, rating: 5 })}
                                            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                                                (editingReview.rating || 0) >= 4
                                                    ? "bg-[#1877F2] text-white shadow-sm"
                                                    : "text-content-muted hover:text-content-secondary"
                                            }`}
                                        >
                                            <ThumbsUp className="h-4 w-4" />
                                            Recommends
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingReview({ ...editingReview, rating: 1 })}
                                            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                                                (editingReview.rating || 0) < 4
                                                    ? "bg-red-600 text-white shadow-sm"
                                                    : "text-content-muted hover:text-content-secondary"
                                            }`}
                                        >
                                            <ThumbsDown className="h-4 w-4" />
                                            Doesn&apos;t Recommend
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 bg-surface-input p-4 rounded-lg">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                onClick={() => setEditingReview({ ...editingReview, rating: i + 1 })}
                                                className={`h-6 w-6 cursor-pointer transition-colors ${i < (editingReview.rating || 0)
                                                    ? "text-yellow-400 fill-current"
                                                    : "text-content-muted hover:text-yellow-400/50"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column 2: Content, Gallery, Response */}
                        <div className="space-y-6">
                            {/* YouTube URL (video source only) */}
                            {editingReview.source === 'video' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-content-primary uppercase tracking-wider text-[11px] flex items-center gap-2">
                                        <Youtube className="h-3.5 w-3.5 text-red-600" />
                                        YouTube URL
                                    </label>
                                    <input
                                        type="url"
                                        className="form-input w-full bg-surface-input text-content-primary p-3 rounded-md"
                                        value={editingReview.sourceLink || ''}
                                        onChange={(e) => setEditingReview({ ...editingReview, sourceLink: e.target.value })}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                    />
                                </div>
                            )}

                            {/* Review Content */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-content-primary uppercase tracking-wider text-[11px]">Review Content</label>
                                <textarea
                                    className="form-input w-full min-h-[200px] resize-y bg-surface-input text-content-primary p-4 rounded-lg focus:ring-2 ring-accent/20"
                                    value={editingReview.content || ''}
                                    onChange={(e) => setEditingReview({ ...editingReview, content: e.target.value })}
                                    placeholder="Enter review content..."
                                />
                            </div>

                            {/* Review Gallery */}
                            {editingReview.source !== 'video' && (
                                <div className="space-y-4 pt-4 border-t border-ui-border">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-content-primary uppercase tracking-wider text-[11px] flex items-center gap-2">
                                            <ImageIcon className="h-3.5 w-3.5" />
                                            Review Gallery
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => galleryInputRef.current?.click()}
                                            disabled={isUploadingGallery}
                                            className="btn-ghost flex items-center gap-1.5 text-xs py-1"
                                        >
                                            {isUploadingGallery ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                            {isUploadingGallery ? 'Uploading...' : 'Add Images'}
                                        </button>
                                        <input
                                            ref={galleryInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleGalleryUpload}
                                            className="hidden"
                                        />
                                    </div>

                                    {editingReview.images && editingReview.images.length > 0 ? (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {editingReview.images.map((url, index) => (
                                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden group bg-surface-secondary border border-ui-border">
                                                    <img
                                                        src={url}
                                                        alt={`Review image ${index + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteGalleryImage(index)}
                                                            className="p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => galleryInputRef.current?.click()}
                                            className="border-2 border-dashed border-ui-border rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-surface-hover transition-colors text-content-muted"
                                        >
                                            <ImageIcon className="h-8 w-8 opacity-20" />
                                            <p className="text-xs font-medium uppercase tracking-widest opacity-60">No images uploaded</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Response Section */}
                            <div className="space-y-2 pt-4 border-t border-ui-border">
                                <label className="text-sm font-medium text-content-primary uppercase tracking-wider text-[11px] flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Response
                                </label>
                                {(!editingReview.source || editingReview.source === 'internal') ? (
                                    <textarea
                                        className="form-input w-full min-h-[100px] resize-y bg-surface-input text-content-primary p-4 rounded-lg focus:ring-2 ring-accent/20"
                                        value={editingReview.response || ''}
                                        onChange={(e) => setEditingReview({ ...editingReview, response: e.target.value })}
                                        placeholder="Write your response to this review..."
                                    />
                                ) : editingReview.source === 'google' ? (
                                    <>
                                        <textarea
                                            className="form-input w-full min-h-[100px] resize-y bg-surface-input text-content-primary p-4 rounded-lg focus:ring-2 ring-accent/20"
                                            value={editingReview.response || ''}
                                            onChange={(e) => setEditingReview({ ...editingReview, response: e.target.value })}
                                            placeholder="Write your reply to this Google review..."
                                        />
                                        {editingReview.externalId && (
                                            <button
                                                type="button"
                                                disabled={isPostingReply}
                                                onClick={async () => {
                                                    setIsPostingReply(true);
                                                    try {
                                                        const res = await fetch('/api/admin/reviews/reply', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                reviewId: editingReview.id,
                                                                externalId: editingReview.externalId,
                                                                comment: editingReview.response || '',
                                                            }),
                                                        });
                                                        const data = await res.json();
                                                        if (!res.ok) throw new Error(data.details || data.error);
                                                        showNotification("Success", editingReview.response?.trim() ? "Reply posted to Google" : "Reply removed from Google");
                                                    } catch (err: any) {
                                                        showNotification("Error", err.message || "Failed to post reply");
                                                    } finally {
                                                        setIsPostingReply(false);
                                                    }
                                                }}
                                                className="btn-secondary inline-flex items-center gap-2"
                                            >
                                                {isPostingReply ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <GoogleIcon className="h-4 w-4" />
                                                )}
                                                {editingReview.response?.trim() ? 'Post Reply to Google' : 'Remove Reply from Google'}
                                            </button>
                                        )}
                                    </>
                                ) : editingReview.source === 'facebook' ? (
                                    <a
                                        href="https://www.facebook.com/elitecarefinders/reviews"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary inline-flex items-center gap-2"
                                    >
                                        <FontAwesomeIcon icon={faFacebook} className="h-4 w-4 text-[#1877F2]" />
                                        Respond on Facebook
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </SlidePanel>

            <ImageCropModal
                isOpen={isCropModalOpen}
                imageUrl={selectedImageUrl}
                onClose={handleCropCancel}
                onSave={handleCropSave}
            />

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setReviewToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Review"
                message={
                    <span>
                        Are you sure you want to delete the review by <strong>{reviewToDelete?.authorName}</strong>?
                        <br />
                        This action cannot be undone.
                    </span>
                }
                confirmLabel="Delete Review"
                isLoading={isDeleting}
            />
        </>
    );
}
