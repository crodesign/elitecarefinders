'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faXmark, faBorderAll, faList } from '@fortawesome/free-solid-svg-icons';
import { useFilterPending } from '@/components/public/FilterPendingProvider';
import { SearchableLocationDropdown } from '@/components/public/SearchableLocationDropdown';
import type { IslandWithNeighborhoods, BrowseNavEntry } from '@/lib/public-db';

interface Props {
    islands?: IslandWithNeighborhoods[];
    basePath: string;
    mapSlot?: React.ReactNode;
    homeTypes?: BrowseNavEntry[];
    facilityTypes?: BrowseNavEntry[];
    bedroomOptions?: string[];
    bathroomOptions?: string[];
    showerOptions?: string[];
    showViewToggle?: boolean;
    collapsibleFilters?: boolean;
}

interface TaxEntry { id: string; name: string; slug: string; }
interface NeighborhoodCount { id: string; name: string; slug: string; homes: number; facilities: number; }

const HIDDEN_ISLANDS = new Set(['lanai', 'molokai']);
const ISLAND_ORDER = ['oahu', 'maui', 'big-island', 'kauai'];

async function fetchIslands(): Promise<TaxEntry[]> {
    const { createClientComponentClient } = await import('@/lib/supabase');
    const supabase = createClientComponentClient();
    const { data: tax } = await supabase.from('taxonomies').select('id').eq('slug', 'location').maybeSingle();
    if (!tax) return [];
    const { data: hawaii } = await supabase.from('taxonomy_entries').select('id').eq('taxonomy_id', tax.id).eq('slug', 'hawaii').maybeSingle();
    if (!hawaii) return [];
    const { data: islands } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('parent_id', hawaii.id);
    return (islands || [])
        .filter((r: any) => !HIDDEN_ISLANDS.has(r.slug))
        .sort((a: any, b: any) => {
            const ai = ISLAND_ORDER.indexOf(a.slug); const bi = ISLAND_ORDER.indexOf(b.slug);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
        .map((r: any) => ({ id: r.id, name: r.name, slug: r.slug }));
}

async function fetchNeighborhoods(islandSlug: string): Promise<NeighborhoodCount[]> {
    const { createClientComponentClient } = await import('@/lib/supabase');
    const supabase = createClientComponentClient();
    const { data: island } = await supabase.from('taxonomy_entries').select('id').eq('slug', islandSlug).maybeSingle();
    if (!island) return [];
    const { data: children } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('parent_id', island.id).order('name');
    if (!children?.length) return [];
    const ids = children.map((c: any) => c.id);
    const [homesRes, facilitiesRes] = await Promise.all([
        (supabase.from('homes').select('taxonomy_entry_ids').eq('status', 'published') as any).overlaps('taxonomy_entry_ids', ids),
        (supabase.from('facilities').select('taxonomy_entry_ids').eq('status', 'published') as any).overlaps('taxonomy_entry_ids', ids),
    ]);
    return children
        .map((child: any) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            homes: (homesRes.data || []).filter((h: any) => (h.taxonomy_entry_ids || []).includes(child.id)).length,
            facilities: (facilitiesRes.data || []).filter((f: any) => (f.taxonomy_entry_ids || []).includes(child.id)).length,
        }))
        .filter((n: NeighborhoodCount) => n.homes + n.facilities > 0);
}

export function ListingFilterBar({ basePath, showViewToggle }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { startFilterTransition } = useFilterPending();

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const currentView = searchParams.get('view') || '';

    const [islandList, setIslandList] = useState<TaxEntry[]>([]);
    const [selectedIsland, setSelectedIsland] = useState<TaxEntry | null>(null);
    const [neighborhoods, setNeighborhoods] = useState<NeighborhoodCount[]>([]);
    const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

    useEffect(() => {
        fetchIslands().then(setIslandList);
    }, []);

    useEffect(() => {
        setSelectedIsland(null);
        setNeighborhoods([]);
    }, [pathname]);

    async function handleIslandSelect(item: TaxEntry) {
        setSelectedIsland(item);
        setNeighborhoods([]);
        setLoadingNeighborhoods(true);
        const ns = await fetchNeighborhoods(item.slug);
        setNeighborhoods(ns);
        setLoadingNeighborhoods(false);
    }

    function clearIsland() {
        setSelectedIsland(null);
        setNeighborhoods([]);
    }

    function neighborhoodHref(neighborhoodSlug: string, islandSlug: string): string {
        if (basePath.includes('/hawaii/')) return `${basePath}/${neighborhoodSlug}`;
        const rootMatch = basePath.match(/^\/(homes|facilities|location)/);
        const root = rootMatch?.[1] ?? 'location';
        if (root === 'location') return `/location/hawaii/${islandSlug}/${neighborhoodSlug}`;
        return `/${root}/location/hawaii/${islandSlug}/${neighborhoodSlug}`;
    }

    function setView(v: 'grid' | 'list') {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', v);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    }

    function buildUrl(q: string) {
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (currentView) p.set('view', currentView);
        const str = p.toString();
        return str ? `${basePath}?${str}` : basePath;
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        startFilterTransition(() => router.push(buildUrl(query.trim())));
    }

    function handleClear() {
        setQuery('');
        startFilterTransition(() => router.push(buildUrl('')));
    }

    const activeQuery = searchParams.get('q') || '';

    const viewToggleButtons = showViewToggle ? (
        <div className="flex items-center gap-1 bg-white border-2 border-gray-200 rounded-lg p-1 flex-shrink-0">
            <button
                onClick={() => setView('grid')}
                className={`p-1.5 rounded transition-colors ${currentView === 'grid' || currentView === '' ? 'bg-[#239ddb] text-white' : 'text-gray-400 hover:text-gray-700'}`}
                aria-label="Grid view"
            >
                <FontAwesomeIcon icon={faBorderAll} className="h-3.5 w-3.5" />
            </button>
            <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded transition-colors ${currentView === 'list' ? 'bg-[#239ddb] text-white' : 'text-gray-400 hover:text-gray-700'}`}
                aria-label="List view"
            >
                <FontAwesomeIcon icon={faList} className="h-3.5 w-3.5" />
            </button>
        </div>
    ) : null;

    return (
        <div className="mb-8 flex flex-col gap-3">
                {/* Search row */}
                <div className="flex gap-3 items-center">
                    <form onSubmit={handleSearch} className="flex flex-1 min-w-0">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search by keyword..."
                            className="w-full min-w-0 border-l border-t border-b border-gray-300 rounded-l-lg px-3 py-2 text-sm outline-none text-gray-700 placeholder-gray-400 focus:border-[#239ddb] bg-white"
                            style={{ borderRight: 'none' }}
                        />
                        <button
                            type="submit"
                            aria-label="Search"
                            className="flex items-center justify-center bg-[#239ddb] text-white px-3 py-2 rounded-r-lg hover:bg-[#1b8ac4] transition-colors"
                        >
                            <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
                        </button>
                    </form>

                    {islandList.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <SearchableLocationDropdown
                                label="Find by Location"
                                items={islandList}
                                basePath="/location/hawaii"
                                showSearch={false}
                                onSelect={handleIslandSelect}
                                selectedSlug={selectedIsland?.slug ?? null}
                            />
                            {selectedIsland && (
                                <button
                                    type="button"
                                    onClick={clearIsland}
                                    className="flex items-center justify-center w-7 h-7 rounded-md bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
                                    aria-label="Clear island"
                                >
                                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    )}

                    {viewToggleButtons}
                </div>

                {/* Active search tag */}
                {activeQuery && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Showing results for:</span>
                        <span className="inline-flex items-center gap-1.5 bg-white border border-gray-300 rounded-full px-3 py-1 text-xs text-gray-700">
                            &ldquo;{activeQuery}&rdquo;
                            <button
                                onClick={handleClear}
                                className="text-gray-400 hover:text-gray-700 transition-colors"
                                aria-label="Clear search"
                            >
                                <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                            </button>
                        </span>
                    </div>
                )}

                {/* Neighborhood grid */}
                {selectedIsland && (
                    <div>
                        {loadingNeighborhoods ? (
                            <div className="py-4 text-center text-sm text-gray-400">Loading neighborhoods...</div>
                        ) : neighborhoods.length === 0 ? (
                            <div className="py-4 text-center text-sm text-gray-400">No listings yet on this island.</div>
                        ) : (
                            <div className={`grid gap-2 grid-cols-2 sm:grid-cols-3 ${selectedIsland.slug === 'oahu' ? 'md:grid-cols-6' : 'md:grid-cols-4'}`}>
                                {neighborhoods.map(n => {
                                    const total = n.homes + n.facilities;
                                    return (
                                        <button
                                            key={n.slug}
                                            onClick={() => startFilterTransition(() => router.push(neighborhoodHref(n.slug, selectedIsland.slug)))}
                                            className="group flex items-center justify-between bg-white rounded-xl px-3 py-2 hover:shadow-md transition-shadow text-left"
                                        >
                                            <span className="font-semibold text-gray-800 text-sm group-hover:text-[#239ddb] transition-colors truncate">{n.name}</span>
                                            {total > 0 && (
                                                <span className="ml-2 flex-none text-xs font-semibold bg-gray-100 group-hover:text-[#239ddb] text-gray-500 rounded-md px-2 py-0.5 transition-colors">{total}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
        </div>
    );
}
