'use client';

import { useState } from 'react';
import { TourModal } from './TourModal';

interface EntityCTAButtonsProps {
    entityName: string;
    entityType: 'home' | 'facility';
}

export function EntityCTAButtons({ entityName, entityType }: EntityCTAButtonsProps) {
    const [showTour, setShowTour] = useState(false);

    const entityLabel = entityType === 'home' ? 'Home' : 'Community';

    return (
        <div>
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => setShowTour(true)}
                    className="flex flex-col items-center justify-center px-8 py-2 bg-[#239ddb] text-white rounded-lg hover:bg-[#1a7fb3] transition-colors"
                >
                    <span className="text-sm font-bold uppercase tracking-wide">Request a Tour &amp; Pricing</span>
                    <span className="text-xs font-medium">of this {entityLabel}</span>
                </button>
            </div>

            {showTour && (
                <TourModal
                    entityName={entityName}
                    entityType={entityType}
                    includeRates={true}
                    onClose={() => setShowTour(false)}
                />
            )}
        </div>
    );
}
