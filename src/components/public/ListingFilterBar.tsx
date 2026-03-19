'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faXmark, faChevronDown, faChevronUp, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import type { IslandWithNeighborhoods } from '@/lib/public-db';

interface Props {
    islands: IslandWithNeighborhoods[];
    basePath: string;
}

export function ListingFilterBar({ islands, basePath }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [, startTransition] = useTransition();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownQuery, setDropdownQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useState(searchParams.get('q') || '');
    const currentNeighborhood = searchParams.get('neighborhood') || '';
    const currentView = searchParams.get('view') || '';

    const allNeighborhoods = islands.flatMap(i => i.neighborhoods);
    const selectedNeighborhood = allNeighborhoods.find(n => n.id === currentNeighborhood);

    const filteredIslands = dropdownQuery.trim()
        ? islands.map(i => ({
            ...i,
            neighborhoods: i.neighborhoods.filter(n => n.name.toLowerCase().includes(dropdownQuery.toLowerCase())),
        })).filter(i => i.neighborhoods.length > 0)
        : islands;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (dropdownOpen) setDropdownQuery('');
    }, [dropdownOpen]);

    function buildUrl(q: string, neighborhood: string) {
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (neighborhood) p.set('neighborhood', neighborhood);
        if (currentView) p.set('view', currentView);
        const str = p.toString();
        return str ? `${basePath}?${str}` : basePath;
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        startTransition(() => router.push(buildUrl(query.trim(), currentNeighborhood)));
    }

    function handleNeighborhoodSelect(id: string) {
        setDropdownOpen(false);
        startTransition(() => router.push(buildUrl(query.trim(), id)));
    }

    function handleClear() {
        setQuery('');
        startTransition(() => router.push(buildUrl('', '')));
    }

    const hasFilters = !!(searchParams.get('q') || currentNeighborhood);

    return (
        <div className="bg-gray-100 rounded-2xl overflow-hidden mb-8">
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

                <div ref={dropdownRef} className="relative">
                    <button
                        onClick={() => setDropdownOpen(v => !v)}
                        className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-colors ${
                            dropdownOpen
                                ? 'bg-[#239ddb] text-white border-[#239ddb]'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-[#239ddb] hover:text-[#239ddb]'
                        }`}
                    >
                        <span>{selectedNeighborhood ? selectedNeighborhood.name : 'All Neighborhoods'}</span>
                        <FontAwesomeIcon icon={dropdownOpen ? faChevronUp : faChevronDown} className="h-3 w-3 flex-shrink-0" />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-100 w-72">
                            <div className="p-3 border-b border-gray-100">
                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                    <input
                                        type="text"
                                        value={dropdownQuery}
                                        onChange={e => setDropdownQuery(e.target.value)}
                                        placeholder="Search neighborhoods..."
                                        autoFocus
                                        className="flex-1 text-sm bg-white outline-none text-gray-700 placeholder-gray-400 min-w-0 px-3 py-2 rounded-lg"
                                    />
                                    <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mx-3" />
                                </div>
                            </div>
                            <div className="overflow-y-auto max-h-64 p-2">
                                <button
                                    onClick={() => handleNeighborhoodSelect('')}
                                    className="w-full text-left rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors text-sm text-gray-500 font-medium"
                                >
                                    All Neighborhoods
                                </button>
                                {filteredIslands.map(island => (
                                    <div key={island.id}>
                                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-3 pt-3 pb-1">{island.name}</p>
                                        {island.neighborhoods.map(n => (
                                            <button
                                                key={n.id}
                                                onClick={() => handleNeighborhoodSelect(n.id)}
                                                className={`w-full text-left rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors group ${currentNeighborhood === n.id ? 'bg-blue-50' : ''}`}
                                            >
                                                <span className={`text-sm transition-colors group-hover:text-[#239ddb] ${currentNeighborhood === n.id ? 'text-[#239ddb] font-medium' : 'text-gray-700'}`}>
                                                    {n.name}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ))}
                                {filteredIslands.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-4">No results</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
