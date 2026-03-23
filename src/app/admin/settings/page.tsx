"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Plus, Trash2, Code, BarChart2, ChevronDown, ArrowUp, ArrowDown, Share2, Eye, EyeOff } from "lucide-react";
import { HeartLoader } from "@/components/ui/HeartLoader";
import {
    getInjectedScripts, saveInjectedScripts, ScriptEntry,
    getAnalyticsSettings, saveAnalyticsSettings, AnalyticsSettings,
    getSocialAccounts, saveSocialAccounts, SocialAccount, SocialPlatform, SOCIAL_PLATFORMS,
} from "@/lib/services/siteSettingsService";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { EnhancedSelect } from "@/components/admin/EnhancedSelect";

function generateId() {
    return Math.random().toString(36).slice(2, 10);
}

const CHART_LABELS: Record<keyof AnalyticsSettings['charts'], string> = {
    traffic: 'Traffic overview (sessions, pageviews, users)',
    topPages: 'Top pages',
    sources: 'Traffic sources',
};

export default function GeneralSettingsPage() {
    const { isSuperAdmin, loading: authLoading } = useAuth();
    const router = useRouter();
    const { showNotification } = useNotification();

    const [scripts, setScripts] = useState<ScriptEntry[]>([]);
    const [isSavingScripts, setIsSavingScripts] = useState(false);

    const [analytics, setAnalytics] = useState<AnalyticsSettings>({
        propertyId: '',
        serviceAccountJson: '',
        charts: { traffic: true, topPages: true, sources: true },
    });
    const [isSavingAnalytics, setIsSavingAnalytics] = useState(false);

    const [properties, setProperties] = useState<{ id: string; name: string; account: string }[]>([]);
    const [loadingProperties, setLoadingProperties] = useState(false);
    const [propertiesError, setPropertiesError] = useState<string | null>(null);

    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [isSavingSocial, setIsSavingSocial] = useState(false);

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!isSuperAdmin) {
            router.replace("/admin");
            return;
        }
        Promise.all([getInjectedScripts(), getAnalyticsSettings(), getSocialAccounts()]).then(([scripts, analytics, social]) => {
            setScripts(scripts);
            setAnalytics(analytics);
            setSocialAccounts(social);
            setIsLoading(false);
        });
    }, [authLoading, isSuperAdmin, router]);

    // Scripts handlers
    const addScript = () => {
        setScripts(prev => [...prev, { id: generateId(), name: "", code: "", enabled: true, location: "header" }]);
    };
    const updateScript = (id: string, patch: Partial<ScriptEntry>) => {
        setScripts(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    };
    const removeScript = (id: string) => {
        setScripts(prev => prev.filter(s => s.id !== id));
    };
    const handleSaveScripts = async () => {
        setIsSavingScripts(true);
        try {
            await saveInjectedScripts(scripts);
            showNotification("Saved", "Scripts updated.");
        } catch {
            showNotification("Error", "Failed to save scripts.");
        } finally {
            setIsSavingScripts(false);
        }
    };

    // Analytics handlers
    const updateAnalyticsChart = (key: keyof AnalyticsSettings['charts'], value: boolean) => {
        setAnalytics(prev => ({ ...prev, charts: { ...prev.charts, [key]: value } }));
    };
    const handleSaveAnalytics = async () => {
        setIsSavingAnalytics(true);
        try {
            await saveAnalyticsSettings(analytics);
            showNotification("Saved", "Analytics settings updated.");
        } catch {
            showNotification("Error", "Failed to save analytics settings.");
        } finally {
            setIsSavingAnalytics(false);
        }
    };

    // Social accounts handlers
    const addSocial = () => {
        setSocialAccounts(prev => [...prev, { id: generateId(), platform: 'facebook', url: '' }]);
    };
    const updateSocial = (id: string, patch: Partial<SocialAccount>) => {
        setSocialAccounts(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    };
    const removeSocial = (id: string) => {
        setSocialAccounts(prev => prev.filter(s => s.id !== id));
    };
    const moveSocial = (index: number, dir: -1 | 1) => {
        setSocialAccounts(prev => {
            const next = [...prev];
            const swap = index + dir;
            if (swap < 0 || swap >= next.length) return prev;
            [next[index], next[swap]] = [next[swap], next[index]];
            return next;
        });
    };
    const handleSaveSocial = async () => {
        setIsSavingSocial(true);
        try {
            await saveSocialAccounts(socialAccounts);
            showNotification("Saved", "Social accounts updated.");
        } catch {
            showNotification("Error", "Failed to save social accounts.");
        } finally {
            setIsSavingSocial(false);
        }
    };

    const handleBrowseProperties = async () => {
        if (!analytics.serviceAccountJson.trim()) return;
        setLoadingProperties(true);
        setPropertiesError(null);
        setProperties([]);
        try {
            const res = await fetch('/api/analytics/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceAccountJson: analytics.serviceAccountJson }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load properties');
            setProperties(data.properties);
            if (data.properties.length === 0) setPropertiesError('No GA4 properties found for this service account.');
        } catch (e: unknown) {
            setPropertiesError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setLoadingProperties(false);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <HeartLoader />
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-content-primary">General Settings</h1>
                <p className="text-sm text-content-secondary mt-1">Site-wide configuration</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Injected Scripts */}
                <div className="card border-0 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
                            <Code className="h-4 w-4 text-accent" />
                            Injected Scripts
                        </h2>
                        <button type="button" onClick={addScript} className="h-7 w-7 flex items-center justify-center rounded bg-surface-input hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-sm text-content-muted">
                        Code injected into the <code className="bg-surface-input px-1.5 py-0.5 rounded text-xs font-mono text-content-secondary">&lt;head&gt;</code> or <code className="bg-surface-input px-1.5 py-0.5 rounded text-xs font-mono text-content-secondary">&lt;body&gt;</code> of every page.
                        Use for analytics, tag managers, and similar integrations.
                    </p>

                    {scripts.length === 0 && (
                        <p className="text-sm text-content-muted text-center py-6 border border-dashed border-ui-border rounded-lg">
                            No scripts added yet. Click &ldquo;Add Script&rdquo; to get started.
                        </p>
                    )}

                    <div className="space-y-4">
                        {scripts.map((script, index) => (
                            <div key={script.id} className="border border-ui-border rounded-lg overflow-hidden">
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-input border-b border-ui-border">
                                    <span className="text-xs text-content-muted font-mono w-5 flex-shrink-0">{index + 1}</span>
                                    <input
                                        type="text"
                                        value={script.name}
                                        onChange={e => updateScript(script.id, { name: e.target.value })}
                                        placeholder="Script name (e.g. Google Tag Manager)"
                                        className="form-input flex-1 min-w-0 text-sm px-3 py-1"
                                    />
                                    <div className="flex items-center gap-0.5 bg-surface-secondary border border-ui-border rounded-md p-0.5 flex-shrink-0">
                                        {(["header", "body", "footer"] as const).map(loc => (
                                            <button
                                                key={loc}
                                                type="button"
                                                onClick={() => updateScript(script.id, { location: loc })}
                                                className={`text-xs px-2.5 py-1 rounded capitalize transition-colors ${
                                                    script.location === loc ? "bg-accent text-white" : "text-content-muted hover:text-content-secondary"
                                                }`}
                                            >
                                                {loc}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateScript(script.id, { enabled: !script.enabled })}
                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                                            script.enabled ? "bg-accent" : "bg-surface-secondary border border-ui-border"
                                        }`}
                                        role="switch"
                                        aria-checked={script.enabled}
                                    >
                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${script.enabled ? "translate-x-4" : "translate-x-0"}`} />
                                    </button>
                                    <button type="button" onClick={() => removeScript(script.id)} className="text-content-muted hover:text-red-500 transition-colors flex-shrink-0">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <textarea
                                    value={script.code}
                                    onChange={e => updateScript(script.id, { code: e.target.value })}
                                    placeholder={"<!-- Paste your script here -->\n<script>...</script>"}
                                    rows={6}
                                    spellCheck={false}
                                    className={`w-full font-mono text-xs bg-surface-primary p-4 text-content-primary placeholder-content-muted resize-y focus:outline-none focus:ring-1 focus:ring-inset focus:ring-accent/50 block transition-opacity ${!script.enabled ? "opacity-40" : ""}`}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button type="button" onClick={handleSaveScripts} disabled={isSavingScripts} className="btn-primary flex items-center gap-2">
                            {isSavingScripts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                        </button>
                    </div>
                </div>

                {/* Right: Analytics Settings */}
                <div className="card border-0 p-6 space-y-5">
                    <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-accent" />
                        Analytics — Google Analytics 4
                    </h2>
                    <p className="text-sm text-content-muted">
                        Connect GA4 to display traffic data on the dashboard. Requires a service account with the Analytics Viewer role.
                    </p>

                    {/* Service Account JSON */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-content-secondary">Service Account JSON</label>
                        <textarea
                            value={analytics.serviceAccountJson}
                            onChange={e => {
                                setAnalytics(prev => ({ ...prev, serviceAccountJson: e.target.value }));
                                setProperties([]);
                                setPropertiesError(null);
                            }}
                            placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
                            rows={7}
                            spellCheck={false}
                            className="form-input w-full px-3 py-2 text-xs font-mono resize-y"
                        />
                        <p className="text-xs text-content-muted">Paste the full contents of the downloaded JSON key file.</p>
                    </div>

                    {/* GA4 Property */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-content-secondary">GA4 Property</label>
                            <button
                                type="button"
                                onClick={handleBrowseProperties}
                                disabled={!analytics.serviceAccountJson.trim() || loadingProperties}
                                className="btn-secondary flex items-center gap-1.5 text-xs py-1 px-2.5 disabled:opacity-40"
                            >
                                {loadingProperties
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <ChevronDown className="h-3 w-3" />}
                                Browse properties
                            </button>
                        </div>

                        {properties.length > 0 ? (
                            <select
                                value={analytics.propertyId}
                                onChange={e => setAnalytics(prev => ({ ...prev, propertyId: e.target.value }))}
                                className="form-input w-full px-3 py-2 text-sm"
                            >
                                <option value="">— Select a property —</option>
                                {properties.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} — {p.account} (ID: {p.id})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={analytics.propertyId}
                                onChange={e => setAnalytics(prev => ({ ...prev, propertyId: e.target.value }))}
                                placeholder="123456789"
                                className="form-input w-full px-3 py-2 text-sm font-mono"
                            />
                        )}

                        {propertiesError && (
                            <p className="text-xs text-red-400">{propertiesError}</p>
                        )}
                        <p className="text-xs text-content-muted">
                            Click &ldquo;Browse properties&rdquo; to auto-detect, or enter the numeric Property ID manually (GA4 Admin &rarr; Property Details).
                        </p>
                    </div>

                    {/* Chart toggles */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-content-secondary">Charts to display on dashboard</p>
                        {(Object.keys(CHART_LABELS) as (keyof AnalyticsSettings['charts'])[]).map(key => (
                            <label key={key} className="flex items-center gap-3 cursor-pointer group">
                                <button
                                    type="button"
                                    onClick={() => updateAnalyticsChart(key, !analytics.charts[key])}
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                                        analytics.charts[key] ? "bg-accent" : "bg-surface-secondary border border-ui-border"
                                    }`}
                                    role="switch"
                                    aria-checked={analytics.charts[key]}
                                >
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${analytics.charts[key] ? "translate-x-4" : "translate-x-0"}`} />
                                </button>
                                <span className="text-sm text-content-secondary group-hover:text-content-primary transition-colors">{CHART_LABELS[key]}</span>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button type="button" onClick={handleSaveAnalytics} disabled={isSavingAnalytics} className="btn-primary flex items-center gap-2">
                            {isSavingAnalytics ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                        </button>
                    </div>
                </div>

                {/* Third column: Social Media */}
                <div className="card border-0 p-6 space-y-4 h-fit">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2">
                            <Share2 className="h-4 w-4 text-accent" />
                            Social Media
                        </h2>
                        <button type="button" onClick={addSocial} className="h-7 w-7 flex items-center justify-center rounded bg-surface-input hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-sm text-content-muted">
                        Your organisation&apos;s social media profiles.
                    </p>

                    {socialAccounts.length === 0 && (
                        <p className="text-sm text-content-muted text-center py-6 border border-dashed border-ui-border rounded-lg">
                            No accounts added yet.
                        </p>
                    )}

                    <div className="space-y-2">
                        {socialAccounts.map((account, index) => (
                            <div key={account.id} className="flex items-center gap-2 px-3 py-2 bg-surface-input rounded-lg">
                                <div className="w-32 flex-shrink-0">
                                    <EnhancedSelect
                                        value={account.platform}
                                        onChange={v => updateSocial(account.id, { platform: v as SocialPlatform })}
                                        options={SOCIAL_PLATFORMS}
                                        textSize="text-xs"
                                        className="[&_button]:!bg-surface-secondary"
                                    />
                                </div>
                                <input
                                    type={account.platform === 'email' ? 'email' : account.platform === 'phone' ? 'tel' : 'url'}
                                    value={account.url}
                                    onChange={e => updateSocial(account.id, { url: e.target.value })}
                                    placeholder={account.platform === 'email' ? 'hello@example.com' : account.platform === 'phone' ? '+1 (808) 000-0000' : 'https://'}
                                    className="form-input flex-1 min-w-0 text-xs px-2 py-1 !bg-surface-secondary"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateSocial(account.id, { hidden: !account.hidden })}
                                    className={`p-1 rounded flex-shrink-0 transition-colors ${account.hidden ? 'text-content-muted opacity-40 hover:opacity-100' : 'text-content-muted hover:text-content-primary'}`}
                                    aria-label={account.hidden ? "Show" : "Hide"}
                                >
                                    {account.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => moveSocial(index, -1)}
                                        disabled={index === 0}
                                        className="p-1 rounded text-content-muted hover:text-content-primary transition-colors disabled:opacity-25"
                                        aria-label="Move up"
                                    >
                                        <ArrowUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveSocial(index, 1)}
                                        disabled={index === socialAccounts.length - 1}
                                        className="p-1 rounded text-content-muted hover:text-content-primary transition-colors disabled:opacity-25"
                                        aria-label="Move down"
                                    >
                                        <ArrowDown className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeSocial(account.id)}
                                        className="p-1 rounded text-content-muted hover:text-red-500 transition-colors"
                                        aria-label="Remove"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <button type="button" onClick={handleSaveSocial} disabled={isSavingSocial} className="btn-primary flex items-center gap-2">
                            {isSavingSocial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
