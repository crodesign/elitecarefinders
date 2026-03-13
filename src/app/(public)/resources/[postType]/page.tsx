import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faChevronLeft, faChevronRight, faArrowRight, faCalendarDays, faHandsHolding, faUsers, faHeart, faNewspaper, faUtensils, faBook } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getPublicPosts } from '@/lib/public-db';
import { getPostTypeConfig, slugToPostType } from '@/lib/post-type-config';

const ICON_MAP: Record<string, IconDefinition> = {
    faHandsHolding: faHandsHolding,
    faUsers: faUsers,
    faHeart: faHeart,
    faNewspaper: faNewspaper,
    faUtensils: faUtensils,
    faBook: faBook,
};

const LIMIT = 12;

interface Props {
    params: { postType: string };
    searchParams: { page?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const config = getPostTypeConfig(params.postType);
    if (!config) return {};
    return {
        title: `${config.label} | Resources | Elite CareFinders`,
        description: config.description,
    };
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function ResourceTypeListPage({ params, searchParams }: Props) {
    const config = getPostTypeConfig(params.postType);
    if (!config) notFound();

    const page = Math.max(1, parseInt(searchParams.page || '1', 10));
    const postType = slugToPostType(params.postType);
    const { items: posts, total } = await getPublicPosts({ postType, page, limit: LIMIT });
    const totalPages = Math.ceil(total / LIMIT);

    const icon = ICON_MAP[config.icon] ?? faBook;

    function pageHref(p: number) {
        return p > 1 ? `/resources/${params.postType}?page=${p}` : `/resources/${params.postType}`;
    }

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
                            <FontAwesomeIcon icon={icon} className="h-8 w-8 opacity-80" />
                            {config.label}
                        </h1>
                        <p className="mt-2 text-white/70 text-sm">
                            <Link href="/resources" className="hover:text-white transition-colors">Resources</Link>
                            <span className="mx-2 opacity-40">•</span>
                            {total} {total === 1 ? 'post' : 'posts'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 py-10">

                {/* Back link */}
                <Link href="/resources" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#239ddb] transition-colors mb-6">
                    <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                    All Resources
                </Link>

                {posts.length === 0 ? (
                    <div className="text-center py-16 text-gray-300">
                        <FontAwesomeIcon icon={faBookOpen} className="h-12 w-12 mb-4 opacity-30" />
                        <p className="text-lg text-gray-400">No posts yet in this category.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map(post => (
                            <Link
                                key={post.id}
                                href={`/resources/${params.postType}/${post.slug}`}
                                className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 bg-gray-100 hover:shadow-md"
                            >
                                <div className="relative w-full h-48 bg-gray-200 flex-shrink-0 overflow-hidden">
                                    {post.image ? (
                                        <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                            <FontAwesomeIcon icon={icon} className="h-12 w-12" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#239ddb] transition-colors line-clamp-2 leading-snug mb-1">{post.title}</h3>
                                    {post.excerpt && (
                                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">{post.excerpt}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-3">
                                        {post.publishedAt ? (
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                                <FontAwesomeIcon icon={faCalendarDays} className="h-3 w-3" />
                                                {formatDate(post.publishedAt)}
                                            </p>
                                        ) : <span />}
                                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#239ddb] transition-colors">
                                                Learn More
                                                <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
                                            </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="mt-10 flex items-center justify-center gap-2">
                        {page > 1 && (
                            <Link href={pageHref(page - 1)} className="flex items-center gap-1.5 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors">
                                <FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" />
                                Prev
                            </Link>
                        )}
                        <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                        {page < totalPages && (
                            <Link href={pageHref(page + 1)} className="flex items-center gap-1.5 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm text-gray-600 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors">
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
