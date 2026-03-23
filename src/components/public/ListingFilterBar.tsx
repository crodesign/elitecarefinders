'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SearchableLocationDropdown } from '@/components/public/SearchableLocationDropdown';
import type { IslandWithNeighborhoods } from '@/lib/public-db';

interface Props {
    islands: IslandWithNeighborhoods[];
    basePath: string;
    mapSlot?: React.ReactNode;
}

export function ListingFilterBar({ islands, basePath, mapSlot }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const currentView = searchParams.get('view') || '';

    function buildUrl(q: string) {
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (currentView) p.set('view', currentView);
        const str = p.toString();
        return str ? `${basePath}?${str}` : basePath;
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        startTransition(() => router.push(buildUrl(query.trim())));
    }

    function handleClear() {
        setQuery('');
        startTransition(() => router.push(buildUrl('')));
    }

    const activeQuery = searchParams.get('q') || '';

    const filterContent = (
        <div>
            <div className="flex flex-wrap gap-3 items-center">
                <form onSubmit={handleSearch} className="flex">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by keyword..."
                        className="w-44 sm:w-56 border-l border-t border-b border-gray-300 rounded-l-lg px-3 py-2 text-sm outline-none text-gray-700 placeholder-gray-400 focus:border-[#239ddb] bg-white"
                        style={{ borderRight: 'none' }}
                    />
                    <button
                        type="submit"
                        className="flex items-center gap-1.5 bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-r-lg whitespace-nowrap hover:bg-[#1b8ac4] transition-colors"
                    >
                        Search <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                    </button>
                </form>

                <SearchableLocationDropdown
                    label="Hawaii Islands"
                    placeholder="Search islands..."
                    items={islands.filter(i => i.slug !== 'lanai' && i.slug !== 'molokai')}
                    basePath="/location/hawaii"
                />
            </div>

            {activeQuery && (
                <div className="flex items-center gap-2 mt-3">
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
    );

    return (
        <div className="bg-gray-100 rounded-2xl mb-8">
            {mapSlot ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start px-6 py-5">
                    {filterContent}
                    <div className="h-[360px]">{mapSlot}</div>
                </div>
            ) : (
                <div className="px-6 py-5">{filterContent}</div>
            )}
        </div>
    );
}
