'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

interface State {
    id: string;
    name: string;
    slug: string;
}

export function MainlandDropdown({ states }: { states: State[] }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
                <span>Mainland &amp; other states</span>
                <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="h-3 w-3 flex-shrink-0" />
            </button>

            {open && (
                <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-72">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Browse by state</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {states.map(state => (
                            <Link
                                key={state.id}
                                href={`/location/${state.slug}`}
                                onClick={() => setOpen(false)}
                                className="text-sm text-gray-700 hover:text-[#239ddb] transition-colors truncate"
                            >
                                {state.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
