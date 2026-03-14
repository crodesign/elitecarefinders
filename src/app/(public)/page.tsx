import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowRight, faStar, faTrophy, faHouse,
} from '@fortawesome/free-solid-svg-icons';
import { TestimonialsWidget } from '@/components/public/TestimonialsWidget';
import { VideoCarousel } from '@/components/public/VideoCarousel';
import { JoinNetworkCTA } from '@/components/public/JoinNetworkCTA';
import { getHomeListings, getTaxonomyEntriesByIds, getFeaturedVideoItems, getLocationTopLevelEntries, getLocationChildEntries } from '@/lib/public-db';

const R2 = 'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site';

const PHONE_HREF = 'tel:+18084454111';

export const metadata: Metadata = {
    title: "Hawaii's Most Trusted Senior Living Advisors | Elite CareFinders",
    description: 'Free RN consultation to help Hawaii families find the best senior care homes and communities. Expert guidance every step of the way.',
};


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

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
    const [{ items: homes }, featuredVideos, locationStates, hawaiiIslands] = await Promise.all([
        getHomeListings({ limit: 3 }),
        getFeaturedVideoItems(),
        getLocationTopLevelEntries(),
        getLocationChildEntries('hawaii'),
    ]);
    const allEntryIds = [...new Set(homes.flatMap((h: any) => h.taxonomyEntryIds as string[]))];
    const allTaxEntries = allEntryIds.length > 0 ? await getTaxonomyEntriesByIds(allEntryIds) : [];
    const typeNameMap = new Map<string, string>();
    homes.forEach((home: any) => {
        const te = home.taxonomyEntryIds
            .map((id: string) => allTaxEntries.find((e: any) => e.id === id))
            .find((e: any) => e?.taxonomySlug !== 'location');
        if (te) typeNameMap.set(home.id, (te as any).name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });

    const videoItems = shuffleArray(featuredVideos).slice(0, 8);

    return (
        <>
            <HeroSection />
            <VideoCarousel items={videoItems} />
            <FeaturedHomesSection homes={homes} typeNameMap={typeNameMap} />
            <LocationSection states={locationStates} hawaiiIslands={hawaiiIslands} />
            <ContentSection />
            <TestimonialsWidget />
            <BlueCTASection />
            <EliteStandardSection />
            <JoinNetworkCTA />
            <AboutSection />
        </>
    );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
    return (
        <section className="max-w-6xl mx-auto px-5 pt-8">
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
                    alt="Elite CareFinders — Hawaii Senior Care Advisors"
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

            {/* Below image text */}
            <div className="text-center py-6 md:py-8">
                <p className="text-gray-700 text-xl md:text-2xl mb-2">
                    Finding care for your loved one is difficult and frustrating.
                </p>
                <h2 className="m-0" style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 200, lineHeight: 1.1, letterSpacing: '-0.3px', color: '#239ddb' }}>
                    We make finding senior care easy!
                </h2>
            </div>
        </section>
    );
}

// ── Featured Homes ────────────────────────────────────────────────────────────

function FeaturedHomesSection({ homes, typeNameMap }: { homes: any[]; typeNameMap: Map<string, string> }) {
    return (
        <section>
            <div className="max-w-6xl mx-auto px-5 py-16">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-1">Featured</p>
                        <h2 className="text-3xl font-bold text-gray-900">Care Homes &amp; Communities</h2>
                    </div>
                    <Link
                        href="/homes"
                        className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#239ddb] transition-colors"
                    >
                        View All <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
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
                                    className="group flex flex-col rounded-2xl overflow-hidden bg-gray-100 hover:shadow-md transition-shadow"
                                >
                                    <div className="relative h-48 bg-gray-100 flex-shrink-0">
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
                                        <div className="mt-3 flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-[#239ddb] transition-colors">
                                            Learn More
                                            <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                <div className="mt-8 text-center sm:hidden">
                    <Link
                        href="/homes"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#239ddb] hover:underline"
                    >
                        View all homes <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </section>
    );
}

// ── Location ──────────────────────────────────────────────────────────────────

function LocationSection({ states, hawaiiIslands }: { states: { id: string; name: string; slug: string }[]; hawaiiIslands: { id: string; name: string; slug: string }[] }) {
    const hawaii = states.find(s => s.slug === 'hawaii');
    const mainland = states.filter(s => s.slug !== 'hawaii');
    return (
        <section className="max-w-6xl mx-auto px-5 pb-4">
            <div className="bg-gray-100 rounded-2xl px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#239ddb] mb-4">Find Care by Location</p>
                <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
                    {hawaii && (
                        <div className="shrink-0">
                            <Link href="/location/hawaii" className="text-sm font-bold text-gray-800 hover:text-[#239ddb] transition-colors">
                                Hawaii
                            </Link>
                            {hawaiiIslands.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {hawaiiIslands.map(island => (
                                        <Link
                                            key={island.id}
                                            href={`/location/hawaii/${island.slug}`}
                                            className="text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                                        >
                                            {island.name}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {mainland.length > 0 && (
                        <div className="flex-1 border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-8">
                            <p className="text-sm font-bold text-gray-400 mb-2">Mainland &amp; Other States</p>
                            <div className="flex flex-wrap gap-1.5">
                                {mainland.map(state => (
                                    <Link
                                        key={state.id}
                                        href={`/location/${state.slug}`}
                                        className="text-xs text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                                    >
                                        {state.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

// ── Content ───────────────────────────────────────────────────────────────────

const ECF_ICON = 'https://www.elitecarefinders.com/wp-content/uploads/Elite-CareFinders-Icon-color.svg';
const ECF_ICON_WHITE = 'https://www.elitecarefinders.com/wp-content/uploads/Elite-CareFinders-Icon-white.svg';

const ELITE_STANDARDS = [
    { title: 'Caring', desc: 'The caregivers in our network are caring.' },
    { title: 'Competent', desc: 'Our caregivers are licensed AND provide individualized care. They also provide the clients\' preferences to food, activities and socialization, and daily exercise.' },
    { title: 'Compassionate', desc: 'Our caregivers are compassionate.' },
    { title: 'Comfortable', desc: 'The homes are clean, comfortable and with appropriate furnishings.' },
];

function ContentSection() {
    return (
        <section className="max-w-6xl mx-auto px-5 py-12">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 mb-[30px] lg:mb-0">

                {/* Left column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center bg-gray-100 rounded-2xl p-5 lg:bg-transparent lg:rounded-none lg:p-0">
                    <h2
                        className="text-[#239ddb] text-center mb-6 lg:pr-8 font-bold lg:font-extralight"
                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(22px, 2.5vw, 32px)', lineHeight: 1.1, letterSpacing: '-0.3px' }}
                    >
                        Your no-cost senior care placement experts
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
                            alt="Elite CareFinders Services"
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
                Elite CareFinders has four standards used in selecting Care Providers to be part of our network.
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
            <div className="bg-gray-100 rounded-2xl p-5 flex flex-col lg:flex-row gap-5 items-center">

                {/* Left: text */}
                <div className="flex-1 min-w-0">
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
                        Elite CareFinders, founded by <em>Rose Gallego, RN, BSN, RAC-CT</em>, connects families with trusted senior care options across Hawaii, streamlining the search with personal concierge style service. With 27+ years of healthcare experience and national certification in long-term care quality, Rose leads this <strong>multiple national award-winning Senior Placement Company of the Year</strong> with clinical precision and heartfelt dedication. Elite CareFinders matches each client&rsquo;s needs with the most appropriate care setting, offering a curated gallery of <strong>pre-evaluated homes</strong> that lets families easily tour facilities and discover <strong>warm, home-like environments</strong>.
                    </p>
                </div>

                {/* Images: side by side on mobile, stacked inline on desktop */}
                <div className="flex flex-row lg:contents gap-3 w-full lg:w-auto">
                    {/* Rose photo + caption */}
                    <div className="flex-1 lg:flex-shrink-0 relative lg:w-56 rounded-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://www.elitecarefinders.com/wp-content/uploads/brizy/imgs/Rose-10-25-546x720x0x0x546x698x1761257435.jpg"
                            alt="Rose Guillermo Gallego RN — Founder &amp; Owner"
                            className="w-full object-cover"
                        />
                        <div className="absolute bottom-0 left-[15px] right-[15px] bg-gray-100 rounded-t-xl px-3 py-2 text-center">
                            <p className="m-0" style={{ fontFamily: 'var(--font-montserrat)', fontSize: '12px', fontWeight: 500, lineHeight: 1.3, color: '#191b21' }}>Rose Guillermo Gallego RN</p>
                            <p className="m-0" style={{ fontFamily: 'var(--font-montserrat)', fontSize: '12px', fontWeight: 500, lineHeight: 1.3, color: '#191b21' }}>Founder &amp; Owner</p>
                            <p className="m-0" style={{ fontFamily: 'var(--font-montserrat)', fontSize: '12px', fontWeight: 500, lineHeight: 1.3, color: '#191b21' }}>Senior Care Advisor</p>
                        </div>
                    </div>

                    {/* Cover photo */}
                    <div className="flex-1 lg:flex-shrink-0 lg:w-56">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://www.elitecarefinders.com/wp-content/uploads/brizy/imgs/Elite-CareFinders_Cover-2025a-546x700x0x0x546x700x1749175439.webp"
                            alt="Elite CareFinders 2025"
                            className="w-full object-cover rounded-lg"
                        />
                    </div>
                </div>

            </div>
        </section>
    );
}
