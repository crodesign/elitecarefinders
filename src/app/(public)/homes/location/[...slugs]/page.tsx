import type { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faHouse } from '@fortawesome/free-solid-svg-icons';
import { permanentRedirect } from 'next/navigation';
import { getHomeListings, getTaxonomyEntriesByIds, getLocationEntryByPath, findFullLocationPath, getLocationDescendantIds, getHawaiiNeighborhoodsGrouped } from '@/lib/public-db';
import { getLocationSvg } from '@/lib/location-svgs';
import { ListingHero } from '@/components/public/ListingHero';
import { HomeListingGrid } from '@/components/public/HomeListingGrid';
import { ListingFilterBar } from '@/components/public/ListingFilterBar';

const LIMIT = 24;

interface Props {
    params: { slugs: string[] };
    searchParams: { page?: string; view?: string; q?: string; neighborhood?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const entry = await getLocationEntryByPath(params.slugs);
    const locationLabel = entry
        ? [entry.name, ...entry.ancestors.slice().reverse()].join(', ')
        : params.slugs.join(', ');
    return {
        title: `${locationLabel} | Care Homes & Adult Foster Homes`,
        description: `Browse care homes and adult foster homes in ${entry?.name ?? params.slugs.at(-1)} listed with Elite CareFinders.`,
    };
}

export default async function HomesByLocationPage({ params, searchParams }: Props) {
    const { slugs } = params;
    const page = Math.max(1, parseInt(searchParams.page || '1', 10));
    const q = searchParams.q || '';
    const neighborhood = searchParams.neighborhood || '';
    const explicitView = searchParams.view === 'list' ? 'list' : searchParams.view === 'grid' ? 'grid' : null;
    const gridClass = explicitView === 'grid' ? 'grid' : explicitView === 'list' ? 'hidden' : 'hidden sm:grid';
    const listClass = explicitView === 'list' ? 'grid' : explicitView === 'grid' ? 'hidden' : 'grid sm:hidden';

    let entry = await getLocationEntryByPath(slugs);
    if (!entry && slugs.length === 2) {
        const fullPath = await findFullLocationPath(slugs[0], slugs[1]);
        if (fullPath) permanentRedirect(`/homes/location/${fullPath.join('/')}`);
    }

    const [locationIds, islands] = await Promise.all([
        entry ? getLocationDescendantIds(entry.id) : Promise.resolve(undefined),
        getHawaiiNeighborhoodsGrouped(),
    ]);

    const activeLocationIds = neighborhood ? [neighborhood] : locationIds;
    const { items: homes, total } = await getHomeListings({ locationEntryIds: activeLocationIds, q: q || undefined, page, limit: LIMIT });

    const allEntryIds = [...new Set(homes.flatMap(h => h.taxonomyEntryIds))];
    const allTaxEntries = allEntryIds.length > 0 ? await getTaxonomyEntriesByIds(allEntryIds) : [];
    const typeNameMap = new Map<string, string>();
    homes.forEach(home => {
        const te = home.taxonomyEntryIds.map(id => allTaxEntries.find(e => e.id === id)).find(e => e?.taxonomySlug !== 'location');
        if (te) typeNameMap.set(home.id, te.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    const totalPages = Math.ceil(total / LIMIT);
    const pageTitle = entry?.name ?? 'Care Homes & Adult Foster Homes';
    const locationParts = entry ? [...entry.ancestors, entry.name] : undefined;
    const basePath = `/homes/location/${slugs.join('/')}`;

    function pageHref(p: number) {
        const ps = new URLSearchParams();
        if (p > 1) ps.set('page', String(p));
        if (explicitView) ps.set('view', explicitView);
        if (q) ps.set('q', q);
        if (neighborhood) ps.set('neighborhood', neighborhood);
        const str = ps.toString();
        return str ? `${basePath}?${str}` : basePath;
    }

    return (
        <>
            <ListingHero
                title={pageTitle}
                total={total}
                icon={faHouse}
                heroImageSrc={getLocationSvg(slugs)}
                backHref="/homes"
                backLabel="All Homes"
                typeNameParts={locationParts ?? [pageTitle]}
                showViewToggle
            />

            <div className="max-w-6xl mx-auto px-5 py-8">
                <ListingFilterBar islands={islands} basePath={basePath} />

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
