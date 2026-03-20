import type { SeoFields } from '@/types';

export interface SeoScore {
    score: number;
    total: number;
    missing: string[];
}

export function scoreSeo(seo: SeoFields): SeoScore {
    const missing: string[] = [];
    let score = 0;

    if (seo.metaTitle) score++; else missing.push('Meta Title');
    if (seo.metaDescription) score++; else missing.push('Meta Description');
    if (seo.ogTitle || seo.metaTitle) score++; else missing.push('OG Title (falls back to Meta Title)');
    if (seo.ogDescription || seo.metaDescription) score++; else missing.push('OG Description (falls back to Meta Description)');
    if (seo.ogImageUrl) score++; else missing.push('OG Image');
    if (seo.canonicalUrl) score++; else missing.push('Canonical URL');

    return { score, total: 6, missing };
}

export function scoreColor(score: number): string {
    if (score <= 2) return 'text-red-500';
    if (score <= 4) return 'text-amber-500';
    return 'text-emerald-500';
}

export function scoreBgColor(score: number): string {
    if (score <= 2) return 'bg-red-500/10 text-red-600';
    if (score <= 4) return 'bg-amber-500/10 text-amber-600';
    return 'bg-emerald-500/10 text-emerald-600';
}
