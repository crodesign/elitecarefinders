import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faBuilding, faStar, faArrowRight, faUsers } from '@fortawesome/free-solid-svg-icons';
import { getHomeListings, getFacilityListings, getTaxonomyEntriesByIds, getLocationEntryByPath, findFullLocationPath, getLocationDescendantIds } from '@/lib/public-db';
import { getLocationSvg } from '@/lib/location-svgs';
import { ListingHero } from '@/components/public/ListingHero';

const SECTION_LIMIT = 12;

interface Props {
    params: { slugs: string[] };
    searchParams: Record<string, string>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const entry = await getLocationEntryByPath(params.slugs);
    const locationLabel = entry
        ? [...entry.ancestors, entry.name].join(', ')
        : params.slugs.join(', ');
    return {
        title: `Homes & Communities in ${locationLabel}`,
        description: `Browse care homes and senior living communities in ${entry?.name ?? params.slugs.at(-1)} listed with Elite CareFinders.`,
    };
}

export default async function LocationPage({ params }: Props) {
    const { slugs } = params;

    const entry = await getLocationEntryByPath(slugs);
    if (!entry && slugs.length === 2) {
        const fullPath = await findFullLocationPath(slugs[0], slugs[1]);
        if (fullPath) permanentRedirect(`/location/${fullPath.join('/')}`);
    }

    const locationSlug = slugs.join('/');
    const heroImageSrc = getLocationSvg(slugs);

    const locationIds = entry ? await getLocationDescendantIds(entry.id) : undefined;

    const [homesResult, facilitiesResult] = await Promise.all([
        getHomeListings({ locationEntryIds: locationIds, page: 1, limit: SECTION_LIMIT }),
        getFacilityListings({ locationEntryIds: locationIds, page: 1, limit: SECTION_LIMIT }),
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
    const facilityEntryIds = [...new Set(facilities.flatMap(f => f.taxonomyIds))];
    const facilitiesTaxEntries = facilityEntryIds.length > 0 ? await getTaxonomyEntriesByIds(facilityEntryIds) : [];
    const facilityTypeMap = new Map<string, string>();
    facilities.forEach(facility => {
        const te = facility.taxonomyIds.map(id => facilitiesTaxEntries.find(e => e.id === id)).find(e => e?.taxonomySlug !== 'location');
        if (te) facilityTypeMap.set(facility.id, te.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    const locationName = entry?.name ?? slugs.at(-1) ?? 'This Location';
    const locationParts = entry ? [...entry.ancestors, entry.name] : undefined;
    const pageTitle = `Homes & Communities in ${locationName}`;

    return (
        <>
            <ListingHero
                title={pageTitle}
                total={grandTotal}
                heroImageSrc={heroImageSrc}
                backHref="/"
                backLabel="Home"
                typeNameParts={locationParts}
            />

            <div className="max-w-6xl mx-auto px-5 py-8 space-y-12">

                {/* Care Homes section */}
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            <span className="flex items-center justify-center w-7 h-7 rounded bg-[#239ddb]">
                                <FontAwesomeIcon icon={faHouse} className="h-3.5 w-3.5 text-white" />
                            </span>
                            Care Homes &amp; Adult Foster Homes
                            <span className="text-sm font-normal text-gray-400 ml-1">({homesTotal})</span>
                        </h2>
                        {homesTotal > SECTION_LIMIT && (
                            <Link href={`/homes/location/${locationSlug}`} className="text-sm text-[#239ddb] font-semibold hover:underline">
                                View all {homesTotal} →
                            </Link>
                        )}
                    </div>

                    {homes.length === 0 ? (
                        <p className="text-sm text-gray-400">No homes found in this location.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {homes.map(home => (
                                    <Link
                                        key={home.id}
                                        href={`/homes/${home.slug}`}
                                        className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 bg-gray-100"
                                    >
                                        <div className="relative w-full h-48 bg-gray-100 flex-shrink-0">
                                            {home.image ? (
                                                <Image
                                                    src={home.image.startsWith('/images/media/') ? home.image.replace(/(\.[^.]+)$/, '-500x500.webp') : home.image}
                                                    alt={home.title}
                                                    fill
                                                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                    <FontAwesomeIcon icon={faHouse} className="h-12 w-12" />
                                                </div>
                                            )}
                                            {home.isFeatured && (
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                                    <span className="flex items-center gap-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-b-lg shadow">
                                                        <FontAwesomeIcon icon={faStar} className="h-2.5 w-2.5" />
                                                        Featured
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1 p-4">
                                            <h3 className="text-base font-bold text-gray-900 leading-snug mb-1 group-hover:text-[#239ddb] transition-colors">
                                                {home.title}
                                            </h3>
                                            {homeTypeMap.get(home.id) && (
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb] mb-2">
                                                    {homeTypeMap.get(home.id)}
                                                </p>
                                            )}
                                            {home.description && (
                                                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1">
                                                    {home.description.replace(/<[^>]*>/g, '').trim()}
                                                </p>
                                            )}
                                            <div className="mt-3 flex items-center justify-end gap-1 text-[#239ddb] text-sm font-semibold">
                                                Learn More
                                                <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {homesTotal > SECTION_LIMIT && (
                                <div className="mt-6 text-center">
                                    <Link href={`/homes/location/${locationSlug}`} className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-[#239ddb] text-[#239ddb] rounded-lg text-sm font-semibold hover:bg-[#239ddb] hover:text-white transition-colors">
                                        View all {homesTotal} homes in {locationName}
                                        <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Senior Living Communities section */}
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            <span className="flex items-center justify-center w-7 h-7 rounded bg-[#239ddb]">
                                <FontAwesomeIcon icon={faBuilding} className="h-3.5 w-3.5 text-white" />
                            </span>
                            Senior Living Communities
                            <span className="text-sm font-normal text-gray-400 ml-1">({facilitiesTotal})</span>
                        </h2>
                        {facilitiesTotal > SECTION_LIMIT && (
                            <Link href={`/facilities/location/${locationSlug}`} className="text-sm text-[#239ddb] font-semibold hover:underline">
                                View all {facilitiesTotal} →
                            </Link>
                        )}
                    </div>

                    {facilities.length === 0 ? (
                        <p className="text-sm text-gray-400">No communities found in this location.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {facilities.map(facility => (
                                    <Link
                                        key={facility.id}
                                        href={`/facilities/${facility.slug}`}
                                        className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 bg-gray-100"
                                    >
                                        <div className="relative w-full h-48 bg-gray-100 flex-shrink-0">
                                            {facility.image ? (
                                                <Image
                                                    src={facility.image.startsWith('/images/media/') ? facility.image.replace(/(\.[^.]+)$/, '-500x500.webp') : facility.image}
                                                    alt={facility.title}
                                                    fill
                                                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                    <FontAwesomeIcon icon={faBuilding} className="h-12 w-12" />
                                                </div>
                                            )}
                                            {facility.isFeatured && (
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                                    <span className="flex items-center gap-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-b-lg shadow">
                                                        <FontAwesomeIcon icon={faStar} className="h-2.5 w-2.5" />
                                                        Featured
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1 p-4">
                                            <h3 className="text-base font-bold text-gray-900 leading-snug mb-1 group-hover:text-[#239ddb] transition-colors">
                                                {facility.title}
                                            </h3>
                                            {facilityTypeMap.get(facility.id) && (
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb] mb-2">
                                                    {facilityTypeMap.get(facility.id)}
                                                </p>
                                            )}
                                            {(facility.capacity ?? 0) > 0 && (
                                                <p className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                                                    <FontAwesomeIcon icon={faUsers} className="h-3 w-3 text-[#239ddb]" />
                                                    Capacity: {facility.capacity}
                                                </p>
                                            )}
                                            {facility.description && (
                                                <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1">
                                                    {facility.description.replace(/<[^>]*>/g, '').trim()}
                                                </p>
                                            )}
                                            <div className="mt-3 flex items-center justify-end gap-1 text-[#239ddb] text-sm font-semibold">
                                                Learn More
                                                <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {facilitiesTotal > SECTION_LIMIT && (
                                <div className="mt-6 text-center">
                                    <Link href={`/facilities/location/${locationSlug}`} className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-[#239ddb] text-[#239ddb] rounded-lg text-sm font-semibold hover:bg-[#239ddb] hover:text-white transition-colors">
                                        View all {facilitiesTotal} communities in {locationName}
                                        <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </>
    );
}
