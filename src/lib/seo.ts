import type { Metadata } from 'next';
import type { SeoFields } from '@/types';

const SITE_NAME = 'Elite CareFinders';
const BASE_URL = 'https://www.elitecarefinders.com';

interface SeoInput {
    slug: string;
    pathPrefix: string; // e.g. 'homes' | 'facilities' | 'posts'
    defaultTitle: string;
    defaultDescription?: string | null;
    defaultImage?: string | null;
    seo?: SeoFields | null;
}

export function generateSeoMetadataFromRecord(input: SeoInput): Metadata {
    const { slug, pathPrefix, defaultTitle, defaultDescription, defaultImage, seo } = input;

    const pageUrl = `${BASE_URL}/${pathPrefix}/${slug}`;

    const title = seo?.metaTitle || defaultTitle;
    const description = (seo?.metaDescription || defaultDescription || '').slice(0, 160) || undefined;
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
