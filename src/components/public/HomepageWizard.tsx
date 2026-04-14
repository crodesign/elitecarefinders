'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { NeighborhoodPin } from '@/components/public/NeighborhoodMap';
import { HeartLoader } from '@/components/ui/HeartLoader';

const DynamicMap = dynamic(() => import('@/components/public/NeighborhoodMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full min-h-[360px] bg-gray-100 rounded-xl animate-pulse" />,
});

const ISLAND_CENTERS: Record<string, [number, number]> = {
    oahu: [21.4389, -158.0001],
    maui: [20.796, -156.331],
    'big-island': [19.596, -155.435],
    kauai: [22.054, -159.537],
};

interface Neighborhood { id: string; name: string; slug: string; }
interface Island { id: string; name: string; slug: string; neighborhoods: Neighborhood[]; }
interface CareType { id: string; name: string; slug: string; }
interface NeighborhoodCount { id: string; name: string; slug: string; homes: number; facilities: number; }

interface Props {
    islands: Island[];
    islandCounts: Record<string, NeighborhoodCount[]>;
    mapPins: NeighborhoodPin[];
    homeTypes: CareType[];
    facilityTypes: CareType[];
    bedroomOptions: string[];
    bathroomOptions: string[];
    showerOptions: string[];
}

export function HomepageWizard({ islands, islandCounts, mapPins }: Props) {
    const router = useRouter();
    const [selectedIsland, setSelectedIsland] = useState('oahu');
    const [hoveredNeighborhood, setHoveredNeighborhood] = useState<string | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

    const countMap = useMemo(
        () => new Map((islandCounts[selectedIsland] ?? []).map(c => [c.slug, c.homes + c.facilities])),
        [islandCounts, selectedIsland]
    );

    const currentIsland = islands.find(i => i.slug === selectedIsland);

    const neighborhoods = useMemo(() => {
        const ns = currentIsland?.neighborhoods ?? [];
        if (islandCounts[selectedIsland]) {
            return ns.filter(n => (countMap.get(n.slug) ?? 0) > 0);
        }
        return ns;
    }, [currentIsland, selectedIsland, islandCounts, countMap]);

    function navigate(url: string) {
        setIsNavigating(true);
        router.push(url);
    }

    function handleIslandChange(slug: string) {
        setSelectedIsland(slug);
        setHoveredNeighborhood(null);
    }

    function handleSearchSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        navigate(`/location/hawaii/${selectedIsland}?q=${encodeURIComponent(q)}`);
    }

    return (
        <section className="max-w-6xl mx-auto px-5 py-8">
            <div className="bg-gray-100 rounded-2xl p-5">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-2">
                    Where would you like to find care?
                </h2>
                <p className="text-center text-gray-400 text-sm mb-6">
                    Choose a neighborhood to see what&apos;s available nearby
                </p>

                {/* Island tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {islands.map(island => (
                        <button
                            key={island.slug}
                            onClick={() => handleIslandChange(island.slug)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                                selectedIsland === island.slug
                                    ? 'bg-[#239ddb] text-white shadow-sm'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/images/states/${island.slug}.svg`} alt="" className="w-5 h-5 flex-none rounded" />
                            {island.name}
                        </button>
                    ))}
                </div>

                {/* Side-by-side: neighborhoods left, map right */}
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Neighborhoods */}
                    <div className="flex-1 min-w-0 flex flex-col">
                        {/* Keyword search (island-scoped) */}
                        <form onSubmit={handleSearchSubmit} className="flex w-full min-w-0 mb-3">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                placeholder={`Search all of ${currentIsland?.name ?? 'the island'}...`}
                                className="overlay-input public-search w-full min-w-0 rounded-l-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400"
                            />
                            <button
                                type="submit"
                                aria-label="Search"
                                className={`flex items-center justify-center px-2 py-[3px] rounded-r-lg border border-l-0 ${searchFocused ? 'bg-[#239ddb] border-[#239ddb] text-white hover:bg-[#1b8ac4]' : 'bg-gray-300 border-transparent text-gray-500'}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-2.svg" alt="" className="h-8 w-8" />
                            </button>
                        </form>
                        {neighborhoods.length === 0 && (
                            <div className="flex-1 flex items-center justify-center py-12 text-center">
                                <div>
                                    <p className="text-gray-500 font-semibold text-sm mb-1">No listings yet on this island</p>
                                    <p className="text-gray-400 text-xs">Check back soon — we&apos;re adding more locations.</p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                            {neighborhoods.map(n => (
                                <button
                                    key={n.slug}
                                    onClick={() => navigate(`/location/hawaii/${selectedIsland}/${n.slug}`)}
                                    onMouseEnter={() => setHoveredNeighborhood(n.slug)}
                                    onMouseLeave={() => setHoveredNeighborhood(null)}
                                    className="group flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <span className="font-semibold text-gray-800 text-sm group-hover:text-[#239ddb] transition-colors">
                                        {n.name}
                                    </span>
                                    <FontAwesomeIcon
                                        icon={faChevronRight}
                                        className="ml-3 flex-none h-3 w-3 text-[#239ddb] opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                </button>
                            ))}
                        </div>
                        {neighborhoods.length > 0 && (
                            <div className="mt-auto">
                                <button
                                    onClick={() => navigate(`/location/hawaii/${selectedIsland}`)}
                                    className="text-sm text-gray-400 hover:text-[#239ddb] transition-colors inline-flex items-center gap-1.5"
                                >
                                    Browse all on {currentIsland?.name ?? 'island'}
                                    <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Map */}
                    <div className="md:w-1/2 flex-none rounded-xl overflow-hidden" style={{ height: 396 }}>
                        <DynamicMap
                            key={selectedIsland}
                            pins={mapPins}
                            islandSlug={selectedIsland}
                            center={ISLAND_CENTERS[selectedIsland]}
                            onPinClick={pin => navigate(`/location/hawaii/${selectedIsland}/${pin.slug}`)}
                            highlightedSlug={hoveredNeighborhood}
                        />
                    </div>
                </div>
            </div>
            {isNavigating && (
                <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div style={{ '--accent': '#239ddb' } as React.CSSProperties}>
                        <HeartLoader size={16} />
                    </div>
                </div>
            )}
        </section>
    );
}
