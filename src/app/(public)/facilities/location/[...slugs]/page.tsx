import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faBuilding, faStar, faArrowRight, faUsers } from '@fortawesome/free-solid-svg-icons';
import { permanentRedirect } from 'next/navigation';
import { getFacilityListings, getTaxonomyEntriesByIds, getLocationEntryByPath, findFullLocationPath, getLocationDescendantIds } from '@/lib/public-db';
import { getLocationSvg } from '@/lib/location-svgs';
import { ListingHero } from '@/components/public/ListingHero';

const LIMIT = 24;

interface Props {
    params: { slugs: string[] };
    searchParams: { page?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const entry = await getLocationEntryByPath(params.slugs);
    const locationLabel = entry
        ? [entry.name, ...entry.ancestors.slice().reverse()].join(', ')
        : params.slugs.join(', ');
    return {
        title: `${locationLabel} | Senior Living Communities`,
        description: `Browse senior living communities in ${entry?.name ?? params.slugs.at(-1)} listed with Elite CareFinders.`,
    };
}

export default async function FacilitiesByLocationPage({ params, searchParams }: Props) {
    const { slugs } = params;
    const page = Math.max(1, parseInt(searchParams.page || '1', 10));

    const entry = await getLocationEntryByPath(slugs);
    if (!entry && slugs.length === 2) {
        const fullPath = await findFullLocationPath(slugs[0], slugs[1]);
        if (fullPath) permanentRedirect(`/facilities/location/${fullPath.join('/')}`);
    }
    const locationIds = entry ? await getLocationDescendantIds(entry.id) : undefined;
    const { items: facilities, total } = await getFacilityListings({ locationEntryIds: locationIds, page, limit: LIMIT });

    const allEntryIds = [...new Set(facilities.flatMap(f => f.taxonomyIds))];
    const allTaxEntries = allEntryIds.length > 0 ? await getTaxonomyEntriesByIds(allEntryIds) : [];
    const typeNameMap = new Map<string, string>();
    facilities.forEach(facility => {
        const te = facility.taxonomyIds.map(id => allTaxEntries.find(e => e.id === id)).find(e => e?.taxonomySlug !== 'location');
        if (te) typeNameMap.set(facility.id, te.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    const totalPages = Math.ceil(total / LIMIT);
    const pageTitle = entry?.name ?? 'Senior Living Communities';
    const locationParts = entry ? [...entry.ancestors, entry.name] : undefined;
    const basePath = `/facilities/location/${slugs.join('/')}`;

    function pageHref(p: number) {
        return p > 1 ? `${basePath}?page=${p}` : basePath;
    }

    return (
        <>
            <ListingHero
                title={pageTitle}
                total={total}
                icon={faBuilding}
                heroImageSrc={getLocationSvg(slugs)}
                backHref="/facilities"
                backLabel="All Communities"
                typeNameParts={locationParts ?? [pageTitle]}
            />

            <div className="max-w-6xl mx-auto px-5 py-8">
                {facilities.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FontAwesomeIcon icon={faBuilding} className="h-12 w-12 mb-4 opacity-30" />
                        <p className="text-lg">No communities found.</p>
                    </div>
                ) : (
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
                                    <h2 className="text-base font-bold text-gray-900 leading-snug mb-1 group-hover:text-[#239ddb] transition-colors">
                                        {facility.title}
                                    </h2>
                                    {typeNameMap.get(facility.id) && (
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb] mb-2">
                                            {typeNameMap.get(facility.id)}
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
                )}

                {totalPages > 1 && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                        {page > 1 && (
                            <Link
                                href={pageHref(page - 1)}
                                className="flex items-center gap-1.5 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                                Prev
                            </Link>
                        )}
                        <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                        {page < totalPages && (
                            <Link
                                href={pageHref(page + 1)}
                                className="flex items-center gap-1.5 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                            >
                                Next
                                <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
