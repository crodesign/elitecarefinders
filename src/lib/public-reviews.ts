export const FACEBOOK_REVIEWS_URL = 'https://www.facebook.com/elitecarefinders/reviews';

export function reviewSourceUrl(
    source: string | null | undefined,
    sourceLink: string | null | undefined,
    googleUrl: string | null,
    opts?: { internalTarget?: string | null }
): string | null {
    switch (source) {
        case 'google':
            return googleUrl || null;
        case 'facebook':
            return FACEBOOK_REVIEWS_URL;
        case 'video':
            return sourceLink || null;
        default:
            return opts?.internalTarget ?? '/reviews';
    }
}

export function isExternalSourceUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}
