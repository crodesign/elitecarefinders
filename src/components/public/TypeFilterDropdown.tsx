'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faCheck, faXmark, faHouse, faBuilding } from '@fortawesome/free-solid-svg-icons';
import type { BrowseNavEntry } from '@/lib/public-db';
import { useFilterPending } from './FilterPendingProvider';

interface Props {
    homeTypes: BrowseNavEntry[];
    facilityTypes: BrowseNavEntry[];
    basePath: string;
}

export function TypeFilterDropdown({ homeTypes, facilityTypes, basePath }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { startFilterTransition } = useFilterPending();

    const activeType = searchParams.get('type') || '';
    const allTypes = [...homeTypes, ...facilityTypes];
    const selected = allTypes.find(t => t.slug === activeType);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    function navigate(typeSlug: string) {
        const p = new URLSearchParams(searchParams.toString());
        if (typeSlug) p.set('type', typeSlug); else p.delete('type');
        const str = p.toString();
        startFilterTransition(() => router.push(str ? `${basePath}?${str}` : basePath));
        setOpen(false);
    }

    const isSelected = !!selected;

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
                <span>{isSelected ? selected!.name : 'All Types'}</span>
                {isSelected ? (
                    <span
                        role="button"
                        onClick={e => { e.stopPropagation(); navigate(''); }}
                        className="rounded-full"
                    >
                        <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                    </span>
                ) : (
                    <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="h-3 w-3 flex-shrink-0" />
                )}
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-100 w-[412px]">
                    <div className="overflow-y-auto max-h-80 p-4">

                        {homeTypes.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                        <FontAwesomeIcon icon={faHouse} className="h-3 w-3 text-white" />
                                    </span>
                                    Care Homes
                                </div>
                                <ul className="space-y-0.5 pl-7">
                                    {homeTypes.map(item => (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => navigate(item.slug)}
                                                className={`w-full flex items-center justify-between gap-2 py-0.5 text-sm text-left transition-colors ${
                                                    activeType === item.slug ? 'text-[#239ddb] font-semibold' : 'text-gray-700 hover:text-[#239ddb]'
                                                }`}
                                            >
                                                <span>{item.name}</span>
                                                {activeType === item.slug && <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-[#239ddb] flex-shrink-0" />}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {facilityTypes.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                        <FontAwesomeIcon icon={faBuilding} className="h-3 w-3 text-white" />
                                    </span>
                                    Senior Living
                                </div>
                                <ul className="space-y-0.5 pl-7">
                                    {facilityTypes.map(item => (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => navigate(item.slug)}
                                                className={`w-full flex items-center justify-between gap-2 py-0.5 text-sm text-left transition-colors ${
                                                    activeType === item.slug ? 'text-[#239ddb] font-semibold' : 'text-gray-700 hover:text-[#239ddb]'
                                                }`}
                                            >
                                                <span>{item.name}</span>
                                                {activeType === item.slug && <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-[#239ddb] flex-shrink-0" />}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
