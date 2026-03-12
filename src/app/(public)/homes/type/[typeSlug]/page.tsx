import type { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faHouse } from '@fortawesome/free-solid-svg-icons';
import { getHomeListings, getTaxonomyEntryBySlug, getTaxonomyEntriesByIds } from '@/lib/public-db';
import { ListingHero } from '@/components/public/ListingHero';
import { HomeListingGrid } from '@/components/public/HomeListingGrid';

const LIMIT = 24;

interface Props {
    params: { typeSlug: string };
    searchParams: { page?: string; view?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const typeEntry = await getTaxonomyEntryBySlug(params.typeSlug);
    const title = typeEntry ? `${typeEntry.name} | Care Homes` : 'Care Homes';
    return { title, description: `Browse ${title.toLowerCase()} listed with Elite CareFinders in Hawaii.` };
}

export default async function HomesByTypePage({ params, searchParams }: Props) {
    const { typeSlug } = params;
    const page = Math.max(1, parseInt(searchParams.page || '1', 10));
    const explicitView = searchParams.view === 'list' ? 'list' : searchParams.view === 'grid' ? 'grid' : null;
    const gridClass = explicitView === 'grid' ? 'grid' : explicitView === 'list' ? 'hidden' : 'hidden sm:grid';
    const listClass = explicitView === 'list' ? 'grid' : explicitView === 'grid' ? 'hidden' : 'grid sm:hidden';

    const typeEntry = await getTaxonomyEntryBySlug(typeSlug);
    const { items: homes, total } = await getHomeListings({ typeEntryId: typeEntry?.id, page, limit: LIMIT });

    const allEntryIds = [...new Set(homes.flatMap(h => h.taxonomyEntryIds))];
    const allTaxEntries = allEntryIds.length > 0 ? await getTaxonomyEntriesByIds(allEntryIds) : [];
    const typeNameMap = new Map<string, string>();
    homes.forEach(home => {
        const te = home.taxonomyEntryIds.map(id => allTaxEntries.find(e => e.id === id)).find(e => e?.taxonomySlug !== 'location');
        if (te) typeNameMap.set(home.id, te.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    const totalPages = Math.ceil(total / LIMIT);
    const pageTitle = typeEntry?.name ?? 'Care Homes';

    function pageHref(p: number) {
        const v = explicitView ? `&view=${explicitView}` : '';
        return p > 1 ? `/homes/type/${typeSlug}?page=${p}${v}` : explicitView ? `/homes/type/${typeSlug}?view=${explicitView}` : `/homes/type/${typeSlug}`;
    }

    return (
        <>
            <ListingHero
                title={pageTitle}
                total={total}
                icon={faHouse}
                backHref="/homes"
                backLabel="All Homes"
                typeName={typeEntry?.name}
                showViewToggle
            />

            <div className="max-w-6xl mx-auto px-5 py-8">
                {homes.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FontAwesomeIcon icon={faHouse} className="h-12 w-12 mb-4 opacity-30" />
                        <p className="text-lg">No homes found.</p>
                    </div>
                ) : (
                    <HomeListingGrid
                        homes={homes}
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
