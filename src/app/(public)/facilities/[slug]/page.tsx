import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faUsers, faHandHoldingHeart, faHeart, faShareNodes, faCheck, faXmark, faBed, faCircleInfo, faUtensils, faChevronLeft, faChevronRight, faStar } from '@fortawesome/free-solid-svg-icons';
import { getFacilityBySlug, getTaxonomyEntriesByIds, getRoomFieldData, getMediaCaptionsByUrls, getMediaTitlesByUrls, getAdjacentFacility, getFeaturedFacilities } from '@/lib/public-db';
import { generateSeoMetadataFromRecord, buildFacilityJsonLd } from '@/lib/seo';
import { HeroGallery } from '@/components/public/HeroGallery';
import { RoomDetailsSection } from '@/components/public/RoomDetailsSection';
import { EntityCTAButtons } from '@/components/public/EntityCTAButtons';
import { FavoriteButton } from '@/components/public/FavoriteButton';
import { MySavedButton } from '@/components/public/MySavedButton';
import { ShareButton } from '@/components/public/ShareButton';
import { StickyEntityBar } from '@/components/public/StickyEntityBar';
import { DiagonalReveal } from '@/components/public/DiagonalReveal';
import { geocodeAddress } from '@/lib/geocode';
import { NEIGHBORHOOD_COORDS } from '@/lib/neighborhood-coords';

const EntityMap = dynamic(() => import('@/components/public/EntityMap'), { ssr: false });

interface Props {
    params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = params;
    const facility = await getFacilityBySlug(slug);
    if (!facility) return { title: 'Not Found' };
    return generateSeoMetadataFromRecord({
        slug,
        pathPrefix: 'facilities',
        defaultTitle: facility.title,
        defaultDescription: facility.excerpt || facility.description,
        defaultImage: facility.images[0] ?? null,
        seo: facility.seo,
    });
}

export default async function FacilityDetailPage({ params }: Props) {
    const { slug } = params;

    const [facility, fieldData] = await Promise.all([
        getFacilityBySlug(slug),
        getRoomFieldData(),
    ]);

    if (!facility) notFound();

    const [taxonomyEntries, adjacent, featuredRaw] = await Promise.all([
        getTaxonomyEntriesByIds(facility.taxonomyEntryIds || []),
        getAdjacentFacility(facility.title),
        getFeaturedFacilities(facility.slug),
    ]);
    const featuredFacilities = featuredRaw.sort(() => Math.random() - 0.5).slice(0, 4);
    const featuredTaxIds = [...new Set(featuredFacilities.flatMap(f => f.taxonomyEntryIds))];
    const featuredTaxEntries = featuredTaxIds.length > 0 ? await getTaxonomyEntriesByIds(featuredTaxIds) : [];
    const featuredTypeMap = new Map<string, string>();
    featuredFacilities.forEach(f => {
        const te = f.taxonomyEntryIds.map(id => featuredTaxEntries.find(e => e.id === id)).find(e => e?.taxonomySlug !== 'location');
        if (te) featuredTypeMap.set(f.slug, te.name.replace(/ies$/, 'y').replace(/([^s])s$/, '$1'));
    });
    const { categories, definitions } = fieldData;

    const teamImageUrls = facility.teamImages || [];
    const cuisineImageUrls = facility.cuisineImages || [];
    const allMediaUrls = [...teamImageUrls, ...cuisineImageUrls];
    const [mediaCaptions, teamTitles] = await Promise.all([
        allMediaUrls.length > 0 ? getMediaCaptionsByUrls(allMediaUrls) : Promise.resolve({} as Record<string, string>),
        teamImageUrls.length > 0 ? getMediaTitlesByUrls(teamImageUrls) : Promise.resolve({} as Record<string, string>),
    ]);

    const addr = facility.address;
    const hasAddress = addr.street || addr.city;

    const locationTaxEntry = taxonomyEntries.find(e => e.taxonomySlug === 'location');
    const locationTaxName = locationTaxEntry?.name;
    const locationTaxSlug = locationTaxEntry?.slug;
    const mapFallback = [addr.city, addr.state].filter(Boolean).join(', ') || (locationTaxName ? `${locationTaxName}, Hawaii` : 'Hawaii');
    const mapQuery = hasAddress
        ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ')
        : mapFallback;

    const HAWAII_CENTER: [number, number] = [20.5, -157.5];
    const storedCoords = facility.address?.coordinates;
    const geocoded = storedCoords
        ? [storedCoords.lat, storedCoords.lng] as [number, number]
        : await geocodeAddress(mapQuery);
    const neighborhoodCoords = locationTaxSlug ? NEIGHBORHOOD_COORDS[locationTaxSlug] : undefined;
    const [mapLat, mapLng] = geocoded ?? neighborhoodCoords ?? HAWAII_CENTER;
    const circleMode = !hasAddress;
    const mapZoom = circleMode ? 12 : (storedCoords ? 15 : (geocoded ? 15 : 13));

    const jsonLd = buildFacilityJsonLd({
        name: facility.title,
        description: facility.description,
        slug: facility.slug,
        image: facility.images[0] ?? null,
        telephone: (facility as any).phone ?? null,
        licenseNumber: facility.licenseNumber ?? null,
        address: hasAddress ? addr : null,
        schemaJsonOverride: facility.seo?.schemaJson ?? null,
    });

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
                            type="facility"
                            entityId={facility.id}
                            entitySlug={facility.slug}
                            entityTitle={facility.title}
                            entityImage={facility.images[0]}
                        />
                    </div>
                    <ShareButton
                        url={`https://elitecarefinders.com/facilities/${facility.slug}`}
                        title={facility.title}
                        image={facility.images?.[0]}
                    />
                </div>

                {/* Hero Gallery — second on desktop, third on mobile */}
                {(facility.images.length > 0 || (facility.videos?.length ?? 0) > 0) && (
                    <div className="order-3 lg:order-2 mb-6">
                        <HeroGallery
                            images={facility.images}
                            videos={facility.videos}
                            title={facility.title}
                            featuredLabel={(facility as any).featured_label}
                        />
                    </div>
                )}

                {/* Title + Tags — first on mobile, third on desktop */}
                <header className="order-1 lg:order-3 mb-0 flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-2">
                            {facility.title}
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
                                    {(facility.licenseNumber || facility.capacity > 0) && (
                                        <div className="flex flex-wrap items-center gap-4 mt-2">
                                            {facility.licenseNumber && (
                                                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <FontAwesomeIcon icon={faBuilding} className="h-3.5 w-3.5" />
                                                    License #{facility.licenseNumber}
                                                </span>
                                            )}
                                            {facility.capacity > 0 && (
                                                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />
                                                    Capacity: {facility.capacity}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </header>
                <StickyEntityBar title={facility.title} entityName={facility.title} entityType="facility" subtitle={taxonomyEntries.filter(e => e.taxonomySlug !== 'location').map(e => e.name).join(', ')} />
                </div>{/* end flex-col order wrapper */}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-0">
                    {/* Mobile-only: CTA + details before main content */}
                    <div className="lg:hidden space-y-6">
                        <EntityCTAButtons entityName={facility.title} entityType="facility" />
                        <div className="bg-gray-100 rounded-xl pt-5 px-5">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                    <FontAwesomeIcon icon={faBuilding} className="h-4 w-4 text-white" />
                                </span>
                                Facility Details
                            </h2>
                            <div className="space-y-4">
                                {((facility as any).roomDetails?.bedroomTypes?.length > 0 || (facility as any).roomDetails?.roomTypes?.length > 0) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Bedroom Type</p>
                                            {((facility as any).roomDetails?.bedroomTypes || []).map((v: string) => (
                                                <p key={v} className="text-sm text-gray-900">{v}</p>
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Room Types</p>
                                            {((facility as any).roomDetails?.roomTypes || []).map((v: string) => (
                                                <p key={v} className="text-sm text-gray-900">{v}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {((facility as any).roomDetails?.bathroomType || (facility as any).roomDetails?.showerType) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Bathroom Type</p>
                                            <p className="text-sm text-gray-900">{(facility as any).roomDetails.bathroomType}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Shower Type</p>
                                            <p className="text-sm text-gray-900">{(facility as any).roomDetails.showerType}</p>
                                        </div>
                                    </div>
                                )}
                                {hasAddress && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Address</p>
                                        {addr.street && <p className="text-sm text-gray-900">{addr.street}</p>}
                                        <p className="text-sm text-gray-900">{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
                                    </div>
                                )}
                                <div className="-mx-5 overflow-hidden rounded-b-xl aspect-square">
                                    <EntityMap lat={mapLat} lng={mapLng} zoom={mapZoom} circleMode={circleMode} neighborhoodSlug={circleMode ? (locationTaxSlug ?? undefined) : undefined} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-10">

                        {/* Care Services Provided */}
                        {(() => {
                            const rd = (facility as any).roomDetails;
                            if (!rd) return null;
                            const cf = rd.customFields || {};
                            const levelOfCare: string[] = rd.levelOfCare || [];
                            const languages: string[] = rd.languages || [];

                            type ServiceItem = { name: string; isNo: boolean };

                            const getCatItems = (catName: string): ServiceItem[] => {
                                const cat = categories.find(c => c.section === 'location_details' && c.name === catName);
                                if (!cat) return [];
                                return definitions
                                    .filter(d => d.categoryId === cat.id && (d.targetType === 'both' || d.targetType === 'facility'))
                                    .sort((a, b) => a.displayOrder - b.displayOrder)
                                    .flatMap((def): ServiceItem[] => {
                                        const raw = cf[def.id];
                                        if (raw == null) return [];
                                        if (def.type === 'boolean') {
                                            if (raw === true || raw === 'true') return [{ name: def.name, isNo: false }];
                                            if (raw === false || raw === 'false') return [{ name: def.name, isNo: true }];
                                            return [];
                                        }
                                        return [];
                                    });
                            };

                            const hcsItems = getCatItems('Health Care Services');
                            const addlItems = getCatItems('Additional Services');

                            const teamImages: string[] = facility.teamImages || [];
                            if (!levelOfCare.length && !hcsItems.length && !addlItems.length && !languages.length && !teamImages.length) return null;

                            const renderChecklist = (items: string[], singleCol = false) => (
                                <ul className={singleCol ? "grid grid-cols-1 gap-y-1" : "grid grid-cols-2 gap-x-4 gap-y-1"}>
                                    {items.map(v => (
                                        <li key={v} className="flex items-center gap-2 text-sm">
                                            <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5 text-[#239ddb] shrink-0" />
                                            <span className="text-gray-700">{v}</span>
                                        </li>
                                    ))}
                                </ul>
                            );

                            const renderServiceList = (items: ServiceItem[], singleCol = false) => (
                                <ul className={singleCol ? "grid grid-cols-1 gap-y-1" : "grid grid-cols-2 gap-x-4 gap-y-1"}>
                                    {items.map(item => (
                                        <li key={item.name} className="flex items-center gap-2 text-sm">
                                            <FontAwesomeIcon
                                                icon={item.isNo ? faXmark : faCheck}
                                                className={`h-3.5 w-3.5 shrink-0 ${item.isNo ? 'text-gray-400' : 'text-[#239ddb]'}`}
                                            />
                                            <span className={item.isNo ? 'text-gray-400' : 'text-gray-700'}>{item.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            );

                            return (
                                <div className="rounded-xl bg-[#f0f8fc]">
                                <div className="p-6">
                                    <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                            <FontAwesomeIcon icon={faHandHoldingHeart} className="h-4 w-4 text-white" />
                                        </span>
                                        Care Services Provided
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Col 1: Levels of Care + Health Care Services + Languages Spoken */}
                                        <div className="space-y-5">
                                            {levelOfCare.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Levels of Care</p>
                                                    {renderChecklist(levelOfCare, true)}
                                                </div>
                                            )}
                                            {hcsItems.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Health Care Services</p>
                                                    {renderServiceList(hcsItems, true)}
                                                </div>
                                            )}
                                            {languages.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Languages Spoken</p>
                                                    {renderChecklist(languages)}
                                                </div>
                                            )}
                                        </div>
                                        {/* Col 2: Additional Services */}
                                        <div className="space-y-5">
                                            {addlItems.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Additional Services</p>
                                                    {renderServiceList(addlItems, true)}
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
                                                const memberTitle = teamTitles[url];
                                                return (
                                                    <div key={i} className="rounded-lg overflow-hidden bg-white border border-gray-100 shadow-sm">
                                                        <div className="aspect-square overflow-hidden bg-gray-200">
                                                            <img src={url} alt={caption || `Team member ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                                        </div>
                                                        {(caption || memberTitle) && (
                                                            <div className="px-2 py-1.5 text-xs text-gray-800 text-center leading-tight">
                                                                {caption && <p className="font-medium truncate">{caption}</p>}
                                                                {memberTitle && <p className="text-gray-500 mt-0.5">{memberTitle}</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        </div>
                                    )}
                                </div>
                                </div>
                            );
                        })()}

                        {/* Room Details */}
                        {(facility as any).roomDetails && (
                            <div className="space-y-8">
                                <RoomDetailsSection
                                    roomDetails={(facility as any).roomDetails}
                                    categories={[
                                        ...categories.filter(c =>
                                            c.section === 'room_details' && c.name !== 'Outdoor & Access'
                                        ),
                                        ...categories
                                            .filter(c => c.section === 'location_details' && c.name === 'Common Areas')
                                            .map(c => ({ ...c, displayOrder: 999 })),
                                    ]}
                                    definitions={definitions}
                                    targetType="facility"
                                    sectionTitle="Room Details"
                                    sectionIcon={faBed}
                                    hideFixedFields
                                    columns={3}
                                    labelAboveFieldSlugs={['bed-size', 'pets-allowed']}
                                    className="px-6"
                                />
                                <RoomDetailsSection
                                    roomDetails={(facility as any).roomDetails}
                                    categories={[
                                        ...categories.filter(c =>
                                            c.section === 'location_details' &&
                                            !['Health Care Services', 'Additional Services', 'Common Areas'].includes(c.name)
                                        ),
                                        ...categories.filter(c =>
                                            c.section === 'room_details' && c.name === 'Outdoor & Access'
                                        ),
                                    ].map((c, i) => ({ ...c, displayOrder: i }))}
                                    definitions={definitions}
                                    targetType="facility"
                                    hideFixedFields
                                    className="px-6"
                                />
                            </div>
                        )}

                        {/* Description */}
                        {facility.description && (
                            <section aria-labelledby="about-heading" className="px-6">
                                <h2 id="about-heading" className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                        <FontAwesomeIcon icon={faCircleInfo} className="h-4 w-4 text-white" />
                                    </span>
                                    About This Facility
                                </h2>
                                <div
                                    className="prose prose-sm prose-gray max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-headings:uppercase prose-headings:tracking-wide prose-headings:text-xs prose-headings:mb-2 prose-h3:text-lg prose-h4:text-sm prose-p:text-gray-700 prose-p:leading-relaxed prose-ul:pl-5 prose-li:text-gray-700 prose-strong:text-gray-900"
                                    dangerouslySetInnerHTML={{ __html: facility.description }}
                                />
                            </section>
                        )}

                        {/* Cuisine / Dining Gallery */}
                        {cuisineImageUrls.length > 0 && (
                            <div className="bg-[#f0f8fc] rounded-xl p-6">
                                <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                        <FontAwesomeIcon icon={faUtensils} className="h-4 w-4 text-white" />
                                    </span>
                                    Dining &amp; Cuisine
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {cuisineImageUrls.map((url, i) => {
                                        const caption = mediaCaptions[url];
                                        return (
                                            <div key={i} className="rounded-lg overflow-hidden bg-white border border-gray-100 shadow-sm">
                                                <div className="aspect-square overflow-hidden bg-gray-200">
                                                    <img src={url} alt={caption || `Cuisine ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                                </div>
                                                {caption && (
                                                    <div className="px-2 py-1.5 text-xs text-gray-800 font-medium text-center truncate">
                                                        {caption}
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
                            <div className="rounded-b-xl bg-gradient-to-b from-white to-gray-100 px-5 py-4 flex items-center justify-between gap-4">
                                <div>
                                    {adjacent.prev ? (
                                        <Link href={`/facilities/${adjacent.prev.slug}`} className="group flex items-center gap-2 text-left">
                                            <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4 text-[#239ddb] shrink-0" />
                                            <div>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Previous Facility</span>
                                                <span className="text-sm font-bold text-[#239ddb] group-hover:underline line-clamp-1">{adjacent.prev.title}</span>
                                            </div>
                                        </Link>
                                    ) : <div />}
                                </div>
                                <div className="text-right">
                                    {adjacent.next ? (
                                        <Link href={`/facilities/${adjacent.next.slug}`} className="group flex items-center gap-2 text-right justify-end">
                                            <div>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">Next Facility</span>
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
                        <EntityCTAButtons entityName={facility.title} entityType="facility" />

                        {/* Facility Details */}
                        <div className="bg-gray-100 rounded-xl pt-5 px-5">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                    <FontAwesomeIcon icon={faBuilding} className="h-4 w-4 text-white" />
                                </span>
                                Facility Details
                            </h2>
                            <div className="space-y-4">
                                {((facility as any).roomDetails?.bedroomTypes?.length > 0 || (facility as any).roomDetails?.roomTypes?.length > 0) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Bedroom Type</p>
                                            {((facility as any).roomDetails?.bedroomTypes || []).map((v: string) => (
                                                <p key={v} className="text-sm text-gray-900">{v}</p>
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Room Types</p>
                                            {((facility as any).roomDetails?.roomTypes || []).map((v: string) => (
                                                <p key={v} className="text-sm text-gray-900">{v}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {((facility as any).roomDetails?.bathroomType || (facility as any).roomDetails?.showerType) && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Bathroom Type</p>
                                            <p className="text-sm text-gray-900">{(facility as any).roomDetails.bathroomType}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Shower Type</p>
                                            <p className="text-sm text-gray-900">{(facility as any).roomDetails.showerType}</p>
                                        </div>
                                    </div>
                                )}
                                {hasAddress && (
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Address</p>
                                        {addr.street && <p className="text-sm text-gray-900">{addr.street}</p>}
                                        <p className="text-sm text-gray-900">{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
                                    </div>
                                )}
                                <div className="-mx-5 overflow-hidden rounded-b-xl aspect-square">
                                    <EntityMap lat={mapLat} lng={mapLng} zoom={mapZoom} circleMode={circleMode} neighborhoodSlug={circleMode ? (locationTaxSlug ?? undefined) : undefined} />
                                </div>
                            </div>
                        </div>

                    </aside>
                </div>

                {/* Featured Facilities */}
                {featuredFacilities.length > 0 && (
                    <section aria-labelledby="featured-facilities-heading" className="mt-10 mb-8">
                        <h2 id="featured-facilities-heading" className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5">
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faBuilding} className="h-4 w-4 text-white" />
                            </span>
                            Featured Facilities
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {featuredFacilities.map(item => (
                                <Link key={item.slug} href={`/facilities/${item.slug}`} className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 bg-gray-100">
                                    <div className="relative w-full h-40 bg-gray-100 flex-shrink-0">
                                        {item.image ? (
                                            <img
                                                src={item.image.startsWith('/images/media/') ? item.image.replace(/(\.[^.]+)$/, '-500x500.webp') : item.image}
                                                alt={item.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                <FontAwesomeIcon icon={faBuilding} className="h-10 w-10" />
                                            </div>
                                        )}
                                        {item.featuredLabel && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                                                <span className="flex items-center gap-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-b-lg shadow">
                                                    <FontAwesomeIcon icon={faStar} className="h-2.5 w-2.5" />
                                                    {item.featuredLabel}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1 group-hover:text-[#239ddb] transition-colors line-clamp-2">
                                            {item.title}
                                        </h3>
                                        {featuredTypeMap.get(item.slug) && (
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#239ddb]">
                                                {featuredTypeMap.get(item.slug)}
                                            </p>
                                        )}
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
