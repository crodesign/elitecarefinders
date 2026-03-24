'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useFilterPending } from './FilterPendingProvider';

interface Props {
    label: string;
    paramKey: string;
    options: string[];
    basePath: string;
    icon: IconDefinition;
}

export function FieldFilterDropdown({ label, paramKey, options, basePath, icon }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { startFilterTransition } = useFilterPending();

    const activeValue = searchParams.get(paramKey) || '';

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    function navigate(value: string) {
        const p = new URLSearchParams(searchParams.toString());
        if (value) p.set(paramKey, value); else p.delete(paramKey);
        const str = p.toString();
        startFilterTransition(() => router.push(str ? `${basePath}?${str}` : basePath));
        setOpen(false);
    }

    const isSelected = !!activeValue;

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
                <span>{isSelected ? activeValue : label}</span>
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
                <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-100 w-52">
                    <div className="overflow-y-auto max-h-72 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={icon} className="h-3 w-3 text-white" />
                            </span>
                            {label}
                        </div>
                        <ul className="space-y-0.5 pl-7">
                            {options.map(opt => (
                                <li key={opt}>
                                    <button
                                        onClick={() => navigate(opt)}
                                        className={`w-full flex items-center justify-between gap-2 py-0.5 text-sm text-left transition-colors ${
                                            activeValue === opt ? 'text-[#239ddb] font-semibold' : 'text-gray-700 hover:text-[#239ddb]'
                                        }`}
                                    >
                                        <span>{opt}</span>
                                        {activeValue === opt && <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-[#239ddb] flex-shrink-0" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
