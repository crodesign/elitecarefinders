"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, FileText, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import type { Post } from "@/types";
import { Pagination } from "@/components/admin/Pagination";
import { DataTable, type ColumnDef } from "@/components/admin/DataTable";
import { getPosts, deletePost, createPost, updatePost } from "@/lib/services/postService";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { useRouter, useSearchParams } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year ago' : `${years} years ago`;
}

function getPostTypeLabel(type: string | undefined): string {
    if (!type) return '—';
    switch (type) {
        case 'general': return 'General Post';
        case 'caregiver_resources': return 'Caregiver Resources';
        case 'caregiving_for_caregivers': return 'Caregiving for Caregivers';
        case 'resident_resources': return 'Resident Resources';
        case 'news_events': return 'News & Events';
        case 'recipes': return 'Recipes';
        default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

export default function PostsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showNotification } = useNotification();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [postToDelete, setPostToDelete] = useState<Post | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);

    useEffect(() => {
        loadPosts();
    }, []);

    useEffect(() => {
        const action = searchParams.get('action');
        const editSlug = searchParams.get('edit');

        if (action === 'create') {
            setEditingPost(null);
            setIsFormOpen(true);
            router.replace('/admin/posts', { scroll: false });
        } else if (editSlug && posts.length > 0) {
            const postToEdit = posts.find((p) => p.slug === editSlug);
            if (postToEdit) {
                setEditingPost(postToEdit);
                setIsFormOpen(true);
            } else {
                router.replace('/admin/posts', { scroll: false });
            }
        }
    }, [searchParams, router, posts]);

    const handleOpenCreate = () => {
        setEditingPost(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (post: Post) => {
        setEditingPost(post);
        setIsFormOpen(true);
        router.push(`/admin/posts?edit=${post.slug}`, { scroll: false });
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingPost(null);
        router.push('/admin/posts', { scroll: false });
    };

    const handleSave = async (data: Partial<Post>) => {
        try {
            let savedPost: Post;
            if (editingPost) {
                savedPost = await updatePost(editingPost.id, data);
                showNotification("Post Updated", data.title || "Post updated successfully");
            } else {
                savedPost = await createPost(data as any);
                showNotification("Post Created", data.title || "Post created successfully");
            }

            await loadPosts();
            setEditingPost(savedPost);

            const currentParams = new URLSearchParams(searchParams.toString());
            currentParams.delete('action');
            currentParams.set('edit', savedPost.slug);
            router.replace(`/admin/posts?${currentParams.toString()}`, { scroll: false });
        } catch (error: any) {
            console.error("Failed to save:", error);
            throw error;
        }
    };

    const loadPosts = async () => {
        try {
            const data = await getPosts();
            setPosts(data);
        } catch (error) {
            console.error("Failed to fetch posts:", error);
            showNotification("Error", "Failed to load posts");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (post: Post) => {
        setPostToDelete(post);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!postToDelete) return;

        setIsDeleting(postToDelete.id);
        setIsDeleteModalOpen(false);
        try {
            await deletePost(postToDelete.id, postToDelete.slug);
            showNotification("Post Deleted", "Post has been removed");
            setPosts(posts.filter(p => p.id !== postToDelete.id));
        } catch (error) {
            console.error("Failed to delete post:", error);
            showNotification("Error", "Failed to delete post");
        } finally {
            setIsDeleting(null);
            setPostToDelete(null);
        }
    };

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

    const getStatusBadge = (status: Post['status']) => {
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

    const columns: ColumnDef<Post>[] = [
        {
            key: "title",
            header: "Post",
            render: (post) => (
                <button
                    type="button"
                    onClick={() => handleOpenEdit(post)}
                    className="flex items-center text-left hover:opacity-80 transition-opacity w-full group"
                >
                    <span className="mr-2 hidden md:block flex-shrink-0">
                        <div className="h-[60px] w-[60px] rounded border-2 border-ui-border flex items-center justify-center overflow-hidden">
                            {post.featuredImageUrl ? (
                                <img
                                    src={post.featuredImageUrl.startsWith('/images/media/') ? post.featuredImageUrl.replace(/(\.[^.]+)$/, '-100x100.webp') : post.featuredImageUrl}
                                    alt={`${post.title} cover`}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <FileText className={`h-5 w-5 ${post.status === 'published' ? 'text-emerald-500' : 'text-content-muted'}`} />
                            )}
                        </div>
                    </span>
                    <div>
                        <div className="font-medium text-content-primary group-hover:text-accent transition-colors">{post.title}</div>
                        <div className="text-xs text-content-muted hidden md:block max-w-sm truncate">{post.excerpt || '—'}</div>
                    </div>
                </button>
            ),
        },
        {
            key: "type",
            header: "Post Type",
            render: (post) => (
                <span className="text-sm text-content-secondary">
                    {getPostTypeLabel(post.postType)}
                </span>
            ),
        },
        {
            key: "date",
            header: "Date",
            render: (post) => (
                <span className="text-sm text-content-muted">
                    {timeAgo(post.createdAt)}
                </span>
            ),
        },
    ];

    const renderActions = (post: Post) => (
        <>
            <button
                className="btn-ghost"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleOpenEdit(post);
                }}
            >
                <Pencil className="h-4 w-4" />
            </button>
            <button
                className="btn-danger"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteClick(post);
                }}
                disabled={isDeleting === post.id}
            >
                {isDeleting === post.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="h-4 w-4" />
                )}
            </button>
        </>
    );

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <>
            {/* Fixed Header Section */}
            <div className="flex-none p-4 md:p-8 pb-4 md:pb-6 space-y-4 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-content-primary">Posts</h1>
                        <p className="text-xs md:text-sm text-content-secondary mt-1">Manage articles, resources, news, and recipes</p>
                    </div>
                    <button
                        onClick={handleOpenCreate}
                        className="p-2 bg-accent hover:bg-accent-light text-white rounded-lg transition-colors md:px-4 md:py-2 inline-flex items-center"
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
                            emptyMessage={searchQuery ? "No posts match your search." : "No posts yet."}
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

            <PostForm
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                onSave={handleSave}
                post={editingPost}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Post"
                message={`Are you sure you want to delete "${postToDelete?.title}"? This action cannot be undone and will permanently remove this post and all of its gallery images from the server.`}
                confirmLabel={isDeleting ? "Deleting..." : "Delete Post"}
                cancelLabel="Cancel"
                isDangerous={true}
            />
        </>
    );
}
