'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faChevronLeft, faBed, faBath, faShower, faHouse, faBuilding } from '@fortawesome/free-solid-svg-icons';
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

const WIZARD_CARE_TYPES = [
    { slugs: ['independent-living'], name: 'Independent Living', desc: 'Active senior community with optional care services', icon: faBuilding },
    { slugs: ['assisted-living'], name: 'Assisted Living', desc: 'Apartment-style community with on-site support staff', icon: faBuilding },
    { slugs: ['memory-care'], name: 'Memory Care', desc: 'Specialized support for dementia and memory conditions', icon: faBuilding },
    { slugs: ['adult-residential-care-homes'], name: 'Care Homes', desc: 'Home-like setting with full-time caregivers on site', icon: faHouse },
    { slugs: ['adult-foster-homes'], name: 'Foster Homes', desc: 'Community Care Foster Family Homes', icon: faHouse },
    { slugs: ['intermediate-care-facility', 'skilled-nursing-facility'], name: 'Intermediate Care & Skilled Nursing Facilities', desc: 'Skilled nursing care with 24/7 medical supervision', icon: faBuilding },
];

function StepDots({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-2 justify-center mb-8">
            {[1, 2, 3].map(n => (
                <div
                    key={n}
                    className={`rounded-full transition-all duration-300 ${n === current ? 'w-7 h-3 bg-[#239ddb]' : 'w-3 h-3 bg-gray-200'}`}
                />
            ))}
        </div>
    );
}

function SelectionPill({ label }: { label: string }) {
    return (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-[#239ddb] text-sm font-medium border border-blue-100">
            {label}
        </span>
    );
}

function SelectionSummary({ items }: { items: string[] }) {
    if (items.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {items.map((item, i) => <SelectionPill key={i} label={item} />)}
        </div>
    );
}

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

export function HomepageWizard({ islands, islandCounts, mapPins, homeTypes, facilityTypes, bedroomOptions, bathroomOptions, showerOptions }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedIsland, setSelectedIsland] = useState('oahu');
    const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [bedroom, setBedroom] = useState<string[]>([]);
    const [bathroom, setBathroom] = useState<string[]>([]);
    const [shower, setShower] = useState<string[]>([]);
    const [showMap, setShowMap] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);

    const countMap = useMemo(
        () => new Map((islandCounts[selectedIsland] ?? []).map(c => [c.slug, c.homes + c.facilities])),
        [islandCounts, selectedIsland]
    );
    const facilityTypeSlugs = useMemo(() => {
        const s = new Set(facilityTypes.map(t => t.slug));
        s.add('memory-care');
        return s;
    }, [facilityTypes]);

    const currentIsland = islands.find(i => i.slug === selectedIsland);

    const neighborhoods = useMemo(() => {
        const ns = currentIsland?.neighborhoods ?? [];
        if (islandCounts[selectedIsland]) {
            return ns.filter(n => (countMap.get(n.slug) ?? 0) > 0);
        }
        return ns;
    }, [currentIsland, selectedIsland, islandCounts, countMap]);

    function toggleType(slugs: string[]) {
        const isActive = slugs.some(s => selectedTypes.includes(s));
        if (isActive) {
            setSelectedTypes(prev => prev.filter(s => !slugs.includes(s)));
        } else {
            setSelectedTypes(prev => [...prev, ...slugs.filter(s => !prev.includes(s))]);
        }
    }

    function toggleChip(arr: string[], setArr: (v: string[]) => void, val: string) {
        setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
    }

    function buildUrl(): string {
        const params = new URLSearchParams();
        if (bedroom.length) params.set('bedroom', bedroom.join(','));
        if (bathroom.length) params.set('bathroom', bathroom.join(','));
        if (shower.length) params.set('shower', shower.join(','));
        if (selectedTypes.length === 1) params.set('type', selectedTypes[0]);
        const qs = params.size > 0 ? `?${params.toString()}` : '';

        if (selectedNeighborhood) {
            return `/location/hawaii/${selectedIsland}/${selectedNeighborhood}${qs}`;
        }
        const facilityOnly = selectedTypes.length > 0 && selectedTypes.every(t => facilityTypeSlugs.has(t));
        return facilityOnly ? `/facilities${qs}` : `/homes${qs}`;
    }

    function selectNeighborhood(slug: string) {
        setSelectedNeighborhood(slug);
        setStep(2);
    }

    function handleIslandChange(slug: string) {
        setSelectedIsland(slug);
        setSelectedNeighborhood(null);
        setShowMap(false);
    }

    // ── Step 1 — Where? ────────────────────────────────────────────────────────
    if (step === 1) {
        return (
            <section className="max-w-6xl mx-auto px-5 py-8">
                <div className="bg-gray-100 rounded-2xl p-5">
                    <StepDots current={1} />
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
                                onPinClick={pin => selectNeighborhood(pin.slug)}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                            {neighborhoods.map(n => {
                                const count = countMap.size > 0 ? (countMap.get(n.slug) ?? 0) : null;
                                return (
                                    <button
                                        key={n.slug}
                                        onClick={() => selectNeighborhood(n.slug)}
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
                            onClick={() => setStep(2)}
                            className="text-sm text-gray-400 hover:text-[#239ddb] transition-colors inline-flex items-center gap-1.5"
                        >
                            Browse all on {currentIsland?.name ?? 'island'}
                            <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    // ── Step 2 — What kind of care? ────────────────────────────────────────────
    const islandName = islands.find(i => i.slug === selectedIsland)?.name ?? selectedIsland;
    const neighborhoodName = currentIsland?.neighborhoods.find(n => n.slug === selectedNeighborhood)?.name;
    const locationSummary = neighborhoodName ? `${islandName} — ${neighborhoodName}` : islandName;

    if (step === 2) {
        return (
            <section className="max-w-6xl mx-auto px-5 py-8">
                <div className="bg-gray-100 rounded-2xl p-5">
                    <StepDots current={2} />
                    <SelectionSummary items={[locationSummary]} />

                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-2">
                        What kind of care are you looking for?
                    </h2>
                    <p className="text-center text-gray-400 text-sm mb-8">Optional — you can choose more than one</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-3 sm:grid-flow-col gap-2 mb-8">
                        {WIZARD_CARE_TYPES.map(t => {
                            const active = t.slugs.some(s => selectedTypes.includes(s));
                            return (
                                <button
                                    key={t.slugs[0]}
                                    onClick={() => toggleType(t.slugs)}
                                    className={`w-full text-left rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow ${active ? 'bg-blue-50 ring-2 ring-[#239ddb]' : 'bg-white'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`flex-none w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-[#239ddb]' : 'bg-gray-100'}`}>
                                            <FontAwesomeIcon icon={t.icon} className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-500'}`} />
                                        </div>
                                        <div>
                                            <span className={`block font-semibold text-sm leading-snug mb-0.5 ${active ? 'text-[#239ddb]' : 'text-gray-800'}`}>{t.name}</span>
                                            <span className="block text-xs text-gray-400 leading-snug">{t.desc}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 border-2 border-gray-200 text-gray-600 font-semibold px-6 py-3 rounded-xl hover:border-gray-300 hover:bg-gray-100 transition-all"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
                                Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#239ddb] text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
                            >
                                Continue
                                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // ── Step 3 — Room preferences ──────────────────────────────────────────────
    const typeNames = WIZARD_CARE_TYPES
        .filter(t => t.slugs.some(s => selectedTypes.includes(s)))
        .map(t => t.name);
    const step3Summary = [locationSummary, ...typeNames];

    return (
        <section className="max-w-6xl mx-auto px-5 py-8">
            <div className="bg-gray-100 rounded-2xl p-5">
                <StepDots current={3} />
                <SelectionSummary items={step3Summary} />

                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-1">
                    Any room preferences?
                </h2>
                <p className="text-center text-gray-400 text-sm mb-10">
                    Optional — leave blank if you&apos;re not sure
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                    {bedroomOptions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <FontAwesomeIcon icon={faBed} className="h-4 w-4 text-[#239ddb]" />
                                <span className="text-sm font-semibold text-gray-700">Bed size</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {bedroomOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => toggleChip(bedroom, setBedroom, opt)}
                                        className={`py-2 rounded-xl font-medium text-sm shadow-sm hover:shadow-md transition-shadow ${
                                            bedroom.includes(opt)
                                                ? 'bg-blue-50 ring-2 ring-[#239ddb] text-[#239ddb]'
                                                : 'bg-white text-gray-600'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {bathroomOptions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <FontAwesomeIcon icon={faBath} className="h-4 w-4 text-[#239ddb]" />
                                <span className="text-sm font-semibold text-gray-700">Bathroom</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {bathroomOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => toggleChip(bathroom, setBathroom, opt)}
                                        className={`py-2 rounded-xl font-medium text-sm shadow-sm hover:shadow-md transition-shadow ${
                                            bathroom.includes(opt)
                                                ? 'bg-blue-50 ring-2 ring-[#239ddb] text-[#239ddb]'
                                                : 'bg-white text-gray-600'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {showerOptions.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <FontAwesomeIcon icon={faShower} className="h-4 w-4 text-[#239ddb]" />
                                <span className="text-sm font-semibold text-gray-700">Shower</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {showerOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => toggleChip(shower, setShower, opt)}
                                        className={`py-2 rounded-xl font-medium text-sm shadow-sm hover:shadow-md transition-shadow ${
                                            shower.includes(opt)
                                                ? 'bg-blue-50 ring-2 ring-[#239ddb] text-[#239ddb]'
                                                : 'bg-white text-gray-600'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={() => setStep(2)}
                        className="flex items-center gap-2 border-2 border-gray-200 text-gray-600 font-semibold px-6 py-3 rounded-xl hover:border-gray-300 hover:bg-gray-100 transition-all"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} className="h-3.5 w-3.5" />
                        Back
                    </button>
                    <button
                        onClick={() => { setIsNavigating(true); router.push(buildUrl()); }}
                        className="flex items-center justify-center gap-2 bg-[#239ddb] text-white font-bold px-10 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                    >
                        Find Care Homes
                        <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
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
