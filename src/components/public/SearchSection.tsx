'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { SelectNeighborhoodModal } from './SelectNeighborhoodModal';

interface Neighborhood { id: string; name: string; slug: string; }
interface Island { id: string; name: string; slug: string; neighborhoods: Neighborhood[]; }

interface Props {
    islands: Island[];
}

export function SearchSection({ islands }: Props) {
    const [modalOpen, setModalOpen] = useState(false);
    const [query, setQuery] = useState('');
    const router = useRouter();

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (query.trim()) router.push(`/homes?q=${encodeURIComponent(query.trim())}`);
    }

    return (
        <>
            <section className="max-w-6xl mx-auto px-5 pb-6">
                <div className="bg-gray-100 rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="text-center py-3 border-b border-gray-200">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-600 m-0">Start Your Search Here</p>
                    </div>

                    {/* Row 1: Select Neighborhood */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5 border-b border-gray-200">
                        <p className="text-sm font-bold text-gray-800 m-0 sm:w-[45%] flex-shrink-0">Select a town to browse the homes in that neighborhood</p>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="flex items-center gap-2 bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider px-6 py-3 rounded-lg whitespace-nowrap hover:bg-[#1b8ac4] transition-colors self-start"
                        >
                            <FontAwesomeIcon icon={faLocationDot} className="h-4 w-4" />
                            Select Neighborhood
                        </button>
                    </div>

                    {/* Row 2: Keyword search */}
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-5">
                        <p className="text-sm font-bold text-gray-800 m-0 sm:w-[45%] flex-shrink-0">Use keywords such as neighborhood and/or private or shared bathroom</p>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300 self-start w-full sm:w-auto">
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-48 sm:w-56 border-0 px-3 py-2 text-sm outline-none text-gray-700 placeholder-gray-400"
                            />
                            <button
                                type="submit"
                                className="flex items-center gap-1.5 bg-[#239ddb] text-white text-sm font-bold uppercase tracking-wider px-4 py-2 whitespace-nowrap hover:bg-[#1b8ac4] transition-colors"
                            >
                                Search <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {modalOpen && (
                <SelectNeighborhoodModal
                    islands={islands}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </>
    );
}
