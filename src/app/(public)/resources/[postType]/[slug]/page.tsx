import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faHandsHolding, faUsers, faHeart, faNewspaper, faUtensils, faBook } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getPublicPost, getPublicPosts } from '@/lib/public-db';
import { getPostTypeConfig, slugToPostType } from '@/lib/post-type-config';
import { HeroGallery } from '@/components/public/HeroGallery';
import { MySavedButton } from '@/components/public/MySavedButton';
import { ShareButton } from '@/components/public/ShareButton';

const ICON_MAP: Record<string, IconDefinition> = {
    faHandsHolding: faHandsHolding,
    faUsers: faUsers,
    faHeart: faHeart,
    faNewspaper: faNewspaper,
    faUtensils: faUtensils,
    faBook: faBook,
};

interface Props {
    params: { postType: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const postType = slugToPostType(params.postType);
    const post = await getPublicPost(postType, params.slug);
    if (!post) return {};
    return {
        title: post.metaTitle || `${post.title} | Elite CareFinders`,
        description: post.metaDescription || post.excerpt || undefined,
    };
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default async function ResourcePostPage({ params }: Props) {
    const config = getPostTypeConfig(params.postType);
    if (!config) notFound();

    const postType = slugToPostType(params.postType);
    const [post, { items: relatedPosts }] = await Promise.all([
        getPublicPost(postType, params.slug),
        getPublicPosts({ postType, limit: 7 }),
    ]);
    if (!post) notFound();

    const icon = ICON_MAP[config.icon] ?? faBook;
    const date = formatDate(post.publishedAt || post.createdAt);
    const otherPosts = relatedPosts.filter(p => p.slug !== params.slug).slice(0, 6);
    const galleryImages = post.image ? [{ url: post.image }] : [];

    return (
        <article className="max-w-6xl mx-auto px-[15px] py-8 sm:py-12">

            <div className="flex flex-col">
                {/* Top Action Bar — first on desktop, second on mobile */}
                <div className="order-2 lg:order-1 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <MySavedButton />
                    </div>
                    <ShareButton
                        url={`https://elitecarefinders.com/resources/${params.postType}/${params.slug}`}
                        title={post.title}
                        image={post.image ?? undefined}
                    />
                </div>

                {/* Hero Gallery — second on desktop, third on mobile */}
                {galleryImages.length > 0 && (
                    <div className="order-3 lg:order-2 mb-6">
                        <HeroGallery
                            images={galleryImages}
                            title={post.title}
                        />
                    </div>
                )}

                {/* Title + Category — first on mobile, third on desktop */}
                <header className="order-1 lg:order-3 mb-0 pb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#239ddb] bg-[#239ddb]/10 px-2.5 py-1 rounded-full">
                            <FontAwesomeIcon icon={icon} className="h-3 w-3" />
                            {config.label}
                        </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-2">{post.title}</h1>
                    {date && (
                        <p className="text-sm text-gray-400 mt-2 flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5" />
                            {date}
                        </p>
                    )}
                </header>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-0">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Video */}
                    {post.videoUrl && (
                        <div className="aspect-video rounded-xl overflow-hidden bg-black">
                            <iframe src={post.videoUrl} className="w-full h-full" allowFullScreen title={post.title} />
                        </div>
                    )}

                    {/* Content */}
                    {post.content ? (
                        <div
                            className="prose prose-gray max-w-none prose-a:text-[#239ddb] prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                    ) : (
                        <p className="text-gray-400 italic">No content available.</p>
                    )}

                    {/* Back link */}
                    <div className="pt-6 border-t border-gray-100">
                        <Link
                            href={`/resources/${params.postType}`}
                            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#239ddb] transition-colors"
                        >
                            Back to {config.label}
                        </Link>
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                    {otherPosts.length > 0 && (
                        <div>
                            <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-4">
                                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                    <FontAwesomeIcon icon={icon} className="h-4 w-4 text-white" />
                                </span>
                                More {config.label}
                            </h2>
                            <ul className="space-y-3">
                                {otherPosts.map(p => (
                                    <li key={p.slug}>
                                        <Link
                                            href={`/resources/${params.postType}/${p.slug}`}
                                            className="group flex items-start gap-3"
                                        >
                                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                                {p.image ? (
                                                    <img
                                                        src={p.image.startsWith('/images/media/') ? p.image.replace(/(\.[^.]+)$/, '-100x100.webp') : p.image}
                                                        alt={p.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <FontAwesomeIcon icon={icon} className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800 group-hover:text-[#239ddb] transition-colors leading-snug line-clamp-3">
                                                {p.title}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <Link
                                    href={`/resources/${params.postType}`}
                                    className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#239ddb] transition-colors"
                                >
                                    All {config.label}
                                </Link>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </article>
    );
}
