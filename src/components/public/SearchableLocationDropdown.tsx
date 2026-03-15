'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

interface LocationItem {
    id: string;
    name: string;
    slug: string;
    homes?: number;
    facilities?: number;
}

interface Props {
    label: string;
    placeholder?: string;
    items: LocationItem[];
    basePath: string; // e.g. '/location/hawaii' or '/location'
    onNavigate?: () => void; // called when a link is clicked (e.g. to close a parent modal)
}

export function SearchableLocationDropdown({ label, placeholder = 'Search...', items, basePath, onNavigate }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = query.trim()
        ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
        : items;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (open) {
            setQuery('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-colors ${
                    open
                        ? 'bg-[#239ddb] text-white border-[#239ddb]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#239ddb] hover:text-[#239ddb]'
                }`}
            >
                <span>{label}</span>
                <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="h-3 w-3 flex-shrink-0" />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-100 w-72">
                    {/* Search input */}
                    <div className="p-3 border-b border-gray-100">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={placeholder}
                                className="flex-1 text-sm bg-white outline-none text-gray-700 placeholder-gray-400 min-w-0 px-3 py-2 rounded-lg"
                            />
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mx-3" />
                        </div>
                    </div>

                    {/* Results list */}
                    <div className="overflow-y-auto max-h-64 p-2">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">No results</p>
                        ) : (
                            filtered.map(item => (
                                <Link
                                    key={item.id}
                                    href={`${basePath}/${item.slug}`}
                                    onClick={() => { setOpen(false); onNavigate?.(); }}
                                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors group"
                                >
                                    <span className="text-sm text-gray-700 group-hover:text-[#239ddb] transition-colors">
                                        {item.name}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
