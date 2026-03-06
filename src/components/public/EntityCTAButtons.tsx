'use client';

import { useState } from 'react';
import { RatesModal } from './RatesModal';
import { TourModal } from './TourModal';

interface EntityCTAButtonsProps {
    entityName: string;
    entityType: 'home' | 'facility';
}

export function EntityCTAButtons({ entityName, entityType }: EntityCTAButtonsProps) {
    const [showRates, setShowRates] = useState(false);
    const [showTour, setShowTour] = useState(false);

    const entityLabel = entityType === 'home' ? 'Home' : 'Facility';

    return (
        <div>
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => setShowRates(true)}
                    className="flex flex-col items-center justify-center px-6 py-2 border-2 border-[#239ddb] text-[#239ddb] rounded-lg hover:bg-[#f0f8fc] transition-colors"
                >
                    <span className="text-xs italic font-medium">Private Pay Options</span>
                    <span className="text-sm font-bold uppercase tracking-wide">Get Monthly Rates</span>
                </button>
                <button
                    onClick={() => setShowTour(true)}
                    className="flex flex-col items-center justify-center px-8 py-2 bg-[#239ddb] text-white rounded-lg hover:bg-[#1a7fb3] transition-colors"
                >
                    <span className="text-sm font-bold uppercase tracking-wide">Schedule a Tour</span>
                    <span className="text-xs font-medium">of this {entityLabel}</span>
                </button>
            </div>

            {showRates && (
                <RatesModal
                    entityName={entityName}
                    entityType={entityType}
                    onClose={() => setShowRates(false)}
                />
            )}
            {showTour && (
                <TourModal
                    entityName={entityName}
                    entityType={entityType}
                    onClose={() => setShowTour(false)}
                />
            )}
        </div>
    );
}
