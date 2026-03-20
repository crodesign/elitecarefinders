import type { SeoFields } from '@/types';

export interface ScoreCriterion {
    label: string;
    status: 'good' | 'warn' | 'fail';
    note: string;
    points: number;
    maxPoints: number;
}

export interface SeoScore {
    score: number; // 0–100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    criteria: ScoreCriterion[];
}

export function scoreSeo(seo: SeoFields): SeoScore {
    const criteria: ScoreCriterion[] = [];

    // Meta Title — 20 pts
    const title = seo.metaTitle || '';
    if (!title) {
        criteria.push({ label: 'Meta Title', status: 'fail', note: 'Missing — required for search visibility', points: 0, maxPoints: 20 });
    } else if (title.length >= 50 && title.length <= 60) {
        criteria.push({ label: 'Meta Title', status: 'good', note: `${title.length} chars — optimal`, points: 20, maxPoints: 20 });
    } else {
        criteria.push({ label: 'Meta Title', status: 'warn', note: `${title.length} chars — ${title.length < 50 ? 'too short' : 'too long'}, aim for 50–60`, points: 10, maxPoints: 20 });
    }

    // Meta Description — 20 pts
    const desc = seo.metaDescription || '';
    if (!desc) {
        criteria.push({ label: 'Meta Description', status: 'fail', note: 'Missing — shown below title in search results', points: 0, maxPoints: 20 });
    } else if (desc.length >= 140 && desc.length <= 160) {
        criteria.push({ label: 'Meta Description', status: 'good', note: `${desc.length} chars — optimal`, points: 20, maxPoints: 20 });
    } else {
        criteria.push({ label: 'Meta Description', status: 'warn', note: `${desc.length} chars — ${desc.length < 140 ? 'too short' : 'too long'}, aim for 140–160`, points: 10, maxPoints: 20 });
    }

    // Social Title — 15 pts
    if (seo.ogTitle) {
        criteria.push({ label: 'Social Title', status: 'good', note: 'Custom OG title optimised for social sharing', points: 15, maxPoints: 15 });
    } else if (seo.metaTitle) {
        criteria.push({ label: 'Social Title', status: 'warn', note: 'Inheriting meta title — a distinct social headline can improve click-through', points: 8, maxPoints: 15 });
    } else {
        criteria.push({ label: 'Social Title', status: 'fail', note: 'No title available for social sharing', points: 0, maxPoints: 15 });
    }

    // Social Description — 15 pts
    if (seo.ogDescription) {
        criteria.push({ label: 'Social Description', status: 'good', note: 'Custom OG description set for social sharing', points: 15, maxPoints: 15 });
    } else if (seo.metaDescription) {
        criteria.push({ label: 'Social Description', status: 'warn', note: 'Inheriting meta description — social-specific copy can improve engagement', points: 8, maxPoints: 15 });
    } else {
        criteria.push({ label: 'Social Description', status: 'fail', note: 'No description available for social sharing', points: 0, maxPoints: 15 });
    }

    // Social Image — 20 pts
    if (seo.ogImageUrl) {
        criteria.push({ label: 'Social Image', status: 'good', note: 'Dedicated OG image set (1200×630px recommended)', points: 20, maxPoints: 20 });
    } else {
        criteria.push({ label: 'Social Image', status: 'warn', note: 'No OG image — main image used as fallback (set one for best results)', points: 10, maxPoints: 20 });
    }

    // Indexable — 10 pts
    if (seo.indexable !== false) {
        criteria.push({ label: 'Indexable', status: 'good', note: 'Page is open to search engine indexing', points: 10, maxPoints: 10 });
    } else {
        criteria.push({ label: 'Indexable', status: 'fail', note: 'Noindex set — page will not appear in search results', points: 0, maxPoints: 10 });
    }

    const score = criteria.reduce((sum, c) => sum + c.points, 0);
    const grade: SeoScore['grade'] =
        score >= 85 ? 'A' :
        score >= 70 ? 'B' :
        score >= 50 ? 'C' :
        score >= 30 ? 'D' : 'F';

    return { score, grade, criteria };
}

export function scoreBgColor(score: number): string {
    if (score >= 85) return 'bg-emerald-500/10 text-emerald-600';
    if (score >= 70) return 'bg-blue-500/10 text-blue-600';
    if (score >= 50) return 'bg-amber-500/10 text-amber-600';
    return 'bg-red-500/10 text-red-600';
}
