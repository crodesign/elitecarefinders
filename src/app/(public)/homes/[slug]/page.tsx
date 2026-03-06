import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faShareNodes, faCheck, faHandHoldingHeart, faHouse, faBed, faCircleInfo, faUtensils, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { getHomeBySlug, getTaxonomyEntriesByIds, getRoomFieldData, getMediaCaptionsByUrls, getAdjacentHome, getFeaturedHomes } from '@/lib/public-db';
import { HeroGallery } from '@/components/public/HeroGallery';
import { RoomDetailsSection } from '@/components/public/RoomDetailsSection';
import { EntityCTAButtons } from '@/components/public/EntityCTAButtons';
import { FavoriteButton } from '@/components/public/FavoriteButton';
import { MySavedButton } from '@/components/public/MySavedButton';
import { ShareButton } from '@/components/public/ShareButton';
import { DiagonalReveal } from '@/components/public/DiagonalReveal';
import { StickyEntityBar } from '@/components/public/StickyEntityBar';

interface Props {
    params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = params;
    const home = await getHomeBySlug(slug);
    if (!home) return { title: 'Not Found' };
    return {
        title: home.title,
        description: home.description?.slice(0, 155),
        openGraph: {
            title: home.title,
            description: home.description?.slice(0, 155),
            images: home.images[0] ? [{ url: home.images[0] }] : [],
        },
    };
}

export default async function HomeDetailPage({ params }: Props) {
    const { slug } = params;

    const [home, fieldData] = await Promise.all([
        getHomeBySlug(slug),
        getRoomFieldData(),
    ]);

    if (!home) notFound();

    const [taxonomyEntries, adjacent, featuredRaw] = await Promise.all([
        getTaxonomyEntriesByIds(home.taxonomyEntryIds || []),
        getAdjacentHome(home.title),
        getFeaturedHomes(home.slug),
    ]);
    const featuredHomes = featuredRaw.sort(() => Math.random() - 0.5).slice(0, 4);
    const { categories, definitions } = fieldData;

    const floorLevelDef = definitions.find(d => d.slug === 'floor-level');
    const floorLevel = floorLevelDef
        ? (home.roomDetails?.customFields?.[floorLevelDef.id] as string | undefined) || undefined
        : undefined;

    const addr = home.address;
    const hasAddress = home.showAddress && (addr.street || addr.city);

    // Fetch media captions for gallery + team images + cuisine images
    const allImageUrls = [...home.images, ...(home.teamImages || []), ...(home.cuisineImages || [])];
    const mediaCaptions = allImageUrls.length > 0 ? await getMediaCaptionsByUrls(allImageUrls) : {};

    // Format images for the gallery with their resolved captions
    const galleryImages = home.images.map(url => ({
        url,
        caption: mediaCaptions[url] || undefined
    }));

    // JSON-LD structured data
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'LodgingBusiness',
        name: home.title,
        description: home.description,
        url: `https://www.elitecarefinders.com/homes/${home.slug}`,
        ...(home.images[0] && { image: home.images[0] }),
        ...(hasAddress && {
            address: {
                '@type': 'PostalAddress',
                streetAddress: addr.street,
                addressLocality: addr.city,
                addressRegion: addr.state,
                postalCode: addr.zip,
                addressCountry: 'US',
            },
        }),
        ...(home.phone && { telephone: home.phone }),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <article className="max-w-6xl mx-auto px-[15px] py-8 sm:py-12">

                <div className="flex flex-col">
                {/* Top Action Bar — first on desktop, second on mobile */}
                <div className="order-2 lg:order-1 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <MySavedButton />
                        <FavoriteButton
                            type="home"
                            entityId={home.id}
                            entitySlug={home.slug}
                            entityTitle={home.title}
                            entityImage={home.images[0]}
                        />
                    </div>
                    <ShareButton
                        url={`https://elitecarefinders.com/homes/${home.slug}`}
                        title={home.title}
                        image={home.images?.[0]}
                    />
                </div>

                {/* Hero Gallery — second on desktop, third on mobile */}
                {(home.images.length > 0 || (home.videos?.length ?? 0) > 0) && (
                    <div className="order-3 lg:order-2 mb-6">
                        <HeroGallery
                            images={galleryImages}
                            videos={home.videos}
                            title={home.title}
                            featuredLabel={home.featuredLabel}
                        />
                    </div>
                )}

                {/* Title + Tags — first on mobile, third on desktop */}
                <header className="order-1 lg:order-3 mb-0 flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6">
                    <div>
                        {home.displayReferenceNumber && (
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Reference No.</p>
                        )}
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-2">
                            {home.title}
                        </h1>

                        {(() => {
                            const locationNames = taxonomyEntries
                                .filter(e => e.taxonomySlug === 'location')
                                .flatMap(e => e.ancestorNames ?? [e.name])
                                .filter((v, i, a) => a.indexOf(v) === i);

                            const typeEntries = taxonomyEntries.filter(e => e.taxonomySlug !== 'location');
                            const typeNames = typeEntries.map(e => e.name);
                            const baseName = (typeEntries[0]?.taxonomyName || 'Type').replace(/\s*types?$/i, '');
                            const typeLabel = (baseName ? baseName + ' ' : '') + (typeNames.length > 1 ? 'Types:' : 'Type:');

                            return (
                                <div className="mt-2 space-y-1">
                                    {locationNames.length > 0 && (
                                        <div className="flex items-baseline gap-2 text-xs">
                                            <span className="font-bold uppercase tracking-widest text-gray-400 shrink-0">Location:</span>
                                            <span className="font-semibold uppercase tracking-wide text-[#239ddb]">{locationNames.join(' · ')}</span>
                                        </div>
                                    )}
                                    {typeNames.length > 0 && (
                                        <div className="flex items-baseline gap-2 text-xs">
                                            <span className="font-bold uppercase tracking-widest text-gray-400 shrink-0">{typeLabel}</span>
                                            <span className="font-semibold uppercase tracking-wide text-[#239ddb]">{typeNames.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                </header>
                <StickyEntityBar title={home.title} entityName={home.title} entityType="home" subtitle={taxonomyEntries.filter(e => e.taxonomySlug !== 'location').map(e => e.name).join(', ')} />
                </div>{/* end flex-col order wrapper */}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-0">
                    {/* Mobile-only: CTA + details before main content */}
                    <div className="lg:hidden space-y-6">
                        <EntityCTAButtons entityName={home.title} entityType="home" />
                        <div className="bg-gray-100 rounded-xl p-5">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                    <FontAwesomeIcon icon={faHouse} className="h-4 w-4 text-white" />
                                </span>
                                Home Details
                            </h2>
                            <div className="space-y-4">
                                {(home.roomDetails?.bedroomType || floorLevel) && (
                                    <div className="grid grid-cols-2 gap-x-4">
                                        {home.roomDetails?.bedroomType && (
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Bedroom Type</p>
                                                <p className="text-sm text-gray-900">{home.roomDetails.bedroomType}</p>
                                            </div>
                                        )}
                                        {floorLevel && (
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Floor Level</p>
                                                <p className="text-sm text-gray-900">{floorLevel}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {(home.roomDetails?.bathroomType || home.roomDetails?.showerType) && (
                                    <div className="grid grid-cols-2 gap-x-4">
                                        {home.roomDetails?.bathroomType && (
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Bathroom Type</p>
                                                <p className="text-sm text-gray-900">{home.roomDetails.bathroomType}</p>
                                            </div>
                                        )}
                                        {home.roomDetails?.showerType && (
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Shower Type</p>
                                                <p className="text-sm text-gray-900">{home.roomDetails.showerType}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {home.roomDetails && (
                                    <RoomDetailsSection
                                        roomDetails={home.roomDetails}
                                        categories={categories}
                                        definitions={definitions}
                                        targetType="home"
                                        sectionFilter="location_details"
                                        hideFixedFields
                                    />
                                )}
                                {hasAddress && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Address</p>
                                        {addr.street && <p className="text-sm text-gray-900">{addr.street}</p>}
                                        <p className="text-sm text-gray-900">{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
                                    </div>
                                )}
                                {hasAddress && (
                                    <iframe
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent([addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', '))}&output=embed`}
                                        className="w-full h-48 rounded-lg border-0 mt-2"
                                        loading="lazy"
                                        allowFullScreen
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Care Provider Details */}
                        {(() => {
                            const cf = home.roomDetails?.customFields || {};
                            const defBySlug = new Map(definitions.map(d => [d.slug, d]));

                            const col1Slugs = ['care-provider-title', 'care-provider-gender', 'number-on-staff', 'care-provider-hours'];
                            const col1Items = col1Slugs.flatMap(slug => {
                                const def = defBySlug.get(slug);
                                if (!def) return [];
                                const val = cf[def.id];
                                if (val == null || val === '') return [];
                                return [{ id: def.id, label: def.name, value: Array.isArray(val) ? val.join(', ') : String(val) }];
                            });

                            const aboutDef = defBySlug.get('about-care-provider');
                            const aboutText = aboutDef ? (cf[aboutDef.id] as string | undefined) : undefined;

                            const skillsDef = defBySlug.get('care-provider-skills-specialties');
                            const skillsRaw = skillsDef ? cf[skillsDef.id] : undefined;
                            const skills: string[] = skillsRaw == null ? [] : Array.isArray(skillsRaw) ? skillsRaw : [String(skillsRaw)];

                            const foodDef = defBySlug.get('types-of-food-available');
                            const foodRaw = foodDef ? cf[foodDef.id] : undefined;
                            const foods: string[] = foodRaw == null ? [] : Array.isArray(foodRaw) ? foodRaw : [String(foodRaw)];

                            const languages: string[] = home.roomDetails?.languages || [];

                            const hasCol2 = !!aboutText || skills.length > 0 || foods.length > 0;
                            const teamImages: string[] = home.teamImages || [];
                            if (col1Items.length === 0 && !hasCol2 && languages.length === 0 && !teamImages.length) return null;

                            return (
                                <DiagonalReveal color="#f0f8fc" className="rounded-xl">
                                <div className="p-6">
                                    <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                            <FontAwesomeIcon icon={faHandHoldingHeart} className="h-4 w-4 text-white" />
                                        </span>
                                        About The Care Provider
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Col 1: Provider Information + Languages */}
                                        <div className="space-y-5">
                                            {col1Items.map(({ id, label, value }) => (
                                                <div key={id}>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>
                                                    <p className="text-sm text-gray-900">{value}</p>
                                                </div>
                                            ))}
                                            {languages.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Languages Spoken</p>
                                                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                        {languages.map(lang => (
                                                            <li key={lang} className="flex items-center gap-2 text-sm">
                                                                <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 text-[#239ddb] shrink-0" />
                                                                <span className="text-gray-700">{lang}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        {/* Col 2: About + Skills + Food */}
                                        <div className="space-y-5">
                                            {aboutText && (
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">About Care Provider</p>
                                                    <p className="text-sm text-gray-700 leading-relaxed">{aboutText}</p>
                                                </div>
                                            )}
                                            {skills.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Skills & Specialties</p>
                                                    <ul className="grid grid-cols-1 gap-y-1">
                                                        {skills.map(skill => (
                                                            <li key={skill} className="flex items-center gap-2 text-sm">
                                                                <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 text-[#239ddb] shrink-0" />
                                                                <span className="text-gray-700">{skill}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {foods.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Food Options</p>
                                                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                        {foods.map(food => (
                                                            <li key={food} className="flex items-center gap-2 text-sm">
                                                                <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 text-[#239ddb] shrink-0" />
                                                                <span className="text-gray-700">{food}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {teamImages.length > 0 && (
                                        <div className="mt-6">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Our Team</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {teamImages.map((url, i) => {
                                                const caption = mediaCaptions[url];
                                                return (
                                                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200">
                                                        <img src={url} alt={caption || `Team member ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                                        {caption && (
                                                            <div className="absolute bottom-0 left-0 right-0 px-[15px]">
                                                                <div className="rounded-t-md bg-[#f0f8fc] px-2 py-1 text-xs text-gray-800 font-medium text-center truncate">
                                                                    {caption}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        </div>
                                    )}
                                </div>
                                </DiagonalReveal>
                            );
                        })()}

                        {/* Room Details */}
                        {home.roomDetails && (
                            <RoomDetailsSection
                                roomDetails={home.roomDetails}
                                categories={categories}
                                definitions={definitions.filter(d => d.slug !== 'floor-level')}
                                targetType="home"
                                sectionFilter="room_details"
                                sectionTitle="Room Features"
                                sectionIcon={faBed}
                                hideFixedFields
                                columns={3}
                                labelAboveFieldSlugs={['bed-size', 'pets-allowed']}
                                className="px-6"
                            />
                        )}

                        {/* Description */}
                        {home.description && (
                            <section aria-labelledby="about-heading">
                                <h2 id="about-heading" className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                        <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 text-white" />
                                    </span>
                                    About This Home
                                </h2>
                                <div
                                    className="prose prose-sm prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-xs prose-headings:mb-2 prose-p:text-gray-700 prose-p:leading-relaxed prose-ul:pl-5 prose-li:text-gray-700 prose-strong:text-gray-900"
                                    dangerouslySetInnerHTML={{ __html: home.description }}
                                />
                            </section>
                        )}

                        {/* Cuisine / Dining Gallery */}
                        {(home.cuisineImages || []).length > 0 && (
                            <div className="bg-[#f0f8fc] rounded-xl p-6">
                                <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                        <FontAwesomeIcon icon={faUtensils} className="h-4 w-4 text-white" />
                                    </span>
                                    Dining &amp; Cuisine
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {(home.cuisineImages || []).map((url, i) => {
                                        const caption = mediaCaptions[url];
                                        return (
                                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200">
                                                <img src={url} alt={caption || `Cuisine ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                                {caption && (
                                                    <div className="absolute bottom-0 left-0 right-0 px-[15px]">
                                                        <div className="rounded-t-md bg-[#f0f8fc] px-2 py-1 text-xs text-gray-800 font-medium text-center truncate">
                                                            {caption}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* Pagination */}
                        {(adjacent.prev || adjacent.next) && (
                            <div className="pt-1 pb-1 flex items-center justify-between gap-4">
                                <div>
                                    {adjacent.prev ? (
                                        <Link href={`/homes/${adjacent.prev.slug}`} className="group flex items-center gap-2 text-left">
                                            <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4 text-[#239ddb] shrink-0" />
                                            <div>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Previous Home</span>
                                                <span className="text-sm font-bold text-[#239ddb] group-hover:underline line-clamp-1">{adjacent.prev.title}</span>
                                            </div>
                                        </Link>
                                    ) : <div />}
                                </div>
                                <div className="text-right">
                                    {adjacent.next ? (
                                        <Link href={`/homes/${adjacent.next.slug}`} className="group flex items-center gap-2 text-right justify-end">
                                            <div>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Next Home</span>
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
                    <aside className="hidden lg:block space-y-6">
                        {/* CTA Buttons */}
                        <EntityCTAButtons entityName={home.title} entityType="home" />


                        {/* Location Details sidebar */}
                        <div className="bg-gray-100 rounded-xl p-5">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                    <FontAwesomeIcon icon={faHouse} className="h-4 w-4 text-white" />
                                </span>
                                Home Details
                            </h2>
                            <div className="space-y-4">
                                {(home.roomDetails?.bedroomType || floorLevel) && (
                                    <div className="grid grid-cols-2 gap-x-4">
                                        {home.roomDetails?.bedroomType && (
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Bedroom Type</p>
                                                <p className="text-sm text-gray-900">{home.roomDetails.bedroomType}</p>
                                            </div>
                                        )}
                                        {floorLevel && (
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Floor Level</p>
                                                <p className="text-sm text-gray-900">{floorLevel}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {(home.roomDetails?.bathroomType || home.roomDetails?.showerType) && (
                                    <div className="grid grid-cols-2 gap-x-4">
                                        {home.roomDetails?.bathroomType && (
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Bathroom Type</p>
                                                <p className="text-sm text-gray-900">{home.roomDetails.bathroomType}</p>
                                            </div>
                                        )}
                                        {home.roomDetails?.showerType && (
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Shower Type</p>
                                                <p className="text-sm text-gray-900">{home.roomDetails.showerType}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {home.roomDetails && (
                                    <RoomDetailsSection
                                        roomDetails={home.roomDetails}
                                        categories={categories}
                                        definitions={definitions}
                                        targetType="home"
                                        sectionFilter="location_details"
                                        hideFixedFields
                                    />
                                )}
                                {hasAddress && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Address</p>
                                        {addr.street && <p className="text-sm text-gray-900">{addr.street}</p>}
                                        <p className="text-sm text-gray-900">{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
                                    </div>
                                )}
                                {hasAddress && (
                                    <iframe
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent([addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', '))}&output=embed`}
                                        className="w-full h-48 rounded-lg border-0 mt-2"
                                        loading="lazy"
                                        allowFullScreen
                                    />
                                )}
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Featured Homes */}
                {featuredHomes.length > 0 && (
                    <section aria-labelledby="featured-homes-heading" className="mt-10 mb-8">
                        <h2 id="featured-homes-heading" className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faHouse} className="h-4 w-4 text-white" />
                            </span>
                            Featured Homes
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {featuredHomes.map(item => (
                                <Link key={item.slug} href={`/homes/${item.slug}`} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden block">
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                            loading="lazy"
                                        />
                                    )}
                                    {item.featuredLabel && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                            <div className="bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-b-lg">
                                                {item.featuredLabel}
                                            </div>
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 px-[15px]">
                                        <div className="rounded-t-md bg-white px-2 py-1 text-xs text-gray-800 font-medium text-center truncate">
                                            {item.title}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Disclaimer Notice */}
                <div className="mt-10 mb-4 bg-gray-100 rounded-xl px-6 py-5 text-xs text-gray-500 leading-relaxed space-y-3">
                    <p>The features and amenities displayed on this page contain marketing information provided by the facility. Elite CareFinders does our best to confirm the completeness of the provided information, but cannot guarantee its accuracy. If you become aware of any information that should be updated or noted, please contact us: <a href="mailto:info@elitecarefinders.com" className="text-[#239ddb] hover:underline">info@elitecarefinders.com</a>.</p>
                    <p>Elite CareFinders is paid by our participating facilities, therefore our service is offered at no charge to families. Home listings are private paid/out of pocket. We do not work with Medicaid.</p>
                    <p className="font-semibold text-gray-600">Note: Availability of beds fluctuate on a daily basis.</p>
                </div>

            </article>
        </>
    );
}
