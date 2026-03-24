'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBath, faShower } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useFilterPending } from './FilterPendingProvider';

interface SectionProps {
    label: string;
    icon: IconDefinition;
    paramKey: string;
    options: string[];
    active: string[];
    onToggle: (value: string) => void;
    twoColOnly?: boolean;
}

function Section({ label, icon, options, active, onToggle, twoColOnly }: SectionProps) {
    if (options.length === 0) return null;
    return (
        <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                    <FontAwesomeIcon icon={icon} className="h-3 w-3 text-white" />
                </span>
                {label}
            </div>
            <div className={`grid gap-1.5 ${twoColOnly ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {options.map(opt => {
                    const isActive = active.includes(opt);
                    return (
                        <button
                            key={opt}
                            onClick={() => onToggle(opt)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-center transition-colors ${
                                isActive
                                    ? 'bg-[#239ddb] text-white border-2 border-[#239ddb]'
                                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:border-[#239ddb] hover:text-[#239ddb]'
                            }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface Props {
    bedroomOptions: string[];
    bathroomOptions: string[];
    showerOptions: string[];
    basePath: string;
    columns?: boolean;
}

export function RoomFeaturesFilter({ bedroomOptions, bathroomOptions, showerOptions, basePath, columns }: Props) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { startFilterTransition } = useFilterPending();

    const activeBedroomTypes = searchParams.get('bedroom')?.split(',').filter(Boolean) ?? [];
    const activeBathroomTypes = searchParams.get('bathroom')?.split(',').filter(Boolean) ?? [];
    const activeShowerTypes = searchParams.get('shower')?.split(',').filter(Boolean) ?? [];

    if (bedroomOptions.length === 0 && bathroomOptions.length === 0 && showerOptions.length === 0) return null;

    function toggle(paramKey: string, current: string[], value: string) {
        const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        const p = new URLSearchParams(searchParams.toString());
        if (next.length > 0) p.set(paramKey, next.join(','));
        else p.delete(paramKey);
        const str = p.toString();
        startFilterTransition(() => router.push(str ? `${basePath}?${str}` : basePath));
    }

    if (columns) {
        return (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Section label="Bedroom Type" icon={faBed} paramKey="bedroom" options={bedroomOptions} active={activeBedroomTypes} onToggle={v => toggle('bedroom', activeBedroomTypes, v)} twoColOnly />
                <Section label="Bathroom Type" icon={faBath} paramKey="bathroom" options={bathroomOptions} active={activeBathroomTypes} onToggle={v => toggle('bathroom', activeBathroomTypes, v)} twoColOnly />
                <Section label="Shower Type" icon={faShower} paramKey="shower" options={showerOptions} active={activeShowerTypes} onToggle={v => toggle('shower', activeShowerTypes, v)} twoColOnly />
            </div>
        );
    }

    return (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-5">
            <Section label="Bedroom Type" icon={faBed} paramKey="bedroom" options={bedroomOptions} active={activeBedroomTypes} onToggle={v => toggle('bedroom', activeBedroomTypes, v)} />
            <Section label="Bathroom Type" icon={faBath} paramKey="bathroom" options={bathroomOptions} active={activeBathroomTypes} onToggle={v => toggle('bathroom', activeBathroomTypes, v)} />
            <Section label="Shower Type" icon={faShower} paramKey="shower" options={showerOptions} active={activeShowerTypes} onToggle={v => toggle('shower', activeShowerTypes, v)} />
        </div>
    );
}
