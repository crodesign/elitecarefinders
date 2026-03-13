import type { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faChevronRight, faHandsHolding, faUsers, faHeart, faNewspaper, faUtensils, faBook, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getPublicPosts } from '@/lib/public-db';
import { POST_TYPE_CONFIG } from '@/lib/post-type-config';

export const metadata: Metadata = {
    title: 'Resources | Elite CareFinders',
    description: 'Caregiver resources, recipes, news, and senior living guides from Elite CareFinders.',
};

const ICON_MAP: Record<string, IconDefinition> = {
    faHandsHolding: faHandsHolding,
    faUsers: faUsers,
    faHeart: faHeart,
    faNewspaper: faNewspaper,
    faUtensils: faUtensils,
    faBook: faBook,
};

function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function ResourcesPage() {
    const { items: recent } = await getPublicPosts({ limit: 6 });

    return (
        <>
            {/* Hero */}
            <div className="max-w-6xl mx-auto -mt-[10px]">
                <div className="relative bg-[#239ddb] overflow-hidden rounded-b-xl">
                    <div
                        className="absolute inset-0 opacity-[0.07]"
                        style={{ backgroundImage: "url('/images/site/hibiscus-bg.svg')", backgroundSize: '75%', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat' }}
                    />
                    <div className="relative px-5 pt-10 pb-[30px] text-center text-white">
                        <h1 className="text-3xl sm:text-4xl font-bold leading-tight flex items-center justify-center gap-3">
                            <FontAwesomeIcon icon={faBookOpen} className="h-8 w-8 opacity-80" />
                            Resources
                        </h1>
                        <p className="mt-2 text-white/70 text-sm">Guides, recipes, news, and support for caregivers and families</p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 py-10">

                {/* Category grid */}
                <div className="mb-12">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Browse by Category</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {POST_TYPE_CONFIG.map(pt => {
                            const icon = ICON_MAP[pt.icon] ?? faBook;
                            return (
                                <Link
                                    key={pt.postType}
                                    href={`/resources/${pt.slug}`}
                                    className="group flex items-start gap-4 p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-[#239ddb]/40 hover:shadow-sm transition-all"
                                >
                                    <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#239ddb]/10 text-[#239ddb] shrink-0 group-hover:bg-[#239ddb] group-hover:text-white transition-colors">
                                        <FontAwesomeIcon icon={icon} className="h-4.5 w-4.5" />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-semibold text-gray-900 group-hover:text-[#239ddb] transition-colors text-sm">{pt.label}</span>
                                        <span className="block text-xs text-gray-400 mt-0.5 leading-relaxed">{pt.description}</span>
                                    </span>
                                    <FontAwesomeIcon icon={faChevronRight} className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#239ddb] shrink-0 mt-1 transition-colors" />
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Recent posts */}
                {recent.length > 0 && (
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Posts</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {recent.map(post => {
                                const ptConfig = POST_TYPE_CONFIG.find(c => c.postType === post.postType);
                                return (
                                    <Link
                                        key={post.id}
                                        href={`/resources/${ptConfig?.slug ?? post.postType}/${post.slug}`}
                                        className="group flex flex-col bg-white border-2 border-gray-100 rounded-xl overflow-hidden hover:border-[#239ddb]/40 hover:shadow-sm transition-all"
                                    >
                                        {post.image ? (
                                            <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                                                <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                                            </div>
                                        ) : (
                                            <div className="aspect-[16/9] bg-[#239ddb]/10 flex items-center justify-center">
                                                <FontAwesomeIcon icon={faBookOpen} className="h-8 w-8 text-[#239ddb]/40" />
                                            </div>
                                        )}
                                        <div className="p-4 flex flex-col flex-1">
                                            {ptConfig && (
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">{ptConfig.label}</span>
                                            )}
                                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#239ddb] transition-colors line-clamp-2 leading-snug">{post.title}</h3>
                                            {post.excerpt && (
                                                <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed flex-1">{post.excerpt}</p>
                                            )}
                                            {post.publishedAt && (
                                                <p className="text-[11px] text-gray-300 mt-2 flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faCalendarDays} className="h-3 w-3" />
                                                    {formatDate(post.publishedAt)}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
