import type { Metadata } from 'next';
import type { SeoFields } from '@/types';

export const SITE_NAME = 'Elite CareFinders';
export const BASE_URL = 'https://www.elitecarefinders.com';

interface SeoInput {
    slug: string;
    pathPrefix: string; // e.g. 'homes' | 'facilities' | 'posts'
    defaultTitle: string;
    defaultDescription?: string | null;
    defaultImage?: string | null;
    seo?: SeoFields | null;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function generateSeoMetadataFromRecord(input: SeoInput): Metadata {
    const { slug, pathPrefix, defaultTitle, defaultDescription, defaultImage, seo } = input;

    const pageUrl = `${BASE_URL}/${pathPrefix}/${slug}`;

    const rawDefault = defaultDescription ? stripHtml(defaultDescription) : '';
    const title = seo?.metaTitle || defaultTitle;
    const description = (seo?.metaDescription || rawDefault || '').slice(0, 160) || undefined;
    const canonical = seo?.canonicalUrl || pageUrl;
    const indexable = seo?.indexable ?? true;

    const ogTitle = seo?.ogTitle || title;
    const ogDescription = seo?.ogDescription || description;
    const ogImage = seo?.ogImageUrl || defaultImage || null;

    return {
        title,
        description,
        alternates: { canonical },
        robots: indexable
            ? { index: true, follow: true }
            : { index: false, follow: false },
        openGraph: {
            title: ogTitle,
            description: ogDescription,
            url: canonical,
            siteName: SITE_NAME,
            ...(ogImage ? { images: [{ url: ogImage }] } : {}),
        },
    };
}

// JSON-LD builders

export interface HomeJsonLdInput {
    name: string;
    description?: string | null;
    slug: string;
    image?: string | null;
    telephone?: string | null;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
    } | null;
    schemaJsonOverride?: Record<string, unknown> | null;
}

export function buildHomeJsonLd(input: HomeJsonLdInput): Record<string, unknown> {
    const { name, description, slug, image, telephone, address, schemaJsonOverride } = input;

    const base: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'LodgingBusiness',
        name,
        url: `${BASE_URL}/homes/${slug}`,
        ...(description ? { description } : {}),
        ...(image ? { image } : {}),
        ...(telephone ? { telephone } : {}),
        ...(address && (address.street || address.city)
            ? {
                address: {
                    '@type': 'PostalAddress',
                    ...(address.street ? { streetAddress: address.street } : {}),
                    ...(address.city ? { addressLocality: address.city } : {}),
                    ...(address.state ? { addressRegion: address.state } : {}),
                    ...(address.zip ? { postalCode: address.zip } : {}),
                    addressCountry: 'US',
                },
            }
            : {}),
    };

    if (schemaJsonOverride && typeof schemaJsonOverride === 'object') {
        return { ...base, ...schemaJsonOverride };
    }

    return base;
}

export interface FacilityJsonLdInput {
    name: string;
    description?: string | null;
    slug: string;
    image?: string | null;
    telephone?: string | null;
    licenseNumber?: string | null;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
    } | null;
    schemaJsonOverride?: Record<string, unknown> | null;
}

export function buildFacilityJsonLd(input: FacilityJsonLdInput): Record<string, unknown> {
    const { name, description, slug, image, telephone, licenseNumber, address, schemaJsonOverride } = input;

    const base: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'NursingHome',
        name,
        url: `${BASE_URL}/facilities/${slug}`,
        ...(description ? { description } : {}),
        ...(image ? { image } : {}),
        ...(telephone ? { telephone } : {}),
        ...(licenseNumber ? { identifier: licenseNumber } : {}),
        ...(address && (address.street || address.city)
            ? {
                address: {
                    '@type': 'PostalAddress',
                    ...(address.street ? { streetAddress: address.street } : {}),
                    ...(address.city ? { addressLocality: address.city } : {}),
                    ...(address.state ? { addressRegion: address.state } : {}),
                    ...(address.zip ? { postalCode: address.zip } : {}),
                    addressCountry: 'US',
                },
            }
            : {}),
    };

    if (schemaJsonOverride && typeof schemaJsonOverride === 'object') {
        return { ...base, ...schemaJsonOverride };
    }

    return base;
}

export interface HomepageJsonLdInput {
    socialAccounts?: { platform: string; url: string }[];
    schemaJsonOverride?: Record<string, unknown> | null;
}

export function buildHomepageJsonLd(input: HomepageJsonLdInput): Record<string, unknown>[] {
    const { socialAccounts = [], schemaJsonOverride } = input;

    const sameAs = socialAccounts.map(a => a.url).filter(Boolean);

    const website: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: BASE_URL,
        potentialAction: {
            '@type': 'SearchAction',
            target: `${BASE_URL}/homes?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
        },
    };

    const organization: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: BASE_URL,
        logo: `${BASE_URL}/images/logo.png`,
        ...(sameAs.length > 0 ? { sameAs } : {}),
    };

    const localBusiness: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: SITE_NAME,
        url: BASE_URL,
        telephone: '+1-808-445-4111',
        address: {
            '@type': 'PostalAddress',
            addressLocality: 'Honolulu',
            addressRegion: 'HI',
            addressCountry: 'US',
        },
        areaServed: ['Oahu', 'Maui', 'Kauai', 'Big Island'],
        ...(schemaJsonOverride && typeof schemaJsonOverride === 'object' ? schemaJsonOverride : {}),
    };

    return [website, organization, localBusiness];
}

export interface PostJsonLdInput {
    title: string;
    description?: string | null;
    slug: string;
    image?: string | null;
    authorName?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
    schemaJsonOverride?: Record<string, unknown> | null;
}

export function buildPostJsonLd(input: PostJsonLdInput): Record<string, unknown> {
    const { title, description, slug, image, authorName, publishedAt, updatedAt, schemaJsonOverride } = input;
    const url = `${BASE_URL}/posts/${slug}`;

    const base: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        ...(description ? { description } : {}),
        ...(image ? { image } : {}),
        ...(authorName ? { author: { '@type': 'Person', name: authorName } } : { author: { '@type': 'Organization', name: SITE_NAME } }),
        ...(publishedAt ? { datePublished: publishedAt } : {}),
        ...(updatedAt ? { dateModified: updatedAt } : {}),
    };

    if (schemaJsonOverride && typeof schemaJsonOverride === 'object') {
        return { ...base, ...schemaJsonOverride };
    }

    return base;
}
