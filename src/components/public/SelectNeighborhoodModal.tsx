'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faLocationDot, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';

interface Neighborhood { id: string; name: string; slug: string; }
interface Island { id: string; name: string; slug: string; neighborhoods: Neighborhood[]; }

interface Props {
    islands: Island[];
    onClose: () => void;
    onNavigate?: () => void;
}

const HIDDEN_SLUGS = new Set(['lanai', 'molokai']);

function sortedIslands(islands: Island[]): Island[] {
    const visible = islands.filter(i => !HIDDEN_SLUGS.has(i.slug));
    const oahu = visible.find(i => i.slug === 'oahu');
    const rest = visible.filter(i => i.slug !== 'oahu').sort((a, b) => a.name.localeCompare(b.name));
    return oahu ? [oahu, ...rest] : visible;
}

export function SelectNeighborhoodModal({ islands, onClose, onNavigate }: Props) {
    const ordered = sortedIslands(islands);

    const [expanded, setExpanded] = useState<string | null>(ordered[0]?.id ?? null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    function toggle(id: string) {
        setExpanded(prev => prev === id ? null : id);
    }

    return (
        <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-md flex flex-col pt-14" onClick={onClose}>
            {/* Blue header bar */}
            <div className="absolute top-0 inset-x-0 h-14 bg-[#239ddb] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase text-sm">
                    <FontAwesomeIcon icon={faLocationDot} className="h-5 w-5" />
                    Select Neighborhood
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                </button>
            </div>

            {/* Scrollable card */}
            <div className="modal-content-slide-in flex-1 overflow-y-auto w-full pb-6">
                <div className="max-w-[520px] mx-5 sm:mx-auto bg-white shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl" onClick={e => e.stopPropagation()}>
                    <p className="text-sm text-gray-500 text-center px-6 pt-4 pb-3 border-b-2 border-gray-100">
                        Browse Care Homes and Adult Foster Homes in these neighborhoods
                    </p>
                    <div className="p-4 space-y-2">
                        {ordered.map(island => {
                            const isOpen = expanded === island.id;
                            return (
                                <div key={island.id} className={`rounded-lg overflow-hidden border-2 border-gray-100 ${isOpen ? 'border-2 border-gray-100' : ''}`}>
                                    <button
                                        onClick={() => toggle(island.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isOpen ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Image
                                                src={`/images/states/${island.slug}.svg`}
                                                alt={island.name}
                                                width={32}
                                                height={32}
                                                className="flex-shrink-0"
                                            />
                                            <span className="text-sm font-semibold text-gray-800">{island.name}</span>
                                        </div>
                                        <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} className="h-3.5 w-3.5 text-gray-400" />
                                    </button>
                                    {isOpen && (
                                        island.neighborhoods.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-x-4 px-4 py-3 border-t-2 border-gray-100">
                                                {island.neighborhoods.map(n => (
                                                    <Link
                                                        key={n.id}
                                                        href={`/location/hawaii/${island.slug}/${n.slug}`}
                                                        onClick={() => { onClose(); onNavigate?.(); }}
                                                        className="text-sm text-gray-700 hover:text-[#239ddb] py-1 transition-colors"
                                                    >
                                                        {n.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 px-4 py-3 border-t-2 border-gray-100">No neighborhoods listed</p>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
