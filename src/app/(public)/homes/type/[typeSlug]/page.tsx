import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faHouse, faStar, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { getHomeListings, getTaxonomyEntryBySlug, getTaxonomyEntriesByIds } from '@/lib/public-db';
import { ListingHero } from '@/components/public/ListingHero';

const LIMIT = 24;

interface Props {
    params: { typeSlug: string };
    searchParams: { page?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const typeEntry = await getTaxonomyEntryBySlug(params.typeSlug);
    const title = typeEntry ? `${typeEntry.name} | Care Homes` : 'Care Homes';
    return { title, description: `Browse ${title.toLowerCase()} listed with Elite CareFinders in Hawaii.` };
}

export default async function HomesByTypePage({ params, searchParams }: Props) {
    const { typeSlug } = params;
    const page = Math.max(1, parseInt(searchParams.page || '1', 10));

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
        return p > 1 ? `/homes/type/${typeSlug}?page=${p}` : `/homes/type/${typeSlug}`;
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
            />

            <div className="max-w-6xl mx-auto px-5 py-8">
                {homes.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FontAwesomeIcon icon={faHouse} className="h-12 w-12 mb-4 opacity-30" />
                        <p className="text-lg">No homes found.</p>
                    </div>
                ) : (
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
                                    <h2 className="text-base font-bold text-gray-900 leading-snug mb-1 group-hover:text-[#239ddb] transition-colors">
                                        {home.title}
                                    </h2>
                                    {typeNameMap.get(home.id) && (
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb] mb-2">
                                            {typeNameMap.get(home.id)}
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
