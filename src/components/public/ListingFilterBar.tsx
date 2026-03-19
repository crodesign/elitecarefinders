'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SearchableLocationDropdown } from '@/components/public/SearchableLocationDropdown';
import type { IslandWithNeighborhoods } from '@/lib/public-db';

interface Props {
    islands: IslandWithNeighborhoods[];
    basePath: string;
}

export function ListingFilterBar({ islands, basePath }: Props) {
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

    const hasFilters = !!searchParams.get('q');

    return (
        <div className="bg-gray-100 rounded-2xl mb-8">
            <div className="flex flex-wrap gap-3 px-6 py-5 items-center">
                <form onSubmit={handleSearch} className="flex">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search by name..."
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
                    items={islands}
                    basePath="/location/hawaii"
                />

                {hasFilters && (
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
