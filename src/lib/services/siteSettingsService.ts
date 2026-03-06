import { createClientComponentClient } from "@/lib/supabase";

export interface ScriptEntry {
    id: string;
    name: string;
    code: string;
    enabled: boolean;
    location: 'header' | 'body' | 'footer';
}

export async function getSiteSetting(key: string): Promise<string> {
    const supabase = createClientComponentClient();
    const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .single();
    return data?.value ?? "";
}

export async function saveSiteSetting(key: string, value: string): Promise<void> {
    const supabase = createClientComponentClient();
    const { error } = await supabase
        .from("site_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
}

export async function getInjectedScripts(): Promise<ScriptEntry[]> {
    const raw = await getSiteSetting("injected_scripts");
    if (!raw?.trim()) return [];
    try {
        return JSON.parse(raw) as ScriptEntry[];
    } catch {
        return [];
    }
}

export async function saveInjectedScripts(scripts: ScriptEntry[]): Promise<void> {
    await saveSiteSetting("injected_scripts", JSON.stringify(scripts));
}

export interface AnalyticsSettings {
    propertyId: string;
    serviceAccountJson: string;
    charts: {
        traffic: boolean;
        topPages: boolean;
        sources: boolean;
    };
}

const DEFAULT_ANALYTICS: AnalyticsSettings = {
    propertyId: '',
    serviceAccountJson: '',
    charts: { traffic: true, topPages: true, sources: true },
};

export async function getAnalyticsSettings(): Promise<AnalyticsSettings> {
    const raw = await getSiteSetting("analytics_settings");
    if (!raw?.trim()) return DEFAULT_ANALYTICS;
    try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_ANALYTICS, ...parsed, charts: { ...DEFAULT_ANALYTICS.charts, ...parsed.charts } };
    } catch {
        return DEFAULT_ANALYTICS;
    }
}

export async function saveAnalyticsSettings(settings: AnalyticsSettings): Promise<void> {
    await saveSiteSetting("analytics_settings", JSON.stringify(settings));
}

export type SocialPlatform = 'facebook' | 'instagram' | 'x' | 'linkedin' | 'pinterest' | 'youtube' | 'tiktok' | 'threads';

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
    { value: 'facebook',  label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'x',         label: 'X / Twitter' },
    { value: 'linkedin',  label: 'LinkedIn' },
    { value: 'pinterest', label: 'Pinterest' },
    { value: 'youtube',   label: 'YouTube' },
    { value: 'tiktok',    label: 'TikTok' },
    { value: 'threads',   label: 'Threads' },
];

export interface SocialAccount {
    id: string;
    platform: SocialPlatform;
    url: string;
    hidden?: boolean;
}

export async function getSocialAccounts(): Promise<SocialAccount[]> {
    const raw = await getSiteSetting("social_accounts");
    if (!raw?.trim()) return [];
    try { return JSON.parse(raw) as SocialAccount[]; } catch { return []; }
}

export async function saveSocialAccounts(accounts: SocialAccount[]): Promise<void> {
    await saveSiteSetting("social_accounts", JSON.stringify(accounts));
}
