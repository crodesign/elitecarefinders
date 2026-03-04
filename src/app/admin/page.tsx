"use client";

import { useEffect, useState } from "react";
import { Home, Building2, FileText, Star, Plus, ArrowRight, Heart, Facebook, ImageOff, User, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getFacilities } from "@/lib/services/facilityService";
import { getHomes } from "@/lib/services/homeService";
import { getPosts } from "@/lib/services/postService";
import { createClientComponentClient as createClient } from "@/lib/supabase";
import type { Review, Post } from "@/types";
import type { Home as HomeType } from "@/types";
import type { Facility } from "@/types";

const GoogleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const POST_TYPE_LABELS: Record<string, string> = {
    general: "General",
    caregiver_resources: "Caregiver Res.",
    caregiving_for_caregivers: "C4C",
    resident_resources: "Resident Res.",
    news_events: "News & Events",
    recipes: "Recipes",
};

function thumbUrl(url?: string | null): string | null {
    if (!url || !url.startsWith("/images/media/")) return null;
    return url.replace(/(\.[^.]+)$/, "-100x100.webp");
}

interface RecentItem {
    id: string;
    title: string;
    imageUrl: string | null;
    isExternalImage?: boolean;
    badge?: string;
    badgeAccent?: boolean;
    href: string;
    prefix?: React.ReactNode;
    inlineSuffix?: string;
}

function RecentRows({ items, loading }: { items: RecentItem[]; loading: boolean }) {
    if (loading) return <div className="px-4 py-3 text-sm text-content-muted">Loading...</div>;
    if (items.length === 0) return <div className="px-4 py-3 text-sm text-content-muted">No entries yet.</div>;
    return (
        <>
            {items.map((item) => {
                const thumb = item.isExternalImage ? item.imageUrl : thumbUrl(item.imageUrl);
                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors group border-t border-ui-border"
                    >
                        <div className="w-9 h-9 rounded-md overflow-hidden bg-surface-input flex-shrink-0 flex items-center justify-center">
                            {thumb ? (
                                <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                                item.isExternalImage === false
                                    ? <ImageOff className="h-3.5 w-3.5 text-content-muted" />
                                    : <User className="h-3.5 w-3.5 text-content-muted" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-content-primary font-medium flex items-center gap-1.5 min-w-0">
                                {item.prefix}
                                <span className="truncate">{item.title}</span>
                                {item.inlineSuffix && (
                                    <span className="text-[10px] text-content-muted font-normal flex-shrink-0">{item.inlineSuffix}</span>
                                )}
                            </p>
                            {item.badge && (
                                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${item.badgeAccent ? "bg-accent text-white" : "bg-surface-input text-content-muted"}`}>
                                    {item.badge}
                                </span>
                            )}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </Link>
                );
            })}
        </>
    );
}

function EntityPanel({ name, manageHref, createHref, icon: Icon, published, unpublished, loading, items }: {
    name: string; manageHref: string; createHref: string; icon: React.ElementType;
    published: number; unpublished: number; loading: boolean; items: RecentItem[];
}) {
    return (
        <div className="card border-0 flex flex-col overflow-hidden">
            <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <Icon className="h-7 w-7 text-accent" />
                    <Link href={createHref} className="p-1.5 rounded-lg bg-surface-input hover:bg-accent hover:text-white text-content-secondary transition-colors" title={`New ${name.slice(0, -1)}`}>
                        <Plus className="h-4 w-4" />
                    </Link>
                </div>
                <div>
                    <h3 className="text-content-primary font-semibold text-base">{name}</h3>
                    {loading ? (
                        <p className="text-sm text-content-muted mt-1">Loading...</p>
                    ) : (
                        <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-white">
                                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                                {published} published
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-surface-input text-content-muted">
                                <span className="w-1.5 h-1.5 rounded-full bg-content-muted inline-block" />
                                {unpublished} draft
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <RecentRows items={items} loading={loading} />
            <Link href={manageHref} className="flex items-center justify-between px-4 py-2.5 text-xs text-content-muted hover:text-accent border-t border-ui-border transition-colors mt-auto">
                <span>View all {name.toLowerCase()}</span>
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    );
}

function BlogPanel({ loading, count, items }: { loading: boolean; count: number; items: RecentItem[] }) {
    return (
        <div className="card border-0 flex flex-col overflow-hidden">
            <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <FileText className="h-7 w-7 text-accent" />
                    <Link href="/admin/posts?action=create" className="p-1.5 rounded-lg bg-surface-input hover:bg-accent hover:text-white text-content-secondary transition-colors" title="New Post">
                        <Plus className="h-4 w-4" />
                    </Link>
                </div>
                <div>
                    <h3 className="text-content-primary font-semibold text-base">Blog</h3>
                    {loading ? (
                        <p className="text-sm text-content-muted mt-1">Loading...</p>
                    ) : (
                        <p className="text-sm text-content-muted mt-1">{count} posts</p>
                    )}
                </div>
            </div>
            <RecentRows items={items} loading={loading} />
            <Link href="/admin/posts" className="flex items-center justify-between px-4 py-2.5 text-xs text-content-muted hover:text-accent border-t border-ui-border transition-colors mt-auto">
                <span>View all posts</span>
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    );
}

function ReviewsPanel({ loading, reviews, items }: { loading: boolean; reviews: Review[]; items: RecentItem[] }) {
    const approved = reviews.filter(r => r.status === "approved").length;
    const bySource = {
        google: reviews.filter(r => r.source === "google").length,
        facebook: reviews.filter(r => r.source === "facebook").length,
        internal: reviews.filter(r => r.source === "internal" || !r.source).length,
    };

    return (
        <div className="card border-0 flex flex-col overflow-hidden">
            <div className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                    <Star className="h-7 w-7 text-accent" />
                </div>
                <div>
                    <h3 className="text-content-primary font-semibold text-base">Reviews</h3>
                    {loading ? (
                        <p className="text-sm text-content-muted mt-1">Loading...</p>
                    ) : (
                        <div className="flex items-center gap-2 flex-wrap mt-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-white">
                                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                                {approved} approved
                            </span>
                            <span className="flex items-center gap-1 text-xs text-content-muted bg-surface-input px-2 py-0.5 rounded-full">
                                <GoogleIcon className="h-3 w-3" />{bySource.google}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-content-muted bg-surface-input px-2 py-0.5 rounded-full">
                                <Facebook className="h-3 w-3 text-[#1877F2]" />{bySource.facebook}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-content-muted bg-surface-input px-2 py-0.5 rounded-full">
                                <Heart className="h-3 w-3 text-red-400" />{bySource.internal}
                            </span>
                        </div>
                    )}
                </div>
            </div>
            <RecentRows items={items} loading={loading} />
            <Link href="/admin/reviews" className="flex items-center justify-between px-4 py-2.5 text-xs text-content-muted hover:text-accent border-t border-ui-border transition-colors mt-auto">
                <span>View all reviews</span>
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    );
}

export default function AdminDashboardPage() {
    const supabase = createClient();
    const [homes, setHomes] = useState<HomeType[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getHomes(),
            getFacilities(),
            getPosts(),
            supabase
                .from("reviews")
                .select("id, author_name, rating, status, source, author_photo_url, created_at")
                .order("created_at", { ascending: false }),
        ]).then(([h, f, p, { data: reviewData }]) => {
            setHomes(h);
            setFacilities(f);
            setPosts(p);
            const mapped: Review[] = (reviewData || []).map((r: any) => ({
                id: r.id,
                authorName: r.author_name,
                rating: r.rating,
                content: "",
                entityId: "",
                status: r.status,
                source: r.source,
                authorPhotoUrl: r.author_photo_url,
                createdAt: r.created_at,
            }));
            setReviews(mapped);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const homeCounts = {
        published: homes.filter(h => h.status === "published").length,
        unpublished: homes.filter(h => h.status !== "published").length,
    };
    const facilityCounts = {
        published: facilities.filter(f => f.status === "published").length,
        unpublished: facilities.filter(f => f.status !== "published").length,
    };

    const statusDot = (published: boolean) => (
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${published ? "bg-emerald-500" : "bg-gray-400/50"}`} />
    );

    const sourceIcon = (source?: string) => {
        if (source === "google") return <GoogleIcon className="h-3.5 w-3.5 flex-shrink-0" />;
        if (source === "facebook") return <Facebook className="h-3.5 w-3.5 flex-shrink-0 text-[#1877F2]" />;
        return <Heart className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />;
    };

    const recentHomes: RecentItem[] = homes.slice(0, 5).map(h => ({
        id: h.id,
        title: h.title,
        imageUrl: h.images?.[0] ?? null,
        isExternalImage: false,
        badge: h.status === "published" ? "Published" : undefined,
        badgeAccent: true,
        href: `/admin/homes?edit=${h.slug}`,
        prefix: statusDot(h.status === "published"),
    }));

    const recentFacilities: RecentItem[] = facilities.slice(0, 5).map(f => ({
        id: f.id,
        title: f.title,
        imageUrl: f.images?.[0] ?? null,
        isExternalImage: false,
        badge: f.status === "published" ? "Published" : undefined,
        badgeAccent: true,
        href: `/admin/facilities?edit=${f.slug}`,
        prefix: statusDot(f.status === "published"),
    }));

    const recentPosts: RecentItem[] = posts.slice(0, 5).map(p => ({
        id: p.id,
        title: p.title,
        imageUrl: p.featuredImageUrl ?? null,
        isExternalImage: false,
        href: `/admin/posts?edit=${p.slug}`,
        prefix: statusDot(p.status === "published"),
        inlineSuffix: POST_TYPE_LABELS[p.postType] ?? p.postType,
    }));

    const recentReviews: RecentItem[] = reviews.slice(0, 5).map(r => ({
        id: r.id,
        title: r.authorName,
        imageUrl: r.authorPhotoUrl ?? null,
        isExternalImage: true,
        href: `/admin/reviews?edit=${r.id}`,
        prefix: sourceIcon(r.source),
    }));

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-content-primary">Dashboard</h1>
                <p className="text-sm text-content-secondary mt-1">
                    Welcome to the Elite Care Finders Content Management System
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <EntityPanel
                    name="Homes"
                    manageHref="/admin/homes"
                    createHref="/admin/homes?action=create&tab=information"
                    icon={Home}
                    published={homeCounts.published}
                    unpublished={homeCounts.unpublished}
                    loading={loading}
                    items={recentHomes}
                />
                <EntityPanel
                    name="Facilities"
                    manageHref="/admin/facilities"
                    createHref="/admin/facilities?action=create&tab=information"
                    icon={Building2}
                    published={facilityCounts.published}
                    unpublished={facilityCounts.unpublished}
                    loading={loading}
                    items={recentFacilities}
                />
                <BlogPanel loading={loading} count={posts.length} items={recentPosts} />
                <ReviewsPanel loading={loading} reviews={reviews} items={recentReviews} />
            </div>
        </div>
    );
}
