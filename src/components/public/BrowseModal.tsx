'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPhone, faEnvelope, faHouse, faBuilding, faShareNodes, faLocationDot, faList } from '@fortawesome/free-solid-svg-icons';
import { SearchableLocationDropdown } from '@/components/public/SearchableLocationDropdown';
import { faFacebookF, faInstagram, faXTwitter, faLinkedinIn, faPinterestP, faYoutube, faTiktok, faThreads } from '@fortawesome/free-brands-svg-icons';
import { createClientComponentClient } from '@/lib/supabase';
import { getSocialAccounts, getHomepageSeo, type SocialAccount, type SocialPlatform } from '@/lib/services/siteSettingsService';
import { HeartLoader } from '@/components/ui/HeartLoader';
import { NEIGHBORHOOD_COORDS } from '@/lib/neighborhood-coords';
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/public/NeighborhoodMap'), {
    ssr: false,
    loading: () => <div className="w-full h-[280px] bg-gray-100 rounded-xl animate-pulse" />,
});

const ISLAND_CENTERS: Record<string, [number, number]> = {
    oahu: [21.4389, -158.0001],
    maui: [20.796, -156.331],
    'big-island': [19.596, -155.435],
    kauai: [22.054, -159.537],
};

const NAV_CARE_TYPES = [
    { href: '/facilities/type/independent-living',       name: 'Independent Living',                          desc: 'Active senior community with optional care services',     icon: faBuilding },
    { href: '/facilities/type/assisted-living',          name: 'Assisted Living',                             desc: 'Apartment-style community with on-site support staff',    icon: faBuilding },
    { href: '/facilities/type/memory-care',              name: 'Memory Care',                                 desc: 'Specialized support for dementia and memory conditions',  icon: faBuilding },
    { href: '/homes/type/adult-residential-care-homes',  name: 'Care Homes',                                  desc: 'Home-like setting with full-time caregivers on site',     icon: faHouse },
    { href: '/homes/type/adult-foster-homes',            name: 'Foster Homes',                                desc: 'Community Care Foster Family Homes',                      icon: faHouse },
    { href: '/facilities/type/intermediate-care-facility', name: 'Intermediate Care & Skilled Nursing Facilities', desc: 'Skilled nursing care with 24/7 medical supervision', icon: faBuilding },
];


const SOCIAL_ICON_MAP: Record<SocialPlatform, typeof faFacebookF> = {
    facebook:  faFacebookF,
    instagram: faInstagram,
    x:         faXTwitter,
    linkedin:  faLinkedinIn,
    pinterest: faPinterestP,
    youtube:   faYoutube,
    tiktok:    faTiktok,
    threads:   faThreads,
    phone:     faPhone,
    email:     faEnvelope,
    share:     faShareNodes,
};

function socialHref(platform: SocialPlatform, url: string): string {
    if (platform === 'phone') return `tel:${url.replace(/\s+/g, '')}`;
    if (platform === 'email') return `mailto:${url}`;
    return url;
}

async function handleShare(title: string, text: string) {
    const url = window.location.origin;
    if (navigator.share) {
        try { await navigator.share({ title, text, url }); } catch { /* cancelled */ }
    } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    }
}

interface TaxEntry { id: string; name: string; slug: string; }
interface NeighborhoodCount { id: string; name: string; slug: string; homes: number; facilities: number; }

async function fetchNeighborhoods(islandSlug: string): Promise<NeighborhoodCount[]> {
    const { createClientComponentClient } = await import('@/lib/supabase');
    const supabase = createClientComponentClient();
    const { data: island } = await supabase.from('taxonomy_entries').select('id').eq('slug', islandSlug).maybeSingle();
    if (!island) return [];
    const { data: children } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('parent_id', island.id).order('name');
    if (!children?.length) return [];
    const ids = children.map((c: any) => c.id);
    const [homesRes, facilitiesRes] = await Promise.all([
        (supabase.from('homes').select('taxonomy_entry_ids').eq('status', 'published') as any).overlaps('taxonomy_entry_ids', ids),
        (supabase.from('facilities').select('taxonomy_entry_ids').eq('status', 'published') as any).overlaps('taxonomy_entry_ids', ids),
    ]);
    return children
        .map((child: any) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            homes: (homesRes.data || []).filter((h: any) => (h.taxonomy_entry_ids || []).includes(child.id)).length,
            facilities: (facilitiesRes.data || []).filter((f: any) => (f.taxonomy_entry_ids || []).includes(child.id)).length,
        }))
        .filter((n: NeighborhoodCount) => n.homes + n.facilities > 0);
}

interface BrowseModalProps {
    onClose: () => void;
}

export function BrowseModal({ onClose }: BrowseModalProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [homepageTitle, setHomepageTitle] = useState('EliteCareFinders');
    const [homepageText, setHomepageText] = useState('');
    const [locationStates, setLocationStates] = useState<TaxEntry[]>([]);
    const [hawaiiIslands, setHawaiiIslands] = useState<TaxEntry[]>([]);
    const [selectedIsland, setSelectedIsland] = useState<TaxEntry | null>(null);
    const [neighborhoods, setNeighborhoods] = useState<NeighborhoodCount[]>([]);
    const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [viewPhase, setViewPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
    const pendingAction = useRef<(() => void | Promise<void>) | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);

    function navigate(url: string) {
        setIsNavigating(true);
        router.push(url);
    }

    function handleSearchSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        const path = selectedIsland ? `/location/hawaii/${selectedIsland.slug}` : `/location/hawaii`;
        navigate(`${path}?q=${encodeURIComponent(q)}`);
    }
    const handleCloseRef = useRef<() => void>(() => {});

    handleCloseRef.current = () => {
        if (isClosing) return;
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    function handleClose() { handleCloseRef.current(); }

    function transitionTo(action: () => void | Promise<void>) {
        pendingAction.current = action;
        setViewPhase('exit');
    }

    useEffect(() => {
        if (viewPhase === 'exit') {
            const t = setTimeout(() => {
                pendingAction.current?.();
                pendingAction.current = null;
                setViewPhase('enter');
            }, 180);
            return () => clearTimeout(t);
        }
        if (viewPhase === 'enter') {
            const t = setTimeout(() => setViewPhase('idle'), 220);
            return () => clearTimeout(t);
        }
    }, [viewPhase]);

    useEffect(() => {
        setSelectedIsland(null);
        setNeighborhoods([]);
        setShowMap(false);
    }, [pathname]);

    async function handleIslandSelect(item: { id: string; name: string; slug: string }) {
        transitionTo(async () => {
            setSelectedIsland(item);
            setShowMap(false);
            setLoadingNeighborhoods(true);
            const ns = await fetchNeighborhoods(item.slug);
            setNeighborhoods(ns);
            setLoadingNeighborhoods(false);
        });
    }

    function clearIsland() {
        transitionTo(() => {
            setSelectedIsland(null);
            setNeighborhoods([]);
            setShowMap(false);
        });
    }

    function toggleMap() {
        transitionTo(() => setShowMap(v => !v));
    }

    useEffect(() => {
        getSocialAccounts().then(accounts => setSocialAccounts(accounts.filter(a => a.locations ? a.locations.popup !== false : !a.hidden)));
        getHomepageSeo().then(seo => {
            if (seo.metaTitle) setHomepageTitle(seo.metaTitle);
            if (seo.metaDescription) setHomepageText(seo.metaDescription);
        });

        (async () => {
            const supabase = createClientComponentClient();
            const { data: tax } = await supabase.from('taxonomies').select('id').eq('slug', 'location').maybeSingle();
            if (!tax) return;
            const { data: states } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('taxonomy_id', tax.id).is('parent_id', null).order('name');
            const mapped = (states || []).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug }));
            setLocationStates(mapped);
            const hawaii = mapped.find(s => s.slug === 'hawaii');
            if (hawaii) {
                const { data: islands } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('parent_id', hawaii.id);
                const HIDDEN = new Set(['lanai', 'molokai']);
                const ISLAND_ORDER = ['oahu', 'maui', 'big-island', 'kauai'];
                setHawaiiIslands((islands || []).filter((r: any) => !HIDDEN.has(r.slug)).sort((a: any, b: any) => {
                    const ai = ISLAND_ORDER.indexOf(a.slug); const bi = ISLAND_ORDER.indexOf(b.slug);
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                }).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug })));
            }
        })();
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCloseRef.current(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <>
        {isNavigating && (
            <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[300] flex items-center justify-center">
                <div style={{ '--accent': '#239ddb' } as React.CSSProperties}>
                    <HeartLoader size={16} />
                </div>
            </div>
        )}
        <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-md flex flex-col pt-14" onClick={handleClose}>
            {/* Full-width blue top bar */}
            <div className="absolute top-0 inset-x-0 h-14 bg-[#239ddb] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase text-sm">
                    <FontAwesomeIcon icon={faHouse} className="h-5 w-5" />
                    Browse our Homes &amp; Communities
                </div>
                <button
                    onClick={handleClose}
                    className="absolute right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                </button>
            </div>

            {/* Scrolling card */}
            <div className={`${isClosing ? 'modal-content-slide-out' : 'modal-content-slide-in'} flex-1 overflow-y-auto w-full pb-6`}>
                <div className="max-w-[480px] mx-5 sm:mx-auto bg-white px-6 shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                    {/* Location section */}
                    {locationStates.length > 0 && (
                        <div className="-mx-6 px-6 py-4 mb-4 bg-gray-100">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    {hawaiiIslands.length > 0 && (
                                        <SearchableLocationDropdown
                                            label="Find Care by Location"
                                            placeholder="Search islands..."
                                            items={hawaiiIslands}
                                            basePath="/location/hawaii"
                                            showSearch={false}
                                            onSelect={handleIslandSelect}
                                            selectedSlug={selectedIsland?.slug ?? null}
                                            hideBorder
                                        />
                                    )}
                                    {selectedIsland && (
                                        <button
                                            type="button"
                                            onClick={clearIsland}
                                            className="flex items-center justify-center w-6 h-6 rounded-md bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                                            aria-label="Clear selection"
                                        >
                                            <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                                {selectedIsland && (
                                    <button
                                        type="button"
                                        onClick={toggleMap}
                                        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white text-gray-700 hover:text-[#239ddb] transition-colors"
                                    >
                                        <FontAwesomeIcon icon={showMap ? faList : faLocationDot} className="h-3.5 w-3.5 flex-shrink-0" />
                                        {showMap ? 'Show List' : 'Show Map'}
                                    </button>
                                )}
                            </div>

                            {/* Keyword search (island-scoped when selected) */}
                            <form onSubmit={handleSearchSubmit} className="flex w-full min-w-0 mt-3">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setSearchFocused(true)}
                                    onBlur={() => setSearchFocused(false)}
                                    placeholder={`Search all of ${selectedIsland?.name ?? 'Hawaii'}...`}
                                    className="w-full min-w-0 border-l border-t border-b border-transparent rounded-l-lg px-3 py-2 text-sm outline-none text-gray-700 placeholder-gray-400 focus:border-[#239ddb] bg-white"
                                    style={{ borderRight: 'none' }}
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
                        </div>
                    )}

                    {/* Neighborhoods (when island selected) or care type cards */}
                    <div className={viewPhase === 'exit' ? 'view-exit' : viewPhase === 'enter' ? 'view-enter' : ''}>
                    {selectedIsland ? (
                        <div className="mb-4">
                            {loadingNeighborhoods ? (
                                <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
                            ) : neighborhoods.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-gray-500 font-semibold text-sm mb-1">No listings yet on this island</p>
                                    <p className="text-gray-400 text-xs">Check back soon — we&apos;re adding more locations.</p>
                                </div>
                            ) : showMap ? (
                                <div className="rounded-xl overflow-hidden" style={{ height: 280 }}>
                                    <DynamicMap
                                        key={selectedIsland.slug}
                                        pins={neighborhoods
                                            .filter(n => NEIGHBORHOOD_COORDS[n.slug])
                                            .map(n => ({ ...n, lat: NEIGHBORHOOD_COORDS[n.slug][0], lng: NEIGHBORHOOD_COORDS[n.slug][1] }))}
                                        islandSlug={selectedIsland.slug}
                                        center={ISLAND_CENTERS[selectedIsland.slug] ?? [21.4389, -158.0001]}
                                        onPinClick={pin => { navigate(`/location/hawaii/${selectedIsland.slug}/${pin.slug}`); }}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        {neighborhoods.map(n => {
                                            const total = n.homes + n.facilities;
                                            return (
                                                <button
                                                    key={n.slug}
                                                    onClick={() => { navigate(`/location/hawaii/${selectedIsland.slug}/${n.slug}`); }}
                                                    className="group flex items-start justify-between text-left bg-gray-100 rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                    <span className="font-semibold text-gray-800 text-sm group-hover:text-[#239ddb] transition-colors">{n.name}</span>
                                                    {total > 0 && (
                                                        <span className="ml-3 flex-none text-xs font-semibold bg-white group-hover:text-[#239ddb] text-gray-500 rounded-md px-2 py-1 transition-colors">{total}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-3 flex justify-center">
                                        <button
                                            onClick={() => { navigate(`/location/hawaii/${selectedIsland.slug}`); }}
                                            className="text-sm text-gray-400 hover:text-[#239ddb] transition-colors inline-flex items-center gap-1.5"
                                        >
                                            View all on {selectedIsland.name}
                                            <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 mb-4">
                            {NAV_CARE_TYPES.map(t => (
                                <button
                                    key={t.href}
                                    type="button"
                                    onClick={() => navigate(t.href)}
                                    className="group w-full text-left rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition-shadow flex items-start gap-3"
                                >
                                    <div className="flex-none w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-[#239ddb] transition-colors">
                                        <FontAwesomeIcon icon={t.icon} className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <div>
                                        <span className="block font-semibold text-sm leading-snug mb-0.5 text-gray-800 group-hover:text-[#239ddb] transition-colors">{t.name}</span>
                                        <span className="block text-xs text-gray-400 leading-snug">{t.desc}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    </div>

                    {/* Footer: social + contact */}
                    <div className="-mx-6 px-6 py-4 bg-gray-100 rounded-b-2xl flex gap-6">
                        {socialAccounts.length > 0 && (
                            <div className="flex flex-wrap gap-2 content-start">
                                {socialAccounts.map(account => (
                                    account.platform === 'share' ? (
                                        <button
                                            key={account.id}
                                            type="button"
                                            onClick={() => handleShare(homepageTitle, homepageText)}
                                            className="flex items-center justify-center w-8 h-8 rounded-md bg-white text-gray-400 hover:text-[#239ddb] transition-colors"
                                            aria-label="Share"
                                        >
                                            <FontAwesomeIcon icon={SOCIAL_ICON_MAP.share} className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                    <a
                                        key={account.id}
                                        href={socialHref(account.platform, account.url)}
                                        target={account.platform === 'phone' || account.platform === 'email' ? undefined : '_blank'}
                                        rel={account.platform === 'phone' || account.platform === 'email' ? undefined : 'noopener noreferrer'}
                                        className="flex items-center justify-center w-8 h-8 rounded-md bg-white text-gray-400 hover:text-[#239ddb] transition-colors"
                                        aria-label={account.platform}
                                    >
                                        <FontAwesomeIcon icon={SOCIAL_ICON_MAP[account.platform]} className="h-3.5 w-3.5" />
                                    </a>
                                    )
                                ))}
                            </div>
                        )}
                        <div className="flex flex-col gap-2 text-sm text-gray-600">
                            <a href="tel:+18084454111" className="flex items-center gap-2 hover:text-[#239ddb] transition-colors">
                                <FontAwesomeIcon icon={faPhone} className="h-3.5 w-3.5 text-[#239ddb]" />
                                (808) 445-4111
                            </a>
                            <a href="mailto:info@elitecarefinders.com" className="flex items-center gap-2 hover:text-[#239ddb] transition-colors">
                                <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 text-[#239ddb]" />
                                info@elitecarefinders.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
