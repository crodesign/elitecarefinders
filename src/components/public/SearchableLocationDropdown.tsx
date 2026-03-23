'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faMagnifyingGlass, faCheck } from '@fortawesome/free-solid-svg-icons';

const HIDDEN_SLUGS = new Set(['lanai', 'molokai']);

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
    const pathname = usePathname();

    const visibleItems = items.filter(i => !HIDDEN_SLUGS.has(i.slug));

    const selectedItem = visibleItems.find(item => {
        const segment = '/hawaii/' + item.slug;
        return pathname.includes(segment);
    });

    const filtered = query.trim()
        ? visibleItems.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
        : visibleItems;

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

    const isSelected = !!selectedItem;
    const buttonLabel = selectedItem ? selectedItem.name : label;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-colors ${
                    open
                        ? 'bg-[#239ddb] text-white border-[#239ddb]'
                        : isSelected
                            ? 'bg-[#239ddb]/10 text-[#239ddb] border-[#239ddb]'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#239ddb] hover:text-[#239ddb]'
                }`}
            >
                <span>{buttonLabel}</span>
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
                            filtered.map(item => {
                                const isCurrent = selectedItem?.id === item.id;
                                return (
                                    <Link
                                        key={item.id}
                                        href={`${basePath}/${item.slug}`}
                                        onClick={() => { setOpen(false); onNavigate?.(); }}
                                        className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors group ${
                                            isCurrent ? 'bg-[#239ddb]/10' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className={`text-sm transition-colors ${isCurrent ? 'text-[#239ddb] font-semibold' : 'text-gray-700 group-hover:text-[#239ddb]'}`}>
                                            {item.name}
                                        </span>
                                        {isCurrent && (
                                            <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-[#239ddb] flex-shrink-0" />
                                        )}
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
