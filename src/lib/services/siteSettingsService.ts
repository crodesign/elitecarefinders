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

export type SocialPlatform = 'facebook' | 'instagram' | 'x' | 'linkedin' | 'pinterest' | 'youtube' | 'tiktok' | 'threads' | 'phone' | 'email' | 'share';

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
    { value: 'facebook',  label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'x',         label: 'X / Twitter' },
    { value: 'linkedin',  label: 'LinkedIn' },
    { value: 'pinterest', label: 'Pinterest' },
    { value: 'youtube',   label: 'YouTube' },
    { value: 'tiktok',    label: 'TikTok' },
    { value: 'threads',   label: 'Threads' },
    { value: 'phone',     label: 'Phone' },
    { value: 'email',     label: 'Email' },
    { value: 'share',     label: 'Share' },
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

export interface SeoTemplate {
    id: string;
    label: string;
    description: string;
    variables: string[];
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
}

const DEFAULT_SEO_TEMPLATES: SeoTemplate[] = [
    {
        id: 'homes-search',
        label: 'Homes Search Results',
        description: 'Shown when users search or filter senior homes',
        variables: ['query', 'location', 'state'],
        metaTitle: '',
        metaDescription: '',
        ogTitle: '',
        ogDescription: '',
    },
    {
        id: 'facilities-search',
        label: 'Facilities Search Results',
        description: 'Shown when users search or filter senior care facilities',
        variables: ['query', 'location', 'state'],
        metaTitle: '',
        metaDescription: '',
        ogTitle: '',
        ogDescription: '',
    },
    {
        id: 'blog-listing',
        label: 'Blog Listing',
        description: 'Shown on the main blog and posts listing page',
        variables: [],
        metaTitle: '',
        metaDescription: '',
        ogTitle: '',
        ogDescription: '',
    },
    {
        id: 'taxonomy',
        label: 'Category / Taxonomy Pages',
        description: 'Shown on category and taxonomy archive pages',
        variables: ['category', 'taxonomy'],
        metaTitle: '',
        metaDescription: '',
        ogTitle: '',
        ogDescription: '',
    },
];

export async function getSeoTemplates(): Promise<SeoTemplate[]> {
    const raw = await getSiteSetting("seo_templates");
    if (!raw?.trim()) return DEFAULT_SEO_TEMPLATES;
    try {
        const saved = JSON.parse(raw) as SeoTemplate[];
        return DEFAULT_SEO_TEMPLATES.map(def => {
            const match = saved.find(s => s.id === def.id);
            return match ? { ...def, ...match } : def;
        });
    } catch {
        return DEFAULT_SEO_TEMPLATES;
    }
}

export async function saveSeoTemplates(templates: SeoTemplate[]): Promise<void> {
    await saveSiteSetting("seo_templates", JSON.stringify(templates));
}

export interface HomepageSeoSettings {
    metaTitle: string;
    metaDescription: string;
    ogTitle: string;
    ogDescription: string;
    ogImageUrl: string;
    canonicalUrl: string;
    schemaJson?: Record<string, unknown> | null;
}

export const DEFAULT_HOMEPAGE_SEO: HomepageSeoSettings = {
    metaTitle: "Hawaii's Most Trusted Senior Living Advisors | Elite CareFinders",
    metaDescription: 'Free RN-led consultation to help Hawaii families find trusted senior care homes and communities on Oahu, Maui, Kauai, and the Big Island. Expert guidance every step of the way.',
    ogTitle: '',
    ogDescription: '',
    ogImageUrl: '',
    canonicalUrl: '',
    schemaJson: null,
};

export async function getHomepageSeo(): Promise<HomepageSeoSettings> {
    const raw = await getSiteSetting("homepage_seo");
    if (!raw?.trim()) return DEFAULT_HOMEPAGE_SEO;
    try {
        return { ...DEFAULT_HOMEPAGE_SEO, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_HOMEPAGE_SEO;
    }
}

export async function saveHomepageSeo(settings: HomepageSeoSettings): Promise<void> {
    await saveSiteSetting("homepage_seo", JSON.stringify(settings));
}
