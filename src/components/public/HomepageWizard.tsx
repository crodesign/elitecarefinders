'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
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
    const [showMap, setShowMap] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

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
        setShowMap(false);
    }

    return (
        <section className="max-w-6xl mx-auto px-5 py-8">
            <div className="bg-gray-100 rounded-2xl p-5">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-2">
                    Where would you like to find care?
                </h2>
                <p className="text-center text-gray-400 text-sm mb-8">
                    Choose a neighborhood to see what&apos;s available nearby
                </p>

                {/* Island tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-3">
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

                {/* Map toggle */}
                <div className="flex justify-center mb-6">
                    {selectedIsland === 'oahu' && (
                        <button
                            onClick={() => setShowMap(v => !v)}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all border-2 ${
                                showMap
                                    ? 'border-[#239ddb] text-[#239ddb] bg-blue-50'
                                    : 'border-gray-200 bg-white text-gray-500 shadow-sm hover:border-[#239ddb] hover:text-[#239ddb]'
                            }`}
                        >
                            {showMap ? 'Grid view' : 'Map view'}
                        </button>
                    )}
                </div>

                {/* Map or Neighborhood grid */}
                {showMap && selectedIsland === 'oahu' ? (
                    <div className="rounded-xl overflow-hidden mb-6" style={{ height: 380 }}>
                        <DynamicMap
                            pins={mapPins}
                            islandSlug={selectedIsland}
                            center={ISLAND_CENTERS[selectedIsland]}
                            onPinClick={pin => navigate(`/location/hawaii/${selectedIsland}/${pin.slug}`)}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                        {neighborhoods.map(n => {
                            const count = countMap.size > 0 ? (countMap.get(n.slug) ?? 0) : null;
                            return (
                                <button
                                    key={n.slug}
                                    onClick={() => navigate(`/location/hawaii/${selectedIsland}/${n.slug}`)}
                                    className="group flex items-center justify-between bg-white rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <span className="font-semibold text-gray-800 text-sm group-hover:text-[#239ddb] transition-colors">
                                        {n.name}
                                    </span>
                                    {count !== null && count > 0 && (
                                        <span className="ml-3 flex-none text-xs font-semibold bg-gray-100 group-hover:bg-blue-50 group-hover:text-[#239ddb] text-gray-500 rounded-md px-2 py-1 transition-colors">
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="text-center">
                    <button
                        onClick={() => navigate(`/location/hawaii/${selectedIsland}`)}
                        className="text-sm text-gray-400 hover:text-[#239ddb] transition-colors inline-flex items-center gap-1.5"
                    >
                        Browse all on {currentIsland?.name ?? 'island'}
                        <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                    </button>
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
