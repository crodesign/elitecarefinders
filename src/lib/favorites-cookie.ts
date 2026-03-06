import type { Favorite } from '@/types';

const COOKIE_NAME = 'ecf_favorites';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MAX_ITEMS = 100;

function parseCookie(): Favorite[] {
    if (typeof document === 'undefined') return [];
    const match = document.cookie
        .split('; ')
        .find(row => row.startsWith(COOKIE_NAME + '='));
    if (!match) return [];
    try {
        return JSON.parse(decodeURIComponent(match.split('=').slice(1).join('=')));
    } catch {
        return [];
    }
}

function writeCookie(items: Favorite[]): void {
    if (typeof document === 'undefined') return;
    const value = encodeURIComponent(JSON.stringify(items));
    document.cookie = `${COOKIE_NAME}=${value}; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
}

export function readFavoritesCookie(): Favorite[] {
    return parseCookie();
}

export function clearFavoritesCookie(): void {
    if (typeof document === 'undefined') return;
    document.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
}

export function addToCookie(item: Favorite): void {
    const items = parseCookie();
    const exists = items.some(f => f.type === item.type && f.entityId === item.entityId);
    if (exists) return;
    const updated = [...items, item];
    // Trim oldest if over max
    if (updated.length > MAX_ITEMS) updated.splice(0, updated.length - MAX_ITEMS);
    writeCookie(updated);
}

export function removeFromCookie(type: string, entityId: string): void {
    const items = parseCookie();
    writeCookie(items.filter(f => !(f.type === type && f.entityId === entityId)));
}

export function isInCookie(type: string, entityId: string): boolean {
    return parseCookie().some(f => f.type === type && f.entityId === entityId);
}
