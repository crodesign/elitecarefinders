import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faBuilding, faStar, faArrowRight, faUsers, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { getFacilityListings, getTaxonomyEntriesByIds } from '@/lib/public-db';
import { ListingHero } from '@/components/public/ListingHero';

const LIMIT = 24;

interface Props {
    searchParams: { page?: string; view?: string };
}

export const metadata: Metadata = {
    title: 'Senior Living Communities',
    description: 'Browse senior living communities listed with Elite CareFinders in Hawaii.',
};

export default async function FacilitiesListingPage({ searchParams }: Props) {
    const page = Math.max(1, parseInt(searchParams.page || '1', 10));
    const explicitView = searchParams.view === 'list' ? 'list' : searchParams.view === 'grid' ? 'grid' : null;
    const gridClass = explicitView === 'grid' ? 'block' : explicitView === 'list' ? 'hidden' : 'hidden sm:block';
    const listClass = explicitView === 'list' ? 'block' : explicitView === 'grid' ? 'hidden' : 'block sm:hidden';

    const { items: facilities, total } = await getFacilityListings({ page, limit: LIMIT });

    const allEntryIds = [...new Set(facilities.flatMap(f => f.taxonomyIds))];
    const allTaxEntries = allEntryIds.length > 0 ? await getTaxonomyEntriesByIds(allEntryIds) : [];
    const typeNameMap = new Map<string, string>();
    facilities.forEach(facility => {
        const te = facility.taxonomyIds.map(id => allTaxEntries.find(e => e.id === id)).find(e => e?.taxonomySlug !== 'location');
        if (te) typeNameMap.set(facility.id, te.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    const totalPages = Math.ceil(total / LIMIT);

    function pageHref(p: number) {
        const v = explicitView ? `&view=${explicitView}` : '';
        return p > 1 ? `/facilities?page=${p}${v}` : explicitView ? `/facilities?view=${explicitView}` : '/facilities';
    }

    return (
        <>
            <ListingHero
                title="Senior Living Communities"
                total={total}
                icon={faBuilding}
                showViewToggle
            />

            <div className="max-w-6xl mx-auto px-5 py-8">
                {facilities.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FontAwesomeIcon icon={faBuilding} className="h-12 w-12 mb-4 opacity-30" />
                        <p className="text-lg">No communities found.</p>
                    </div>
                ) : (
                    <>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${listClass}`}>
                        {facilities.map(facility => (
                            <Link
                                key={facility.id}
                                href={`/facilities/${facility.slug}`}
                                className="group flex rounded-xl overflow-hidden bg-gray-100 hover:bg-gray-50 transition-colors"
                            >
                                <div className="relative w-32 sm:w-40 self-stretch flex-shrink-0">
                                    {facility.image ? (
                                        <Image
                                            src={facility.image.startsWith('/images/media/') ? facility.image.replace(/(\.[^.]+)$/, '-200x200.webp') : facility.image}
                                            alt={facility.title}
                                            fill
                                            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                            sizes="160px"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                            <FontAwesomeIcon icon={faBuilding} className="h-10 w-10" />
                                        </div>
                                    )}
                                    {(facility.isFacilityOfMonth || facility.isFeatured) && (
                                        <div className="absolute top-0 left-0 z-10">
                                            {facility.isFacilityOfMonth ? (
                                                <span className="flex items-center bg-amber-500 text-white px-3 py-2 rounded-br-lg shadow">
                                                    <FontAwesomeIcon icon={faTrophy} className="h-4 w-4" />
                                                </span>
                                            ) : (
                                                <span className="flex items-center bg-green-600 text-white px-3 py-2 rounded-br-lg shadow">
                                                    <FontAwesomeIcon icon={faStar} className="h-4 w-4" />
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col flex-1 p-3 min-w-0">
                                    <h2 className="text-sm font-bold text-gray-900 leading-snug mb-0.5 group-hover:text-[#239ddb] transition-colors line-clamp-2">
                                        {facility.title}
                                    </h2>
                                    {typeNameMap.get(facility.id) && (
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">
                                            {typeNameMap.get(facility.id)}
                                        </p>
                                    )}
                                    {(facility.capacity ?? 0) > 0 && (
                                        <p className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                            <FontAwesomeIcon icon={faUsers} className="h-2.5 w-2.5 text-[#239ddb]" />
                                            Capacity: {facility.capacity}
                                        </p>
                                    )}
                                    {facility.description && (
                                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 flex-1">
                                            {facility.description.replace(/<[^>]*>/g, '').trim()}
                                        </p>
                                    )}
                                    <div className="mt-2 flex items-center justify-end gap-1 text-[#239ddb] text-xs font-semibold">
                                        Learn More
                                        <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${gridClass}`}>
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
                                    {(facility.isFacilityOfMonth || facility.isFeatured) && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                            {facility.isFacilityOfMonth ? (
                                                <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-b-lg shadow">
                                                    <FontAwesomeIcon icon={faTrophy} className="h-2.5 w-2.5" />
                                                    Facility of the Month
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-b-lg shadow">
                                                    <FontAwesomeIcon icon={faStar} className="h-2.5 w-2.5" />
                                                    Featured
                                                </span>
                                            )}
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
                    </>
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
