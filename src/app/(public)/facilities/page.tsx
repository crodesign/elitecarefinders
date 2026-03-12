import type { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faBuilding } from '@fortawesome/free-solid-svg-icons';
import { getFacilityListings, getTaxonomyEntriesByIds } from '@/lib/public-db';
import { ListingHero } from '@/components/public/ListingHero';
import { FacilityListingGrid } from '@/components/public/FacilityListingGrid';

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
    const gridClass = explicitView === 'grid' ? 'grid' : explicitView === 'list' ? 'hidden' : 'hidden sm:grid';
    const listClass = explicitView === 'list' ? 'grid' : explicitView === 'grid' ? 'hidden' : 'grid sm:hidden';

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
                    <FacilityListingGrid
                        facilities={facilities}
                        typeNameMap={typeNameMap}
                        gridClass={gridClass}
                        listClass={listClass}
                    />
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
