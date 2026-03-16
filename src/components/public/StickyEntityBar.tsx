'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import { TourModal } from './TourModal';

interface StickyEntityBarProps {
    title: string;
    entityName: string;
    entityType: 'home' | 'facility';
    subtitle?: string;
}

export function StickyEntityBar({ title, entityName, entityType, subtitle }: StickyEntityBarProps) {
    const [visible, setVisible] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [mounted, setMounted] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            ([entry]) => setVisible(!entry.isIntersecting),
            { threshold: 0 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const headerEl = mounted ? document.querySelector('#header-inner') : null;

    const bar = (
        <div className={`overflow-hidden transition-all duration-300 ease-out ${visible ? 'max-h-[110px]' : 'max-h-0'}`}>
            <div className="flex items-center justify-between gap-4 pb-[10px]">
                <div className="flex flex-col flex-1 min-w-0 pl-[15px]">
                    <p className="text-[20px] font-bold text-gray-900 truncate leading-tight">{title}</p>
                    {subtitle && <p className="hidden md:block text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Desktop: combined Tour & Pricing button */}
                    <button
                        onClick={() => setShowTour(true)}
                        className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#239ddb] text-white rounded-lg hover:bg-[#1a7fb3] transition-colors leading-tight"
                    >
                        <span className="flex flex-col text-center">
                            <span className="text-sm font-semibold">Request a Tour &amp; Pricing</span>
                            <span className="text-[11px] font-normal opacity-90">of this {entityType === 'home' ? 'Home' : 'Community'}</span>
                        </span>
                    </button>
                    {/* Mobile: calendar icon only */}
                    <button
                        onClick={() => setShowTour(true)}
                        className="md:hidden flex items-center justify-center w-9 h-9 bg-[#239ddb] text-white rounded-lg hover:bg-[#1a7fb3] transition-colors"
                        aria-label="Request a tour"
                    >
                        <FontAwesomeIcon icon={faCalendarDays} className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div ref={sentinelRef} className="h-0 w-full" />
            {headerEl && createPortal(bar, headerEl)}
            {showTour && (
                <TourModal entityName={entityName} entityType={entityType} includeRates={true} onClose={() => setShowTour(false)} />
            )}
        </>
    );
}
