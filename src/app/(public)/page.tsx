import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowRight, faStar, faTrophy, faHouse, faBuilding, faPhone, faEnvelope,
} from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faXTwitter, faLinkedinIn, faPinterestP, faYoutube, faTiktok, faThreads } from '@fortawesome/free-brands-svg-icons';
import { TestimonialsWidget } from '@/components/public/TestimonialsWidget';
import { VideoCarousel } from '@/components/public/VideoCarousel';
import { VideoTestimonialsSection } from '@/components/public/VideoTestimonialsSection';
import { getHomeListings, getHomeOfMonth, getTaxonomyEntriesByIds, getFeaturedVideoItems, getHawaiiNeighborhoodsGrouped, getHomepageSections, getFacilityListings, getSocialAccountsPublic, getVideoTestimonials, getHomepageSeoSetting, getLocationChildEntriesWithCounts, getBrowseNavTypes, getPublicFixedFieldOptions } from '@/lib/public-db';
import { NEIGHBORHOOD_COORDS } from '@/lib/neighborhood-coords';
import type { NeighborhoodPin } from '@/components/public/NeighborhoodMap';
import { getHomepageSeo } from '@/lib/services/siteSettingsService';
import { buildHomepageJsonLd } from '@/lib/seo';
import type { PublicSocialAccount } from '@/lib/public-db';
import type { FacilityListingCard } from '@/lib/public-db';
import type { HomeOfMonth } from '@/lib/public-db';
import { HomepageWizard } from '@/components/public/HomepageWizard';
import { JoinNetworkCTA } from '@/components/public/JoinNetworkCTA';
import { MobileShareButton } from '@/components/public/MobileShareButton';

const R2 = 'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site';

const PHONE_HREF = 'tel:+18084454111';

export const dynamic = 'force-dynamic';

const HOMEPAGE_DEFAULTS = {
    title: "Hawaii's Most Trusted Senior Living Advisors | Elite CareFinders",
    description: 'Free RN-led consultation to help Hawaii families find trusted senior care homes and communities on Oahu, Maui, Kauai, and the Big Island. Expert guidance every step of the way.',
};

export async function generateMetadata(): Promise<Metadata> {
    const seo = await getHomepageSeoSetting();
    const title = seo.metaTitle || HOMEPAGE_DEFAULTS.title;
    const description = seo.metaDescription || HOMEPAGE_DEFAULTS.description;
    return {
        title,
        description,
        ...(seo.canonicalUrl && { alternates: { canonical: seo.canonicalUrl } }),
        openGraph: {
            title: seo.ogTitle || title,
            description: seo.ogDescription || description,
            images: [seo.ogImageUrl || `${R2}/ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled.webp`],
        },
    };
}


const HERO_AWARDS = [
    {
        src: `${R2}/Award-SEO-Views-Innovator-of-the-Year-2025.webp`,
        alt: 'SEO Views — Innovator of the Year 2025',
        href: 'https://theceoviews.com/elite-carefinders-enhancing-senior-living-experience-with-personalized-consultation/',
    },
    {
        src: `${R2}/Award-ElderCare-Review-Senior-Placement-Company-of-the-Year-2025.webp`,
        alt: 'ElderCare Review — Senior Placement Company of the Year 2025',
        href: 'https://www.eldercarereview.com/elite-carefinders',
    },
    {
        src: `${R2}/Award-ElderCare-Review-Senior-Living-Advisory-Services-Provider-2025.webp`,
        alt: 'ElderCare Review — Senior Living Advisory Services Provider 2025',
        href: 'https://senior-living-solutions.eldercarereview.com/vendor/elite-carefinders-elite-solutions-for-loved-ones-cid-91-mid-14.html',
    },
];

const CARE_TYPES = [
    'Care Homes',
    'Adult Foster Homes',
    'Independent, Assisted Living and Memory Care',
    'Nursing Facilities',
    'Adult Day Care',
    'In-home care',
];

const FEATURES = [
    { title: 'FREE personalized consultation', titleSize: 20, desc: 'Contact us for a one-on-one consultation to discuss your unique needs and what we can do to help.' },
    { title: 'Professional assessment with a Registered Nurse (RN)', titleSize: 18, desc: 'Our Registered Nurse (RN) Senior Care Advisor will visit you and your loved one at home or virtually to determine the right type of care or service your loved one needs.' },
    { title: 'Network of quality evaluated care providers', titleSize: 18, desc: 'We will match your unique needs to quality senior care homes and services from our extensive network of quality Care Providers.' },
    { title: 'Unique concierge service & tours', titleSize: 18, desc: 'Experience a personalized concierge service to escort you while touring the care homes or facilities.' },
    { title: 'Assistance with paperwork & placement', titleSize: 18, desc: 'We assist with the required paperwork and placement into a new home.' },
    { title: 'Move-in guidance', titleSize: 18, desc: 'We help to coordinate the moving in process to ensure a smooth transition.' },
];

const SOCIAL_ICON_MAP: Record<string, typeof faFacebookF> = {
    facebook: faFacebookF,
    instagram: faInstagram,
    x: faXTwitter,
    linkedin: faLinkedinIn,
    pinterest: faPinterestP,
    youtube: faYoutube,
    tiktok: faTiktok,
    threads: faThreads,
    phone: faPhone,
    email: faEnvelope,
};

function socialHref(platform: string, url: string): string {
    if (platform === 'phone') return `tel:${url.replace(/\s+/g, '')}`;
    if (platform === 'email') return `mailto:${url}`;
    return url;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
    const [{ items: homes }, { items: facilities }, featuredVideos, hawaiiIslandsWithNeighborhoods, homeOfMonth, sections, socialAccounts, videoTestimonials, homepageSeoSettings, oahuNeighborhoodCounts, mauiNeighborhoodCounts, bigIslandNeighborhoodCounts, kauaiNeighborhoodCounts, { homeTypes, facilityTypes }, bedroomOptions, bathroomOptions, showerOptions] = await Promise.all([
        getHomeListings({ limit: 3, excludeHomeOfMonth: true }),
        getFacilityListings({ limit: 3 }),
        getFeaturedVideoItems(),
        getHawaiiNeighborhoodsGrouped(),
        getHomeOfMonth(),
        getHomepageSections(),
        getSocialAccountsPublic(),
        getVideoTestimonials(),
        getHomepageSeo(),
        getLocationChildEntriesWithCounts('oahu'),
        getLocationChildEntriesWithCounts('maui'),
        getLocationChildEntriesWithCounts('big-island'),
        getLocationChildEntriesWithCounts('kauai'),
        getBrowseNavTypes(),
        getPublicFixedFieldOptions('bedroom'),
        getPublicFixedFieldOptions('bathroom'),
        getPublicFixedFieldOptions('shower'),
    ]);

    const allIslandCounts: Record<string, typeof oahuNeighborhoodCounts> = {
        oahu: oahuNeighborhoodCounts,
        maui: mauiNeighborhoodCounts,
        'big-island': bigIslandNeighborhoodCounts,
        kauai: kauaiNeighborhoodCounts,
    };

    const searchMapPins: NeighborhoodPin[] = oahuNeighborhoodCounts
        .filter(n => (n.homes + n.facilities) > 0 && NEIGHBORHOOD_COORDS[n.slug])
        .map(n => ({ ...n, lat: NEIGHBORHOOD_COORDS[n.slug][0], lng: NEIGHBORHOOD_COORDS[n.slug][1] }));

    const homepageJsonLd = buildHomepageJsonLd({
        socialAccounts,
        schemaJsonOverride: homepageSeoSettings.schemaJson ?? null,
    });
    const allEntryIds = [...new Set([
        ...homes.flatMap((h: any) => h.taxonomyEntryIds as string[]),
        ...(homeOfMonth?.taxonomyEntryIds ?? []),
    ])];
    const allTaxEntries = allEntryIds.length > 0 ? await getTaxonomyEntriesByIds(allEntryIds) : [];
    const typeNameMap = new Map<string, string>();
    homes.forEach((home: any) => {
        const te = home.taxonomyEntryIds
            .map((id: string) => allTaxEntries.find((e: any) => e.id === id))
            .find((e: any) => e?.taxonomySlug !== 'location');
        if (te) typeNameMap.set(home.id, (te as any).name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    let homeOfMonthTypeName = '';
    let homeOfMonthLocationNames: string[] = [];
    if (homeOfMonth) {
        const hotmEntries = homeOfMonth.taxonomyEntryIds
            .map((id: string) => allTaxEntries.find((e: any) => e.id === id))
            .filter(Boolean) as any[];
        const typeEntry = hotmEntries.find((e: any) => e?.taxonomySlug !== 'location');
        if (typeEntry) homeOfMonthTypeName = typeEntry.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
        homeOfMonthLocationNames = hotmEntries
            .filter((e: any) => e?.taxonomySlug === 'location')
            .flatMap((e: any) => e.ancestorNames ?? [e.name])
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    }

    const videoItems = featuredVideos.slice(0, 8);

    const sectionComponents: Record<string, React.ReactNode> = {
        'hero': <HeroSection key="hero" />,
        'page-title': <PageTitleSection key="page-title" />,
        'videos': <VideoCarousel key="videos" items={videoItems} />,
        'featured-homes': <FeaturedHomesSection key="featured-homes" homes={homes} typeNameMap={typeNameMap} />,
        'featured-facilities': <FeaturedFacilitiesSection key="featured-facilities" facilities={facilities} />,
        'home-of-month': homeOfMonth ? (
            <HomeOfMonthSection
                key="home-of-month"
                home={homeOfMonth}
                typeName={homeOfMonthTypeName}
                locationNames={homeOfMonthLocationNames}
            />
        ) : null,
        'search': <HomepageWizard key="search" islands={hawaiiIslandsWithNeighborhoods} islandCounts={allIslandCounts} mapPins={searchMapPins} homeTypes={homeTypes} facilityTypes={facilityTypes} bedroomOptions={bedroomOptions} bathroomOptions={bathroomOptions} showerOptions={showerOptions} />,
        'about': <AboutSection key="about" />,
        'content': <ContentSection key="content" />,
        'testimonials': <TestimonialsWidget key="testimonials" />,
        'video-testimonials': videoTestimonials.length > 0 ? <VideoTestimonialsSection key="video-testimonials" testimonials={videoTestimonials} /> : null,
        'cta': <BlueCTASection key="cta" />,
        'elite-standard': <EliteStandardSection key="elite-standard" />,
        'join-network': <JoinNetworkCTA key="join-network" />,
    };

    return (
        <>
            {homepageJsonLd.map((schema, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ))}
            {/* Mobile-only social + share bar — not part of section ordering */}
            <div className="sm:hidden max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {socialAccounts.map((account: PublicSocialAccount) => {
                        const icon = SOCIAL_ICON_MAP[account.platform];
                        if (!icon) return null;
                        return (
                            <a
                                key={account.id}
                                href={socialHref(account.platform, account.url)}
                                target={account.platform === 'phone' || account.platform === 'email' ? undefined : '_blank'}
                                rel={account.platform === 'phone' || account.platform === 'email' ? undefined : 'noopener noreferrer'}
                                aria-label={account.platform}
                                className="flex items-center justify-center w-8 h-8 rounded-md border-2 border-gray-200 text-gray-400 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                            >
                                <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                            </a>
                        );
                    })}
                </div>
                <MobileShareButton />
            </div>

            {sections
                .filter(s => s.visible)
                .map(s => sectionComponents[s.id] ?? null)
            }
        </>
    );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
    return (
        <section className="max-w-6xl mx-auto px-5 sm:pt-8">
            {/* Blue header bar */}
            <h1
                className="bg-[#239ddb] text-white text-center py-3 m-0 rounded-t-2xl text-[33px] sm:text-[44px]"
                style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, lineHeight: 1.2 }}
            >
                Quality Senior Care in Hawaii
            </h1>

            {/* Image with overlays */}
            <div className="relative overflow-hidden bg-gray-200 rounded-b-2xl h-[340px] sm:h-[680px]">
                <Image
                    src={`${R2}/ECF_Rose-couple-consultation-edited-by-Rose_02.17.25_RG-scaled.webp`}
                    alt="Senior care advisor consulting with a family about Hawaii senior care placement options"
                    fill
                    className="object-cover object-center"
                    priority
                    sizes="(max-width: 1280px) 100vw, 1152px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                {/* Text — bottom left */}
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-7" style={{ textAlign: 'left', lineHeight: 1 }} role="text" aria-label="Going beyond to find the care your loved one deserves">
                    <p
                        className="text-white m-0 text-[44px] sm:text-[clamp(36px,5vw,75px)]"
                        style={{
                            fontFamily: 'var(--font-alex-brush)',
                            lineHeight: 0.95,
                            textShadow: 'rgba(25, 27, 33, 0.6) 2px 0px 15px',
                        }}
                    >
                        Going beyond
                    </p>
                    <p
                        className="text-white m-0 text-[24px] sm:text-[clamp(20px,3vw,45px)]"
                        style={{
                            fontFamily: 'var(--font-montserrat)',
                            lineHeight: 1,
                            fontWeight: 400,
                            textShadow: 'rgba(25, 27, 33, 0.6) 2px 0px 15px',
                        }}
                    >
                        to find the <strong>care</strong>
                    </p>
                    <p
                        className="text-white m-0 text-[24px] sm:text-[clamp(20px,3vw,45px)]"
                        style={{
                            fontFamily: 'var(--font-montserrat)',
                            lineHeight: 1,
                            fontWeight: 400,
                            textShadow: 'rgba(25, 27, 33, 0.6) 2px 0px 15px',
                        }}
                    >
                        your loved one
                    </p>
                    <p
                        className="text-white m-0 text-[44px] sm:text-[clamp(36px,5vw,75px)]"
                        style={{
                            fontFamily: 'var(--font-alex-brush)',
                            lineHeight: 1,
                            textShadow: 'rgba(25, 27, 33, 0.6) 2px 0px 20px',
                        }}
                    >
                        deserves.
                    </p>
                </div>

                {/* Awards — bottom right, desktop only */}
                <div className="hidden sm:flex sm:absolute bottom-4 right-0 sm:bottom-6 w-1/2 flex-col items-center gap-1 pr-3 sm:pr-5">
                    <div className="flex gap-2 sm:gap-3 w-full">
                        {HERO_AWARDS.map(award => (
                            <a
                                key={award.alt}
                                href={award.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 transition-transform duration-200 hover:scale-105"
                            >
                                <div className="aspect-square bg-white rounded-full shadow-md flex items-center justify-center p-[8%]">
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={award.src}
                                            alt={award.alt}
                                            fill
                                            className="object-contain"
                                            sizes="(max-width: 640px) 28vw, (max-width: 1024px) 18vw, 180px"
                                        />
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                    <p className="text-white/80 text-[7px] sm:text-[8px] font-bold uppercase tracking-widest text-center m-0">
                        Click the logos above to read about the awards
                    </p>
                </div>
            </div>

            {/* Awards — mobile only, below image */}
            <div className="sm:hidden bg-white pt-4 pb-2 px-3">
                <div className="flex gap-3 justify-center">
                    {HERO_AWARDS.map(award => (
                        <a
                            key={award.alt}
                            href={award.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 max-w-[110px] transition-transform duration-200 hover:scale-105"
                        >
                            <div className="aspect-square bg-white rounded-full flex items-center justify-center p-[8%] border border-gray-100">
                                <div className="relative w-full h-full">
                                    <Image
                                        src={award.src}
                                        alt={award.alt}
                                        fill
                                        className="object-contain"
                                        sizes="28vw"
                                    />
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
                <p className="text-gray-400 text-[8px] font-bold uppercase tracking-widest text-center mt-2 mb-0">
                    Click the logos above to read about the awards
                </p>
            </div>

        </section>
    );
}

// ── Page Title ─────────────────────────────────────────────────────────────────

function PageTitleSection() {
    return (
        <div className="max-w-6xl mx-auto px-5 text-center py-6 md:py-8">
            <p className="text-gray-700 text-xl md:text-2xl mb-2">
                Finding care for your loved one is difficult and frustrating.
            </p>
            <h2 className="m-0" style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 200, lineHeight: 1.1, letterSpacing: '-0.3px', color: '#239ddb' }}>
                We make finding senior care in Hawaii easy!
            </h2>
        </div>
    );
}

// ── Home of the Month ─────────────────────────────────────────────────────────

function HomeOfMonthSection({ home, typeName, locationNames }: {
    home: HomeOfMonth;
    typeName: string;
    locationNames: string[];
}) {
    const description = (home.homeOfMonthDescription || home.description).replace(/<[^>]*>/g, '').trim();
    const thumbs = home.images.slice(1, 5);
    const remaining = home.images.length - 5;

    return (
        <section className="max-w-6xl mx-auto px-5 py-8">
            <Link
                href={`/homes/${home.slug}`}
                className="group block bg-amber-50 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
            >
                {/* Image gallery grid */}
                <div className="flex flex-col md:flex-row gap-1 md:h-[440px]">
                    {/* Main image */}
                    <div className="relative w-full md:w-1/2 shrink-0 overflow-hidden bg-gray-200 aspect-square md:aspect-auto">
                        {home.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={home.images[0]}
                                alt={home.title}
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <FontAwesomeIcon icon={faHouse} className="h-16 w-16" />
                            </div>
                        )}
                        {/* Badge */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2">
                            <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-b-lg shadow">
                                <FontAwesomeIcon icon={faTrophy} className="h-2.5 w-2.5" />
                                Home of the Month
                            </span>
                        </div>
                    </div>

                    {/* Thumbnails 2×2 */}
                    {thumbs.length > 0 && (
                        <div className="md:flex-1 grid grid-cols-4 md:grid-cols-2 gap-1 md:[grid-template-rows:1fr_1fr]">
                            {thumbs.map((img, i) => (
                                <div key={i} className="relative overflow-hidden bg-gray-200 aspect-square md:aspect-auto">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={img}
                                        alt={`${home.title} photo ${i + 2}`}
                                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                                        loading="lazy"
                                    />
                                    {i === 3 && remaining > 0 && (
                                        <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white gap-1.5">
                                            <span className="text-3xl font-bold leading-none">+{remaining}</span>
                                            <span className="text-[10px] font-semibold uppercase tracking-widest opacity-75">more photos</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="p-5">
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1.5 group-hover:text-[#239ddb] transition-colors">{home.title}</h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                        {typeName && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb]">{typeName}</span>
                        )}
                        {locationNames.length > 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{locationNames.join(' · ')}</span>
                        )}
                    </div>
                    {description && (
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#239ddb] transition-colors">
                        Explore this Home
                        <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
                    </div>
                </div>
            </Link>
        </section>
    );
}

// ── Featured Homes ────────────────────────────────────────────────────────────

function FeaturedHomesSection({ homes, typeNameMap }: { homes: any[]; typeNameMap: Map<string, string> }) {
    return (
        <section>
            <div className="max-w-6xl mx-auto px-5 py-16">
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Browse Featured</p>
                        <h2 className="text-3xl font-bold text-gray-900">Care Homes &amp; Foster Homes</h2>
                    </div>
                    <Link
                        href="/homes"
                        className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors"
                    >
                        View All Homes <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                    </Link>
                </div>
                <div className="mb-8 sm:hidden">
                    <Link
                        href="/homes"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors"
                    >
                        View All Homes <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {homes.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FontAwesomeIcon icon={faHouse} className="h-10 w-10 mb-3 opacity-30" />
                        <p>No featured homes at this time.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {homes.map((home: any) => {
                            const imgSrc = home.image
                                ? (home.image.startsWith('/images/media/')
                                    ? home.image.replace(/(\.[^.]+)$/, '-500x500.webp')
                                    : home.image)
                                : null;
                            return (
                                <Link
                                    key={home.id}
                                    href={`/homes/${home.slug}`}
                                    className={`group flex flex-col rounded-2xl overflow-hidden hover:shadow-md transition-shadow ${home.isHomeOfMonth ? 'bg-amber-50' : home.isFeatured ? 'bg-green-50' : 'bg-gray-100'}`}
                                >
                                    <div className={`relative h-48 flex-shrink-0 ${home.isHomeOfMonth ? 'bg-amber-50' : home.isFeatured ? 'bg-green-50' : 'bg-gray-100'}`}>
                                        {imgSrc ? (
                                            <Image
                                                src={imgSrc}
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
                                        <h3 className="text-base font-bold text-gray-900 leading-snug mb-1 group-hover:text-[#239ddb] transition-colors">
                                            {home.title}
                                        </h3>
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
                                            <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

            </div>
        </section>
    );
}

// ── Featured Facilities ────────────────────────────────────────────────────────

function FeaturedFacilitiesSection({ facilities }: { facilities: FacilityListingCard[] }) {
    return (
        <section>
            <div className="max-w-6xl mx-auto px-5 py-16">
                <div className="flex items-end justify-between mb-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Browse Featured</p>
                        <h2 className="text-3xl font-bold text-gray-900">Senior Living Communities</h2>
                    </div>
                    <Link
                        href="/facilities"
                        className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors"
                    >
                        View All Communities <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                    </Link>
                </div>
                <div className="mb-8 sm:hidden">
                    <Link
                        href="/facilities"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold bg-[#239ddb] text-white rounded-lg px-4 py-2 hover:bg-[#1a7fb8] transition-colors"
                    >
                        View All Communities <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                    </Link>
                </div>

                {facilities.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FontAwesomeIcon icon={faBuilding} className="h-10 w-10 mb-3 opacity-30" />
                        <p>No featured communities at this time.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {facilities.map((facility) => {
                            const imgSrc = facility.image
                                ? (facility.image.startsWith('/images/media/')
                                    ? facility.image.replace(/(\.[^.]+)$/, '-500x500.webp')
                                    : facility.image)
                                : null;
                            return (
                                <Link
                                    key={facility.id}
                                    href={`/facilities/${facility.slug}`}
                                    className={`group flex flex-col rounded-2xl overflow-hidden hover:shadow-md transition-shadow ${facility.isFacilityOfMonth ? 'bg-amber-50' : facility.isFeatured ? 'bg-green-50' : 'bg-gray-100'}`}
                                >
                                    <div className={`relative h-48 flex-shrink-0 ${facility.isFacilityOfMonth ? 'bg-amber-50' : facility.isFeatured ? 'bg-green-50' : 'bg-gray-100'}`}>
                                        {imgSrc ? (
                                            <Image
                                                src={imgSrc}
                                                alt={facility.title}
                                                fill
                                                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                <FontAwesomeIcon icon={faBuilding} className="h-12 w-12" />
                                            </div>
                                        )}
                                        {(facility.isFacilityOfMonth || facility.isFeatured) && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                                {facility.isFacilityOfMonth ? (
                                                    <span className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-b-lg shadow">
                                                        <FontAwesomeIcon icon={faTrophy} className="h-2.5 w-2.5" />
                                                        Facility of the Month
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
                                        <h3 className="text-base font-bold text-gray-900 leading-snug mb-1 group-hover:text-[#239ddb] transition-colors">
                                            {facility.title}
                                        </h3>
                                        {facility.description && (
                                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1">
                                                {facility.description.replace(/<[^>]*>/g, '').trim()}
                                            </p>
                                        )}
                                        <div className="mt-auto pt-3 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#239ddb] transition-colors">
                                            Learn More
                                            <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

            </div>
        </section>
    );
}

// ── Content ───────────────────────────────────────────────────────────────────

const ECF_ICON = 'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-1.svg';
const ECF_ICON_WHITE = 'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-2.svg';

const ELITE_STANDARDS = [
    { title: 'Caring', desc: 'The caregivers in our network are caring.' },
    { title: 'Competent', desc: 'Our caregivers are licensed AND provide individualized care. They also provide the clients\' preferences to food, activities and socialization, and daily exercise.' },
    { title: 'Compassionate', desc: 'Our caregivers are compassionate.' },
    { title: 'Comfortable', desc: 'The homes are clean, comfortable and with appropriate furnishings.' },
];

function ContentSection() {
    return (
        <section className="max-w-6xl mx-auto px-5 py-12">
            {/* Partners image — mobile: above section content */}
            <div className="flex flex-col items-center mb-6 lg:hidden">
                <img
                    src="https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-2025.png"
                    alt="Senior Living Community Partners"
                    className="max-w-full h-auto"
                />
                <span
                    className="mt-2 text-center text-gray-600 font-medium"
                    style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(11px, 1.2vw, 14px)' }}
                >
                    Senior Living Community Partners
                </span>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 mb-[30px] lg:mb-0">

                {/* Left column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center bg-gray-100 rounded-2xl p-5 lg:bg-transparent lg:rounded-none lg:p-0">
                    {/* Partners image — desktop: inside left column */}
                    <div className="hidden lg:flex flex-col items-center mb-6 lg:pr-8">
                        <img
                            src="https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-2025.png"
                            alt="Senior Living Community Partners"
                            className="max-w-full h-auto"
                        />
                        <span
                            className="mt-2 text-center text-gray-600 font-medium"
                            style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(11px, 1.2vw, 14px)' }}
                        >
                            Senior Living Community Partners
                        </span>
                    </div>
                    <h2
                        className="text-[#239ddb] text-center mb-6 lg:pr-8 font-bold lg:font-extralight"
                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(22px, 2.5vw, 32px)', lineHeight: 1.1, letterSpacing: '-0.3px' }}
                    >
                        Your no-cost senior care placement experts in Hawaii
                    </h2>

                    <p
                        className="mb-6 lg:pr-8"
                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(16px, 1.7vw, 24px)', fontWeight: 400, lineHeight: 1.3, textAlign: 'justify', color: '#191b21' }}
                    >
                        Finding care for your loved one can be difficult and complex. Our <strong>FREE</strong> consultation makes it simple. We have decades of experience, ready to assist you from beginning to end.
                    </p>

                    {/* Inner 2-col: care types + specialization — blue card */}
                    <div className="flex flex-col sm:flex-row gap-8 mb-10 bg-[#239ddb] rounded-2xl lg:rounded-r-none p-6">
                        <div className="flex-1">
                            <h3
                                className="font-semibold mb-3"
                                style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(15px, 1.5vw, 20px)', lineHeight: 1.2, color: '#fff' }}
                            >
                                Let us help you find the care your loved one needs and deserves.
                            </h3>
                            <ul
                                className="space-y-1 list-disc pl-5"
                                style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(14px, 1.4vw, 20px)', fontWeight: 400, lineHeight: 1.2, color: '#fff' }}
                            >
                                {CARE_TYPES.map(t => <li key={t}>{t}</li>)}
                            </ul>
                        </div>
                        <div className="flex-1 flex items-center">
                            <p
                                className="font-semibold"
                                style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(15px, 1.7vw, 24px)', lineHeight: 1.2, color: '#fff' }}
                            >
                                We specialize in senior care placement while providing an innovative, quick and easy way to search for a home.
                            </p>
                        </div>
                    </div>

                    {/* Free services CTA */}
                    <div className="text-center lg:pr-8">
                        <p
                            className="mb-2"
                            style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(15px, 1.7vw, 24px)', fontWeight: 400, lineHeight: 1.3, color: '#191b21' }}
                        >
                            Our services are <strong>FREE</strong> to seniors and their families because we are paid by our large community network.
                        </p>
                        <div className="bg-gray-100 rounded-xl px-6 py-4 mt-2">
                            <p
                                className="font-bold mb-1"
                                style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(15px, 1.7vw, 24px)', lineHeight: 1.3, color: '#191b21' }}
                            >
                                Please contact us with any questions:
                            </p>
                            <a
                                href={PHONE_HREF}
                                className="font-bold hover:text-[#239ddb] transition-colors"
                                style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(22px, 2.5vw, 33px)', color: '#191b21' }}
                            >
                                808-445-4111
                            </a>
                        </div>
                    </div>
                </div>

                {/* Right column: services image + features */}
                <div className="w-full lg:w-[44%] flex-shrink-0 rounded-2xl overflow-hidden bg-white lg:bg-gray-100 shadow-[0_40px_50px_-10px_rgba(0,0,0,0.18),0_16px_20px_-12px_rgba(0,0,0,0.15)]">
                    <div className="relative w-full rounded-t-2xl overflow-hidden mb-6" style={{ aspectRatio: '16/9' }}>
                        <Image
                            src="https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-5.webp"
                            alt="Elite CareFinders senior care placement services for Hawaii families"
                            fill
                            className="object-cover object-center"
                            sizes="(max-width: 1024px) 100vw, 44vw"
                        />
                    </div>

                    <div className="px-6 pb-6">
                        <h2
                            className="text-center mb-6"
                            style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(18px, 1.8vw, 25px)', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.5px', color: '#239ddb', paddingLeft: '30px', paddingRight: '30px' }}
                        >
                            Experience a higher level of service with Elite
                        </h2>

                        <div className="space-y-5">
                            {FEATURES.map(f => (
                                <div key={f.title} className="flex gap-3 items-start">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={ECF_ICON} alt="" className="w-8 h-8 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3
                                            className="font-medium m-0"
                                            style={{ fontFamily: 'var(--font-montserrat)', fontSize: `${f.titleSize}px`, lineHeight: 1.2, color: '#191b21' }}
                                        >
                                            {f.title}
                                        </h3>
                                        <p
                                            className="m-0"
                                            style={{ fontFamily: 'var(--font-montserrat)', fontSize: '16px', fontWeight: 400, lineHeight: 1.4, color: '#737373' }}
                                        >
                                            {f.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}

// ── Blue CTA ──────────────────────────────────────────────────────────────────

function BlueCTASection() {
    return (
        <section className="max-w-6xl mx-auto px-5 py-8">
            <div
                className="relative overflow-hidden rounded-2xl p-[40px] flex flex-col sm:flex-row items-center gap-8"
                style={{ backgroundColor: '#239ddb' }}
            >
                {/* Hibiscus background */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site/hibiscus-bg2.svg"
                    alt=""
                    aria-hidden="true"
                    className="absolute right-0 bottom-0 w-2/3 h-auto pointer-events-none"
                    style={{ opacity: 0.35 }}
                />
                {/* Left: ECF white icon */}
                <div className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ECF_ICON_WHITE} alt="Elite CareFinders" className="w-32 h-32 sm:w-44 sm:h-44" />
                </div>

                {/* Right: text block */}
                <div className="flex-1 text-center">
                    <p
                        className="text-white mb-4"
                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(30px, 3.75vw, 48px)', fontWeight: 200, lineHeight: 1.1, letterSpacing: '-1.5px' }}
                    >
                        We assist you through the entire process to find the right care for you, from beginning to end.
                    </p>
                    <p
                        className="text-white font-semibold uppercase mb-3"
                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(13px, 1.4vw, 17px)', letterSpacing: '1px' }}
                    >
                        GET A FREE CONSULTATION TODAY
                    </p>
                    <a
                        href={PHONE_HREF}
                        className="text-white hover:text-white/80 transition-colors"
                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(28px, 3.5vw, 46px)', fontWeight: 500, display: 'block' }}
                    >
                        808-445-4111
                    </a>
                </div>
            </div>
        </section>
    );
}

// ── Elite Standard ────────────────────────────────────────────────────────────

function EliteStandardSection() {
    return (
        <section className="max-w-6xl mx-auto px-5 py-16">
            <h2
                className="text-center mb-3"
                style={{ fontFamily: 'var(--font-montserrat)', fontSize: '41px', fontWeight: 600, letterSpacing: '-1.5px', color: '#239ddb' }}
            >
                The Elite Standard
            </h2>
            <h4
                className="text-center mb-10"
                style={{ fontFamily: 'var(--font-montserrat)', fontSize: '18px', fontWeight: 500, lineHeight: 1.4, color: '#191b21' }}
            >
                Elite CareFinders applies four standards to select senior care providers across Hawaii for our trusted network.
            </h4>
            <div className="flex flex-col sm:flex-row gap-8">
                {[ELITE_STANDARDS.slice(0, 2), ELITE_STANDARDS.slice(2)].map((col, ci) => (
                    <div key={ci} className="flex-1 flex flex-col gap-[38px]">
                        {col.map(s => (
                            <div key={s.title} className="flex gap-4 items-start">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={ECF_ICON} alt="" className="w-10 h-10 flex-shrink-0 mt-1" />
                                <div>
                                    <h4
                                        className="font-semibold mb-1"
                                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: '20px', lineHeight: 1.2, color: '#191b21' }}
                                    >
                                        {s.title}
                                    </h4>
                                    <p
                                        className="m-0"
                                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: '16px', fontWeight: 400, lineHeight: 1.5, color: '#737373' }}
                                    >
                                        {s.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}

// ── About ─────────────────────────────────────────────────────────────────────

function AboutSection() {
    return (
        <section className="max-w-6xl mx-auto px-5 py-8">
            <div className="bg-gray-100 rounded-2xl p-5 flex flex-col gap-5">

                {/* Text */}
                <div>
                    <p
                        className="mb-1 text-center lg:text-left"
                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: '20px', fontWeight: 500, color: '#191b21' }}
                    >
                        About Elite CareFinders
                    </p>
                    <p
                        className="m-0"
                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: '16px', fontWeight: 400, lineHeight: 1.35, letterSpacing: '-0.1px', textAlign: 'justify', color: 'rgba(25,27,33,0.7)' }}
                    >
                        Elite CareFinders, founded by <em>Rose Gallego, RN, BSN, RAC-CT</em>, connects families with trusted senior care options across Hawaii, streamlining the search with personal concierge style service. With 27+ years of healthcare experience and national certification in long-term care quality, Rose leads this <strong>multiple national award-winning Senior Placement Company</strong> with clinical precision and heartfelt dedication. Elite CareFinders matches each client&rsquo;s needs with the most appropriate care setting, offering a curated gallery of <strong>pre-evaluated homes</strong> that lets families easily tour facilities and discover <strong>warm, home-like environments</strong>.
                    </p>
                </div>

                {/* Images: 4 in a row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Rose photo */}
                    <div className="rounded-xl bg-white shadow-sm overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/site/Rose-10-25.webp"
                            alt="Rose Guillermo Gallego RN — Founder &amp; Owner"
                            className="w-full object-cover"
                        />
                        <div className="px-2 py-1 text-center leading-[1.1]">
                            <span className="text-xs font-medium text-gray-900">Rose Guillermo Gallego RN</span>
                            <br /><span className="text-xs font-medium text-gray-900">Founder &amp; Owner</span>
                            <br /><span className="text-xs font-medium text-gray-900">Senior Care Advisor</span>
                        </div>
                    </div>

                    {/* Cover photo */}
                    <a href="https://www.eldercarereview.com/elite-carefinders" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white shadow-sm overflow-hidden block hover:shadow-md transition-shadow">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/site/Elite-CareFinders_Cover-2025a.webp"
                            alt="Senior Placement Company of the Year — Elder Care Review"
                            className="w-full object-cover"
                        />
                        <div className="px-2 py-1 leading-[1.1] flex items-end gap-1">
                            <div className="flex-1 text-center">
                                <span className="text-xs font-medium text-gray-900">Senior Placement Company of the Year</span>
                                <br /><span className="text-xs font-medium text-gray-900 italic">Elder Care Review</span>
                            </div>
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </a>

                    {/* Advisory services */}
                    <a href="https://senior-living-solutions.eldercarereview.com/vendor/elite-carefinders-elite-solutions-for-loved-ones-cid-91-mid-14.html" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white shadow-sm overflow-hidden block hover:shadow-md transition-shadow">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-6.png"
                            alt="Top Senior Living Services Provider — Elder Care Review"
                            className="w-full object-cover"
                        />
                        <div className="px-2 py-1 leading-[1.1] flex items-end gap-1">
                            <div className="flex-1 text-center">
                                <span className="text-xs font-medium text-gray-900">Top Senior Living Services Provider</span>
                                <br /><span className="text-xs font-medium text-gray-900 italic">Elder Care Review</span>
                            </div>
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </a>

                    {/* Innovator of the Year */}
                    <a href="https://theceoviews.com/elite-carefinders-enhancing-senior-living-experience-with-personalized-consultation/" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white shadow-sm overflow-hidden block hover:shadow-md transition-shadow">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-ceo-views-2024-innovator-of-the-year.png"
                            alt="Innovator of the Year — The CEO Views"
                            className="w-full object-cover"
                        />
                        <div className="px-2 py-1 leading-[1.1] flex items-end gap-1">
                            <div className="flex-1 text-center">
                                <span className="text-xs font-medium text-gray-900">Innovator of the Year</span>
                                <br /><span className="text-xs font-medium text-gray-900 italic">The CEO Views</span>
                            </div>
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </div>
                    </a>
                </div>

            </div>
        </section>
    );
}
