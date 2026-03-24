import dynamic from 'next/dynamic';
import { FilterPendingProvider } from '@/components/public/FilterPendingProvider';
import { FilterLoadingOverlay } from '@/components/public/FilterLoadingOverlay';
import { ListingFilterBar } from '@/components/public/ListingFilterBar';
import type { IslandWithNeighborhoods, BrowseNavEntry } from '@/lib/public-db';
import type { NeighborhoodPin } from '@/components/public/NeighborhoodMap';

const NeighborhoodMap = dynamic(
    () => import('@/components/public/NeighborhoodMap'),
    { ssr: false }
);

interface Props {
    islands: IslandWithNeighborhoods[];
    mapPins: NeighborhoodPin[];
    homeTypes: BrowseNavEntry[];
    facilityTypes: BrowseNavEntry[];
    bedroomOptions: string[];
    bathroomOptions: string[];
    showerOptions: string[];
}

const OAHU_CENTER: [number, number] = [21.4389, -158.0001];

export function SearchSection({ islands, mapPins, homeTypes, facilityTypes, bedroomOptions, bathroomOptions, showerOptions }: Props) {
    return (
        <section className="max-w-6xl mx-auto px-5 pb-6">
            <FilterPendingProvider>
                <FilterLoadingOverlay>
                <ListingFilterBar
                    islands={islands}
                    basePath="/homes"
                    homeTypes={homeTypes}
                    facilityTypes={facilityTypes}
                    bedroomOptions={bedroomOptions}
                    bathroomOptions={bathroomOptions}
                    showerOptions={showerOptions}
                    mapSlot={mapPins.length > 0 ? (
                        <NeighborhoodMap
                            pins={mapPins}
                            islandSlug="oahu"
                            center={OAHU_CENTER}
                        />
                    ) : undefined}
                />
                </FilterLoadingOverlay>
            </FilterPendingProvider>
        </section>
    );
}
