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
    showSearch?: boolean;
    onSelect?: (item: LocationItem) => void; // when provided, items call this instead of navigating
    selectedSlug?: string; // externally controlled selection (used with onSelect)
}

export function SearchableLocationDropdown({ label, placeholder = 'Search...', items, basePath, onNavigate, showSearch = true, onSelect, selectedSlug }: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pathname = usePathname();

    const visibleItems = items.filter(i => !HIDDEN_SLUGS.has(i.slug));

    const selectedItem = visibleItems.find(item => {
        if (selectedSlug !== undefined) return item.slug === selectedSlug;
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
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                    open
                        ? 'bg-[#239ddb] text-white'
                        : isSelected
                            ? 'bg-[#239ddb] text-white shadow-sm'
                            : 'bg-white text-gray-700 hover:text-[#239ddb]'
                }`}
            >
                {selectedItem && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/images/states/${selectedItem.slug}.svg`} alt="" className="w-4 h-4 flex-none rounded" />
                )}
                <span>{buttonLabel}</span>
                <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="h-3 w-3 flex-shrink-0" />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-100 w-72">
                    {/* Search input */}
                    {showSearch && (
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
                    )}

                    {/* Results list */}
                    <div className="overflow-y-auto max-h-64 p-2">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">No results</p>
                        ) : (
                            filtered.map(item => {
                                const isCurrent = selectedItem?.id === item.id;
                                const rowClass = `flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors group w-full text-left ${isCurrent ? 'bg-[#239ddb]/10' : 'hover:bg-gray-50'}`;
                                const inner = (
                                    <>
                                        <span className="flex items-center gap-2 min-w-0">
                                            <img src={`/images/states/${item.slug}.svg`} alt="" aria-hidden="true" className="h-5 w-5 object-contain flex-shrink-0 opacity-70" />
                                            <span className={`text-sm transition-colors ${isCurrent ? 'text-[#239ddb] font-semibold' : 'text-gray-700 group-hover:text-[#239ddb]'}`}>
                                                {item.name}
                                            </span>
                                        </span>
                                        {isCurrent && (
                                            <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-[#239ddb] flex-shrink-0" />
                                        )}
                                    </>
                                );
                                return onSelect ? (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => { setOpen(false); onSelect(item); }}
                                        className={rowClass}
                                    >
                                        {inner}
                                    </button>
                                ) : (
                                    <Link
                                        key={item.id}
                                        href={`${basePath}/${item.slug}`}
                                        onClick={() => { setOpen(false); onNavigate?.(); }}
                                        className={rowClass}
                                    >
                                        {inner}
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
