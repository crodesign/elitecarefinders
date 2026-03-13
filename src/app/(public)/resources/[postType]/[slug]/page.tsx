import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faHandsHolding, faUsers, faHeart, faNewspaper, faUtensils, faBook, faClock, faFire, faChevronLeft, faChevronRight, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { getPublicPost, getPublicPosts, getAdjacentPost } from '@/lib/public-db';
import { postTypeToSlug } from '@/lib/post-type-config';
import type { RecipeMetadata } from '@/lib/public-db';
import { getPostTypeConfig, slugToPostType } from '@/lib/post-type-config';
import { HeroGallery } from '@/components/public/HeroGallery';
import { VideoPlayer } from '@/components/public/VideoPlayer';
import { FavoriteButton } from '@/components/public/FavoriteButton';
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
    const [post, { items: relatedPosts }, { items: recentAllPosts }] = await Promise.all([
        getPublicPost(postType, params.slug),
        getPublicPosts({ postType, limit: 6 }),
        getPublicPosts({ limit: 10 }),
    ]);
    if (!post) notFound();
    const adjacent = await getAdjacentPost(postType, post.title);

    const icon = ICON_MAP[config.icon] ?? faBook;
    const date = formatDate(post.publishedAt || post.createdAt);
    const otherPosts = relatedPosts.filter(p => p.slug !== params.slug).slice(0, 5);
    const recentOtherPosts = recentAllPosts.filter(p => p.postType !== postType && p.slug !== params.slug).slice(0, 5);
    const galleryImages = post.images.length > 0
        ? post.images.map(url => ({ url }))
        : post.image ? [{ url: post.image }] : [];
    const recipe: RecipeMetadata | null = post.postType === 'recipes' ? (post.metadata ?? null) : null;

    return (
        <article className="max-w-6xl mx-auto px-[15px] py-8 sm:py-12">

            <div className="flex flex-col">
                {/* Top Action Bar — first on desktop, second on mobile */}
                <div className="order-2 lg:order-1 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <MySavedButton />
                        <FavoriteButton
                            type="post"
                            entityId={post.id}
                            entitySlug={post.slug}
                            entityTitle={post.title}
                            entityImage={post.image ?? undefined}
                        />
                    </div>
                    <ShareButton
                        url={`https://elitecarefinders.com/resources/${params.postType}/${params.slug}`}
                        title={post.title}
                        image={post.image ?? undefined}
                    />
                </div>

                {/* Hero image / gallery */}
                {(recipe || post.videoUrl || post.images.length > 0 || post.image) && (
                    post.videoUrl && !recipe && post.images.length > 1 ? (
                        <div className="order-3 lg:order-2 mb-6">
                            <HeroGallery
                                images={galleryImages}
                                title={post.title}
                                videos={[{ url: post.videoUrl }]}
                                videoFirst
                            />
                        </div>
                    ) : post.images.length > 1 && !recipe ? (
                        <div className="order-3 lg:order-2 mb-6">
                            <HeroGallery images={galleryImages} title={post.title} />
                        </div>
                    ) : post.videoUrl ? (
                        <div className="order-3 lg:order-2 mb-6 w-full md:h-[440px] rounded-xl overflow-hidden bg-black relative">
                            <VideoPlayer url={post.videoUrl} title={post.title} />
                        </div>
                    ) : post.image ? (
                        <div className="order-3 lg:order-2 mb-6 w-full aspect-square md:aspect-auto md:h-[440px] rounded-xl overflow-hidden bg-gray-100">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                        </div>
                    ) : null
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
                <div className="lg:col-span-2 space-y-8 lg:pl-6">


                    {/* Content */}
                    {post.content ? (
                        <div
                            className="prose prose-gray max-w-none prose-a:text-[#239ddb] prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                    ) : (
                        <p className="text-gray-400 italic">No content available.</p>
                    )}

                    {/* Recipe sections */}
                    {recipe && (
                        <div className="space-y-8">
                            {/* Prep / Cook / Yield row */}
                            {(recipe.prepTime || recipe.cookTime || recipe.yield) && (
                                <div className="grid grid-cols-3 gap-4">
                                    {recipe.prepTime != null && (
                                        <div className="flex flex-col items-center gap-1.5 bg-gray-100 rounded-xl py-4 px-3 text-center">
                                            <FontAwesomeIcon icon={faClock} className="h-5 w-5 text-[#239ddb]" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Prep</span>
                                            <span className="text-sm font-semibold text-gray-800">{recipe.prepTime} min</span>
                                        </div>
                                    )}
                                    {recipe.cookTime != null && (
                                        <div className="flex flex-col items-center gap-1.5 bg-gray-100 rounded-xl py-4 px-3 text-center">
                                            <FontAwesomeIcon icon={faFire} className="h-5 w-5 text-[#239ddb]" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cook</span>
                                            <span className="text-sm font-semibold text-gray-800">
                                                {recipe.cookTime >= 60 ? `${Math.floor(recipe.cookTime / 60)}h${recipe.cookTime % 60 > 0 ? ` ${recipe.cookTime % 60}m` : ''}` : `${recipe.cookTime} min`}
                                            </span>
                                        </div>
                                    )}
                                    {recipe.yield && (
                                        <div className="flex flex-col items-center gap-1.5 bg-gray-100 rounded-xl py-4 px-3 text-center">
                                            <FontAwesomeIcon icon={faUtensils} className="h-5 w-5 text-[#239ddb]" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Yield</span>
                                            <span className="text-sm font-semibold text-gray-800">{recipe.yield}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Ingredients */}
                            {recipe.ingredients && recipe.ingredients.length > 0 && (
                                <div className="bg-[#f0f8fc] rounded-2xl p-6">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">Ingredients</h2>
                                    <ul className="space-y-2">
                                        {recipe.ingredients.map((ing, i) => (
                                            <li key={i} className="flex gap-3 text-sm text-gray-700">
                                                <span className="font-semibold text-gray-900 shrink-0 w-24 text-right">{ing.amount}</span>
                                                <span>{ing.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Steps */}
                            {recipe.instructions && recipe.instructions.length > 0 && (
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 mb-5">Instructions</h2>
                                    <ol className="space-y-6">
                                        {recipe.instructions.map((step, i) => (
                                            <li key={i} className="flex gap-4">
                                                {step.image && (
                                                    <div className="flex-shrink-0 w-1/3 aspect-square rounded-xl overflow-hidden bg-gray-100">
                                                        <img
                                                            src={step.image}
                                                            alt={`Step ${i + 1}`}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 flex gap-3">
                                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#239ddb] text-white text-sm font-bold flex items-center justify-center mt-0.5">
                                                        {i + 1}
                                                    </span>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{step.text}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Source link */}
                            {recipe.sourceUrl && (
                                <div className="pt-4 text-sm text-gray-500">
                                    Recipe source:{' '}
                                    <a
                                        href={recipe.sourceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#239ddb] hover:underline"
                                    >
                                        {recipe.sourceName || recipe.sourceUrl}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {(adjacent.prev || adjacent.next) && (
                        <div className="-ml-6 rounded-xl bg-gradient-to-b from-white to-gray-100 px-5 py-4 flex items-center justify-between gap-4">
                            <div>
                                {adjacent.prev ? (
                                    <Link href={`/resources/${params.postType}/${adjacent.prev.slug}`} className="group flex items-center gap-2 text-left">
                                        <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4 text-[#239ddb] shrink-0" />
                                        <div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Previous</span>
                                            <span className="text-sm font-bold text-[#239ddb] group-hover:underline line-clamp-1">{adjacent.prev.title}</span>
                                        </div>
                                    </Link>
                                ) : <div />}
                            </div>
                            <div className="text-right">
                                {adjacent.next ? (
                                    <Link href={`/resources/${params.postType}/${adjacent.next.slug}`} className="group flex items-center gap-2 text-right justify-end">
                                        <div>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Next</span>
                                            <span className="text-sm font-bold text-[#239ddb] group-hover:underline line-clamp-1">{adjacent.next.title}</span>
                                        </div>
                                        <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 text-[#239ddb] shrink-0" />
                                    </Link>
                                ) : <div />}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <aside className="space-y-6">
                    {otherPosts.length > 0 && (
                        <div className="bg-gray-100 rounded-xl p-5">
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
                                            className="group flex items-center gap-3 bg-white rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
                                        >
                                            <div className="w-14 h-14 rounded-l-xl overflow-hidden bg-gray-100 shrink-0">
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
                                            <span className="flex-1 text-xs text-gray-800 group-hover:text-[#239ddb] transition-colors leading-snug line-clamp-3">
                                                {p.title}
                                            </span>
                                            <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3 text-[#239ddb] shrink-0 mr-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-2 pt-2 flex justify-end">
                                <Link
                                    href={`/resources/${params.postType}`}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#239ddb] transition-colors"
                                >
                                    All {config.label}
                                    <FontAwesomeIcon icon={faChevronRight} className="h-2.5 w-2.5" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {recentOtherPosts.length > 0 && (
                        <div className="bg-gray-100 rounded-xl p-5">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-4">
                                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                    <FontAwesomeIcon icon={faNewspaper} className="h-4 w-4 text-white" />
                                </span>
                                Recent Posts
                            </h2>
                            <ul className="space-y-3">
                                {recentOtherPosts.map(p => {
                                    const typeSlug = postTypeToSlug(p.postType);
                                    return (
                                        <li key={p.slug}>
                                            <Link
                                                href={`/resources/${typeSlug}/${p.slug}`}
                                                className="group flex items-center gap-3 bg-white rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
                                            >
                                                <div className="w-14 h-14 rounded-l-xl overflow-hidden bg-gray-100 shrink-0">
                                                    {p.image ? (
                                                        <img
                                                            src={p.image.startsWith('/images/media/') ? p.image.replace(/(\.[^.]+)$/, '-100x100.webp') : p.image}
                                                            alt={p.title}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <FontAwesomeIcon icon={faNewspaper} className="h-6 w-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="flex-1 text-xs text-gray-800 group-hover:text-[#239ddb] transition-colors leading-snug line-clamp-3">
                                                    {p.title}
                                                </span>
                                                <FontAwesomeIcon icon={faChevronRight} className="h-3 w-3 text-[#239ddb] shrink-0 mr-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                            <div className="mt-2 pt-2 flex justify-end">
                                <Link
                                    href="/resources"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#239ddb] transition-colors"
                                >
                                    All Resources
                                    <FontAwesomeIcon icon={faChevronRight} className="h-2.5 w-2.5" />
                                </Link>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </article>
    );
}
