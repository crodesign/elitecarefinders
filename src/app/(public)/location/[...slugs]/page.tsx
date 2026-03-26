import type { Metadata } from 'next';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faBuilding, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { getHomeListings, getFacilityListings, getTaxonomyEntriesByIds, getLocationEntryByPath, findFullLocationPath, getLocationDescendantIds, getBrowseNavTypes } from '@/lib/public-db';
import { getLocationSvg } from '@/lib/location-svgs';
import { ListingHero } from '@/components/public/ListingHero';
import { ListingFilterBar } from '@/components/public/ListingFilterBar';
import { HomeListingGrid } from '@/components/public/HomeListingGrid';
import { FacilityListingGrid } from '@/components/public/FacilityListingGrid';
import { FilterPendingProvider } from '@/components/public/FilterPendingProvider';
import { FilterLoadingOverlay } from '@/components/public/FilterLoadingOverlay';

const SECTION_LIMIT = 12;

interface Props {
    params: { slugs: string[] };
    searchParams: { q?: string; view?: string; type?: string } & Record<string, string>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const entry = await getLocationEntryByPath(params.slugs);
    const locationLabel = entry
        ? [...entry.ancestors, entry.name].join(', ')
        : params.slugs.join(', ');
    return {
        title: `Homes & Communities of ${locationLabel}`,
        description: `Browse care homes and senior living communities in ${entry?.name ?? params.slugs.at(-1)} listed with Elite CareFinders.`,
    };
}

export default async function LocationPage({ params, searchParams }: Props) {
    const { slugs } = params;
    const q = searchParams.q || '';
    const typeSlug = searchParams.type || '';
    const explicitView = searchParams.view === 'list' ? 'list' : searchParams.view === 'grid' ? 'grid' : null;
    const gridClass = explicitView === 'grid' ? 'grid' : explicitView === 'list' ? 'hidden' : 'grid';
    const listClass = explicitView === 'list' ? 'grid' : explicitView === 'grid' ? 'hidden' : 'hidden';

    const entry = await getLocationEntryByPath(slugs);
    if (!entry && slugs.length === 2) {
        const fullPath = await findFullLocationPath(slugs[0], slugs[1]);
        if (fullPath) permanentRedirect(`/location/${fullPath.join('/')}`);
    }

    const locationSlug = slugs.join('/');
    const heroImageSrc = getLocationSvg(slugs);

    const [locationIds, { homeTypes, facilityTypes }] = await Promise.all([
        entry ? getLocationDescendantIds(entry.id) : Promise.resolve(undefined),
        getBrowseNavTypes(),
    ]);

    const selectedHomeType = homeTypes.find(t => t.slug === typeSlug);
    const selectedFacilityType = facilityTypes.find(t => t.slug === typeSlug);

    const [homesResult, facilitiesResult] = await Promise.all([
        selectedFacilityType ? Promise.resolve({ items: [], total: 0 }) : getHomeListings({ locationEntryIds: locationIds, q: q || undefined, typeEntryId: selectedHomeType?.id, page: 1, limit: SECTION_LIMIT }),
        selectedHomeType ? Promise.resolve({ items: [], total: 0 }) : getFacilityListings({ locationEntryIds: locationIds, q: q || undefined, typeEntryId: selectedFacilityType?.id, page: 1, limit: SECTION_LIMIT }),
    ]);

    const { items: homes, total: homesTotal } = homesResult;
    const { items: facilities, total: facilitiesTotal } = facilitiesResult;
    const grandTotal = homesTotal + facilitiesTotal;

    // Resolve type labels for homes
    const homeEntryIds = [...new Set(homes.flatMap(h => h.taxonomyEntryIds))];
    const homesTaxEntries = homeEntryIds.length > 0 ? await getTaxonomyEntriesByIds(homeEntryIds) : [];
    const homeTypeMap = new Map<string, string>();
    homes.forEach(home => {
        const te = home.taxonomyEntryIds.map(id => homesTaxEntries.find(e => e.id === id)).find(e => e?.taxonomySlug !== 'location');
        if (te) homeTypeMap.set(home.id, te.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    // Resolve type labels for facilities
    const facilityEntryIds = [...new Set(facilities.flatMap(f => f.taxonomyEntryIds))];
    const facilitiesTaxEntries = facilityEntryIds.length > 0 ? await getTaxonomyEntriesByIds(facilityEntryIds) : [];
    const facilityTypeMap = new Map<string, string>();
    facilities.forEach(facility => {
        const te = facility.taxonomyEntryIds.map(id => facilitiesTaxEntries.find(e => e.id === id)).find(e => e?.taxonomySlug !== 'location');
        if (te) facilityTypeMap.set(facility.id, te.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    const locationName = entry?.name ?? slugs.at(-1) ?? 'This Location';
    const locationParts = entry ? [...entry.ancestors, entry.name] : undefined;
    const pageTitle = `Homes & Communities of ${locationName}`;

    return (
        <FilterPendingProvider>
        <>
            <ListingHero
                title={pageTitle}
                total={grandTotal}
                heroImageSrc={heroImageSrc}
                backHref="/"
                backLabel="Home"
                typeNameParts={locationParts}
                showViewToggle
            />

            <div className="max-w-6xl mx-auto px-5 pt-8">
                <ListingFilterBar
                    basePath={`/location/${locationSlug}`}
                    showViewToggle
                />
            </div>

            <FilterLoadingOverlay>
            {grandTotal === 0 ? (
                <div className="max-w-6xl mx-auto px-5 pb-8">
                    <div className="text-center py-16 bg-gray-50 rounded-2xl">
                        <p className="text-lg font-semibold text-gray-700 mb-2">No listings in {locationName} yet</p>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">We&rsquo;re growing and adding new communities all the time. Check back soon, or speak with an advisor about your options anywhere in the US.</p>
                        <a
                            href="tel:+18084454111"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#239ddb] text-white rounded-lg text-sm font-semibold hover:bg-[#1a7fb3] transition-colors"
                        >
                            Call (808) 445-4111
                        </a>
                    </div>
                </div>
            ) : (

            <div className="max-w-6xl mx-auto px-5 py-8 space-y-12">

                {/* Senior Living Communities section */}
                {facilitiesTotal > 0 && (
                <section>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
                        <h2 className="flex items-start gap-2 text-lg font-bold text-gray-800">
                            <span className="flex items-center justify-center w-7 h-7 rounded bg-[#239ddb]">
                                <FontAwesomeIcon icon={faBuilding} className="h-3.5 w-3.5 text-white" />
                            </span>
                            Senior Living Communities
                        </h2>
                        {facilitiesTotal > SECTION_LIMIT && (
                            <Link href={`/facilities/location/${locationSlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors self-start">
                                View all {facilitiesTotal} <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            </Link>
                        )}
                    </div>
                    <FacilityListingGrid facilities={facilities} typeNameMap={facilityTypeMap} gridClass={gridClass} listClass={listClass} />
                    {facilitiesTotal > SECTION_LIMIT && (
                        <div className="mt-6 text-center">
                            <Link href={`/facilities/location/${locationSlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors">
                                View all {facilitiesTotal} communities of {locationName}
                                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </section>
                )}

                {/* Care Homes section */}
                {homesTotal > 0 && (
                <section>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
                        <h2 className="flex items-start gap-2 text-lg font-bold text-gray-800">
                            <span className="flex items-center justify-center w-7 h-7 rounded bg-[#239ddb]">
                                <FontAwesomeIcon icon={faHouse} className="h-3.5 w-3.5 text-white" />
                            </span>
                            Care Homes &amp; Adult Foster Homes
                        </h2>
                        {homesTotal > SECTION_LIMIT && (
                            <Link href={`/homes/location/${locationSlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors self-start">
                                View all {homesTotal} <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            </Link>
                        )}
                    </div>
                    <HomeListingGrid homes={homes} typeNameMap={homeTypeMap} gridClass={gridClass} listClass={listClass} />
                    {homesTotal > SECTION_LIMIT && (
                        <div className="mt-6 text-center">
                            <Link href={`/homes/location/${locationSlug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors">
                                View all {homesTotal} homes of {locationName}
                                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </section>
                )}
            </div>
            )}
            </FilterLoadingOverlay>
        </>
        </FilterPendingProvider>
    );
}
