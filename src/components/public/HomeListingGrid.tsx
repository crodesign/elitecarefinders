import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faStar, faArrowRight, faTrophy } from '@fortawesome/free-solid-svg-icons';
import type { HomeListingCard } from '@/lib/public-db';

interface Props {
    homes: HomeListingCard[];
    typeNameMap: Map<string, string>;
    gridClass: string;
    listClass: string;
}

export function HomeListingGrid({ homes, typeNameMap, gridClass, listClass }: Props) {
    return (
        <>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${listClass}`}>
                {homes.map(home => (
                    <Link
                        key={home.id}
                        href={`/homes/${home.slug}`}
                        className={`group flex rounded-xl overflow-hidden hover:shadow-md transition-all ${home.isHomeOfMonth ? 'bg-amber-50 hover:bg-white' : home.isFeatured ? 'bg-green-50 hover:bg-white' : 'bg-gray-100 hover:bg-gray-50'}`}
                    >
                        <div className="relative w-32 sm:w-40 self-stretch flex-shrink-0">
                            {home.image ? (
                                <Image
                                    src={home.image.startsWith('/images/media/') ? home.image.replace(/(\.[^.]+)$/, '-200x200.webp') : home.image}
                                    alt={home.title}
                                    fill
                                    className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                    sizes="160px"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                    <FontAwesomeIcon icon={faHouse} className="h-10 w-10" />
                                </div>
                            )}
                            {(home.isHomeOfMonth || home.isFeatured) && (
                                <div className="absolute top-0 left-0 z-10">
                                    {home.isHomeOfMonth ? (
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
                                {home.title}
                            </h2>
                            {typeNameMap.get(home.id) && (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">
                                    {typeNameMap.get(home.id)}
                                </p>
                            )}
                            {home.description && (
                                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 flex-1">
                                    {home.description.replace(/<[^>]*>/g, '').trim()}
                                </p>
                            )}
                            <div className="mt-auto pt-2 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#239ddb] transition-colors">
                                Learn More
                                <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${gridClass}`}>
                {homes.map(home => (
                    <Link
                        key={home.id}
                        href={`/homes/${home.slug}`}
                        className={`group flex flex-col rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 ${home.isHomeOfMonth ? 'bg-amber-50' : home.isFeatured ? 'bg-green-50' : 'bg-gray-100'}`}
                    >
                        <div className={`relative w-full h-48 flex-shrink-0 ${home.isHomeOfMonth ? 'bg-amber-50' : home.isFeatured ? 'bg-green-50' : 'bg-gray-100'}`}>
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
                            {(home.isHomeOfMonth || home.isFeatured) && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                    {home.isHomeOfMonth ? (
                                        <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-b-lg shadow">
                                            <FontAwesomeIcon icon={faTrophy} className="h-2.5 w-2.5" />
                                            Home of the Month
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
                            <div className="mt-auto pt-3 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#239ddb] transition-colors">
                                Learn More
                                <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}
