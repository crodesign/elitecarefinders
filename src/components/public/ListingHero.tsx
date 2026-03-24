'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBorderAll, faList } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface ListingHeroProps {
    title: string;
    total: number;
    icon?: IconDefinition;
    heroImageSrc?: string;
    backHref?: string;
    backLabel?: string;
    typeName?: string;
    typeNameParts?: string[];
    bgSvg?: string;
    showViewToggle?: boolean;
}

export function ListingHero({ title, total, icon, heroImageSrc, backHref, backLabel, typeName, typeNameParts, bgSvg = '/images/site/hibiscus-bg.svg', showViewToggle }: ListingHeroProps) {
    const [ready, setReady] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const explicitView = searchParams.get('view');
    const currentView = explicitView || (isMobile ? 'list' : 'grid');

    useEffect(() => {
        const raf = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    function setView(v: 'grid' | 'list') {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', v);
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    }

    return (
        <div className="max-w-6xl mx-auto -mt-[10px] px-[5px]">
            <div
                className={`relative bg-[#239ddb] overflow-hidden rounded-b-xl transition-all duration-500 ease-out ${
                    ready ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
                }`}
            >
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage: `url(${bgSvg})`,
                        backgroundSize: '75%',
                        backgroundPosition: 'right center',
                        backgroundRepeat: 'no-repeat',
                    }}
                />
                <div className="relative px-5 pt-10 pb-[30px] text-left sm:text-center text-white">
                    <h1 className="text-3xl sm:text-4xl font-bold leading-tight flex items-start justify-start sm:justify-center gap-3">
                        {heroImageSrc
                            ? <img src={heroImageSrc} alt="" aria-hidden="true" className="h-10 w-auto opacity-90 rounded-sm" />
                            : icon && <FontAwesomeIcon icon={icon} className="h-8 w-8 opacity-80" />
                        }
                        {title}
                    </h1>
                    {(typeName || typeNameParts?.length) && backHref && backLabel && (
                        <p className="mt-2 text-white/70 text-sm pl-[44px] sm:pl-0">
                            <Link href={backHref} className="hover:text-white transition-colors">{backLabel}</Link>
                            <span className="mx-2 opacity-40 text-base">•</span>
                            {typeNameParts
                                ? typeNameParts.map((part, i) => (
                                    <span key={i}>
                                        {i > 0 && <span className="mx-2 opacity-40 text-base">•</span>}
                                        {part}
                                    </span>
                                ))
                                : <span>{typeName}</span>
                            }
                            <span className="mx-2 opacity-40 text-base">•</span>
                            <span>{total} listings</span>
                        </p>
                    )}
                    {!(typeName || typeNameParts?.length) && (
                        <p className="mt-2 text-white/70 text-sm pl-[44px] sm:pl-0">{total} listings available</p>
                    )}

                    {showViewToggle && (
                        <div className="absolute bottom-3 right-4 hidden sm:flex items-center gap-1">
                            <button
                                onClick={() => setView('grid')}
                                className={`p-1.5 rounded transition-colors ${currentView === 'grid' ? 'bg-white/25 text-white' : 'text-white/40 hover:text-white/70'}`}
                                aria-label="Grid view"
                            >
                                <FontAwesomeIcon icon={faBorderAll} className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setView('list')}
                                className={`p-1.5 rounded transition-colors ${currentView === 'list' ? 'bg-white/25 text-white' : 'text-white/40 hover:text-white/70'}`}
                                aria-label="List view"
                            >
                                <FontAwesomeIcon icon={faList} className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
