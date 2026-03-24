'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faXmark, faSliders, faBorderAll, faList } from '@fortawesome/free-solid-svg-icons';
import { SearchableLocationDropdown } from '@/components/public/SearchableLocationDropdown';
import { TypeFilterDropdown } from '@/components/public/TypeFilterDropdown';
import { RoomFeaturesFilter } from '@/components/public/RoomFeaturesFilter';
import { useFilterPending } from '@/components/public/FilterPendingProvider';
import type { IslandWithNeighborhoods, BrowseNavEntry } from '@/lib/public-db';

interface Props {
    islands: IslandWithNeighborhoods[];
    basePath: string;
    mapSlot?: React.ReactNode;
    homeTypes?: BrowseNavEntry[];
    facilityTypes?: BrowseNavEntry[];
    bedroomOptions?: string[];
    bathroomOptions?: string[];
    showerOptions?: string[];
    showViewToggle?: boolean;
}

export function ListingFilterBar({ islands, basePath, mapSlot, homeTypes = [], facilityTypes = [], bedroomOptions = [], bathroomOptions = [], showerOptions = [], showViewToggle }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { startFilterTransition } = useFilterPending();

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const currentView = searchParams.get('view') || '';

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

    const hasTypes = homeTypes.length > 0 || facilityTypes.length > 0;
    const typeDropdown = hasTypes ? (
        <TypeFilterDropdown homeTypes={homeTypes} facilityTypes={facilityTypes} basePath={basePath} />
    ) : null;

    const hasRoomFeatures = bedroomOptions.length > 0 || bathroomOptions.length > 0 || showerOptions.length > 0;
    const hasActiveRoomFilters = !!(searchParams.get('bedroom') || searchParams.get('bathroom') || searchParams.get('shower'));

    const filterContent = (
        <div>
            <div className="flex flex-wrap gap-3 items-start">
                <div className="flex flex-col gap-1 w-full lg:flex-1 lg:min-w-0">
                    <form onSubmit={handleSearch} className="flex w-full">
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
                </div>

                <div className="flex items-center justify-center gap-3 w-full lg:w-auto lg:flex-none lg:justify-start">
                    <SearchableLocationDropdown
                        label="Hawaii Islands"
                        items={islands.filter(i => i.slug !== 'lanai' && i.slug !== 'molokai')}
                        basePath="/location/hawaii"
                        showSearch={false}
                    />

                    {typeDropdown}
                </div>

                {(hasRoomFeatures || showViewToggle) && (
                    <div className="flex items-center justify-center gap-2 w-full lg:hidden">
                        {hasRoomFeatures && (
                            <button
                                onClick={() => setFiltersOpen(v => !v)}
                                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border-2 transition-colors ${
                                    filtersOpen || hasActiveRoomFilters
                                        ? 'bg-[#239ddb]/10 text-[#239ddb] border-[#239ddb]'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#239ddb] hover:text-[#239ddb]'
                                }`}
                            >
                                <FontAwesomeIcon icon={faSliders} className="h-3.5 w-3.5" />
                            </button>
                        )}
                        {showViewToggle && (
                            <div className="flex items-center gap-1 bg-white border-2 border-gray-200 rounded-lg p-1">
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
                        )}
                    </div>
                )}
            </div>

            {hasRoomFeatures && (
                <div className={`grid transition-all duration-300 ease-in-out lg:grid-rows-[1fr] ${filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                        <RoomFeaturesFilter
                            bedroomOptions={bedroomOptions}
                            bathroomOptions={bathroomOptions}
                            showerOptions={showerOptions}
                            basePath={basePath}
                        />
                    </div>
                </div>
            )}

        </div>
    );

    return (
        <div className="bg-gray-100 rounded-2xl mb-8 overflow-hidden">
            {mapSlot ? (
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="order-2 lg:order-1 px-6 py-5">
                        {filterContent}
                    </div>
                    <div className="order-1 lg:order-2 aspect-square lg:aspect-auto lg:h-full overflow-hidden">
                        {mapSlot}
                    </div>
                </div>
            ) : (
                <div className="px-6 py-5">{filterContent}</div>
            )}
        </div>
    );
}
