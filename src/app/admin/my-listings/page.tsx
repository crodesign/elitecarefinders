"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Building2, Home as HomeIcon, Pencil } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import { HomeForm } from "@/components/admin/HomeForm";
import { FacilityForm } from "@/components/admin/FacilityForm";
import { getHomes, updateHome } from "@/lib/services/homeService";
import { getFacilities, updateFacility } from "@/lib/services/facilityService";
import { useNotification } from "@/contexts/NotificationContext";
import type { Home, Facility } from "@/types";

type ListingEntry = { type: 'home'; data: Home } | { type: 'facility'; data: Facility };

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

export default function MyListingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { showNotification } = useNotification();

    const [listings, setListings] = useState<ListingEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<ListingEntry | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const fetchListings = useCallback(async () => {
        setIsLoading(true);
        try {
            const profileRes = await fetch('/api/profile');
            const profile = await profileRes.json();
            const entities: { entityId: string; entityType: 'home' | 'facility' }[] = profile.entities || [];

            const homeIds = new Set(entities.filter(e => e.entityType === 'home').map(e => e.entityId));
            const facilityIds = new Set(entities.filter(e => e.entityType === 'facility').map(e => e.entityId));

            const [allHomes, allFacilities] = await Promise.all([
                homeIds.size > 0 ? getHomes() : Promise.resolve([]),
                facilityIds.size > 0 ? getFacilities() : Promise.resolve([]),
            ]);

            const merged: ListingEntry[] = [
                ...allHomes.filter(h => homeIds.has(h.id)).map(h => ({ type: 'home' as const, data: h })),
                ...allFacilities.filter(f => facilityIds.has(f.id)).map(f => ({ type: 'facility' as const, data: f })),
            ].sort((a, b) =>
                new Date(b.data.updatedAt || '').getTime() - new Date(a.data.updatedAt || '').getTime()
            );

            setListings(merged);
        } catch (err) {
            console.error('Failed to load listings', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchListings();
    }, [fetchListings]);

    // Handle ?edit=slug&type=home|facility
    useEffect(() => {
        const editSlug = searchParams.get('edit');
        const editType = searchParams.get('type') as 'home' | 'facility' | null;
        if (editSlug && editType && listings.length > 0) {
            const item = listings.find(l => l.type === editType && l.data.slug === editSlug);
            if (item) {
                setEditingItem(item);
                setIsFormOpen(true);
            } else {
                router.replace('/admin/my-listings', { scroll: false });
            }
        }
    }, [searchParams, listings, router]);

    const handleOpenEdit = (item: ListingEntry) => {
        setEditingItem(item);
        setIsFormOpen(true);
        router.push(`/admin/my-listings?edit=${item.data.slug}&type=${item.type}`, { scroll: false });
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingItem(null);
        router.push('/admin/my-listings', { scroll: false });
    };

    const handleSaveHome = async (data: Partial<Home>) => {
        if (!editingItem || editingItem.type !== 'home') return;
        try {
            const saved = await updateHome(editingItem.data.id, data);
            showNotification("Listing Updated", data.title || "Your listing has been updated");
            await fetchListings();
            setEditingItem({ type: 'home', data: saved });
            const params = new URLSearchParams(searchParams.toString());
            params.set('edit', saved.slug);
            router.replace(`/admin/my-listings?${params.toString()}`, { scroll: false });
        } catch (err) {
            throw err;
        }
    };

    const handleSaveFacility = async (data: Partial<Facility>) => {
        if (!editingItem || editingItem.type !== 'facility') return;
        try {
            const saved = await updateFacility(editingItem.data.id, data);
            showNotification("Listing Updated", data.title || "Your listing has been updated");
            await fetchListings();
            setEditingItem({ type: 'facility', data: saved });
            const params = new URLSearchParams(searchParams.toString());
            params.set('edit', saved.slug);
            router.replace(`/admin/my-listings?${params.toString()}`, { scroll: false });
        } catch (err) {
            throw err;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <HeartLoader />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-6 md:p-10 max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-content-primary">My Listings</h1>
                    <p className="text-sm text-content-secondary mt-1">Manage your assigned listings</p>
                </div>

                {listings.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-ui-border rounded-xl">
                        <HomeIcon className="h-10 w-10 text-content-muted mx-auto mb-3 opacity-40" />
                        <p className="text-content-muted text-sm">No listings assigned to your account.</p>
                        <p className="text-content-muted text-xs mt-1">Contact your manager to get access.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {listings.map((item) => {
                            const isHome = item.type === 'home';
                            const imgUrl = item.data.images?.[0];
                            return (
                                <div
                                    key={item.data.id}
                                    className="flex items-center gap-4 bg-surface-card rounded-xl p-4 border border-ui-border hover:border-accent/40 transition-colors"
                                >
                                    {/* Thumbnail */}
                                    <div className="shrink-0 h-14 w-14 rounded-lg overflow-hidden border border-ui-border bg-surface-input">
                                        {imgUrl ? (
                                            <img
                                                src={imgUrl.includes('/media/') ? imgUrl.replace(/(\.[^.]+)$/, '-100x100.webp') : imgUrl}
                                                alt={item.data.title}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center">
                                                {isHome
                                                    ? <HomeIcon className="h-5 w-5 text-content-muted" />
                                                    : <Building2 className="h-5 w-5 text-content-muted" />}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.data.status === 'published' ? 'bg-emerald-500' : 'bg-gray-400/50'}`} />
                                            <p className="font-semibold text-content-primary truncate">{item.data.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2.5 mt-1">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${isHome ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {isHome ? <HomeIcon className="h-2.5 w-2.5" /> : <Building2 className="h-2.5 w-2.5" />}
                                                {isHome ? 'Care Home' : 'Facility'}
                                            </span>
                                            <span className="text-xs text-content-muted">{timeAgo(item.data.updatedAt)}</span>
                                        </div>
                                    </div>

                                    {/* Edit */}
                                    <button
                                        onClick={() => handleOpenEdit(item)}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {editingItem?.type === 'home' && (
                <HomeForm
                    isOpen={isFormOpen}
                    onClose={handleCloseForm}
                    onSave={handleSaveHome}
                    home={editingItem.data}
                />
            )}
            {editingItem?.type === 'facility' && (
                <FacilityForm
                    isOpen={isFormOpen}
                    onClose={handleCloseForm}
                    onSave={handleSaveFacility}
                    facility={editingItem.data}
                />
            )}
        </div>
    );
}
