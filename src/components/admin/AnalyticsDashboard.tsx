"use client";

import { useEffect, useState, useCallback } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Globe, Monitor, Smartphone, Tablet, Calendar, RefreshCw, Info } from "lucide-react";
import Link from "next/link";
import { HeartLoader } from "@/components/ui/HeartLoader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricValue { value: number; prev: number; }
interface Summary {
    sessions: MetricValue;
    visitors: MetricValue;
    pageviews: MetricValue;
    avgDuration: MetricValue;
    bounceRate: MetricValue;
    pagesPerSession: MetricValue;
    engagedSessions: MetricValue;
}
interface TrafficPoint { date: string; sessions: number; pageviews: number; }
interface PageData { page: string; views: number; bounceRate: number; }
interface SourceData { source: string; sessions: number; }
interface SourceDetailData { channel: string; source: string; sessions: number; }
interface DeviceData { device: string; sessions: number; }
interface MobileOSData { os: string; sessions: number; }
interface CountryData { country: string; sessions: number; }
interface CityData { city: string; sessions: number; }
interface KeywordData { keyword: string; sessions: number; }
interface NVRData { type: string; sessions: number; }
interface OrganicQueryData { query: string; clicks: number; impressions: number; position: number; }
interface AnalyticsData {
    summary: Summary;
    traffic: TrafficPoint[];
    topPages: PageData[];
    sources: SourceData[];
    sourceDetail: SourceDetailData[];
    devices: DeviceData[];
    mobileOS: MobileOSData[];
    countries: CountryData[];
    cities: CityData[];
    keywords: KeywordData[];
    organicQueries: OrganicQueryData[];
    searchConsoleError?: string | null;
    newVsReturning: NVRData[];
    charts: { traffic: boolean; topPages: boolean; sources: boolean; };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctChange(current: number, prev: number): number | null {
    if (prev === 0) return null;
    return ((current - prev) / prev) * 100;
}

function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
}

function formatDate(d: string): string {
    const y = d.slice(0, 4), m = d.slice(4, 6), day = d.slice(6, 8);
    return new Date(`${y}-${m}-${day}`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toAPIDate(iso: string): string { return iso.replace(/-/g, ""); }

function fromAPIDate(d: string): string {
    // "20260201" → "Feb 1"
    if (d.match(/^\d{8}$/)) {
        return new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (d === "today") return "today";
    const m = d.match(/^(\d+)daysAgo$/);
    if (m) {
        const dt = new Date(); dt.setDate(dt.getDate() - parseInt(m[1]));
        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return d;
}

const DEVICE_ICONS: Record<string, typeof Monitor> = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
};

const DEVICE_COLORS = ["var(--accent)", "#10b981", "#34d399", "#f59e0b"];

const tooltipStyle = {
    background: "var(--surface-secondary)",
    border: "1px solid var(--ui-border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--content-primary)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

function InfoTooltip({ text }: { text: string }) {
    return (
        <span className="relative group/info inline-flex items-center cursor-default">
            <Info className="h-3 w-3 text-content-muted/40 group-hover/info:text-content-muted transition-colors" />
            <span
                className="pointer-events-none absolute left-0 top-full mt-1.5 w-60 rounded-lg px-3 py-2 text-xs text-content-primary leading-relaxed opacity-0 group-hover/info:opacity-100 transition-opacity z-50 normal-case tracking-normal font-normal"
                style={{
                    background: "var(--surface-secondary)",
                    border: "1px solid rgba(128,128,128,0.25)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                }}
            >
                {text}
            </span>
        </span>
    );
}

// ─── Preset ranges ────────────────────────────────────────────────────────────

const PRESETS = [
    { label: "7d",  start: "7daysAgo",   end: "today" },
    { label: "30d", start: "30daysAgo",  end: "today" },
    { label: "90d", start: "90daysAgo",  end: "today" },
    { label: "1y",  start: "365daysAgo", end: "today" },
];

function todayISO(): string { return new Date().toISOString().slice(0, 10); }
function nDaysAgoISO(n: number): string {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string;
    pct: number | null;
    prevLabel: string;
    /** When true, a decrease is good (e.g. bounce rate) */
    lowerIsBetter?: boolean;
}
function StatCard({ label, value, pct, prevLabel, lowerIsBetter }: StatCardProps) {
    // Determine if the change is "good" for colouring purposes
    const rawIsPositive = pct !== null && pct > 0;
    const rawIsNegative = pct !== null && pct < 0;
    const isGood  = lowerIsBetter ? rawIsNegative : rawIsPositive;
    const isBad   = lowerIsBetter ? rawIsPositive : rawIsNegative;
    const display = pct !== null ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%` : null;

    return (
        <div className="card p-5 flex flex-col gap-1">
            <span className="text-[11px] text-content-muted font-medium uppercase tracking-wide leading-none">{label}</span>
            <span className="text-2xl font-bold text-content-primary tabular-nums mt-1">{value}</span>
            <div className="flex items-center gap-1.5 mt-1">
                {display === null ? (
                    <span className="text-[11px] text-content-muted flex items-center gap-1"><Minus className="h-3 w-3" /> no prev data</span>
                ) : isGood ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                        {rawIsPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {display}
                    </span>
                ) : isBad ? (
                    <span className="text-[11px] text-red-400 flex items-center gap-1">
                        {rawIsPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {display}
                    </span>
                ) : (
                    <span className="text-[11px] text-content-muted flex items-center gap-1"><Minus className="h-3 w-3" /> 0%</span>
                )}
                <span className="text-[11px] text-content-muted">vs. {prevLabel}</span>
            </div>
        </div>
    );
}

// ─── RankedBar ────────────────────────────────────────────────────────────────

function RankedBar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
    return (
        <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-content-secondary truncate">{label}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {sub && <span className="text-xs text-content-muted">{sub}</span>}
                    <span className="text-xs text-content-muted tabular-nums">{value.toLocaleString()}</span>
                </div>
            </div>
            <div className="h-1 rounded-full bg-surface-input overflow-hidden">
                <div className="h-full rounded-full bg-accent/60" style={{ width: `${(value / max) * 100}%` }} />
            </div>
        </div>
    );
}



// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Range state
    const [preset, setPreset] = useState("30d");
    const [customStart, setCustomStart] = useState(nDaysAgoISO(30));
    const [customEnd, setCustomEnd] = useState(todayISO());
    const [showCustom, setShowCustom] = useState(false);
    const [start, setStart] = useState("30daysAgo");
    const [end, setEnd] = useState("today");

    const fetchData = useCallback((s: string, e: string, isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        setError(null);
        fetch(`/api/analytics/data?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`)
            .then(r => {
                if (r.status === 404) { setError("not_configured"); return null; }
                if (!r.ok) return r.json().then(d => { throw new Error(d.error || "Failed"); });
                return r.json();
            })
            .then(d => {
                if (d) { setData(d); setLastUpdated(new Date()); }
            })
            .catch(e => setError(e.message))
            .finally(() => { setLoading(false); setRefreshing(false); });
    }, []);

    useEffect(() => { fetchData("30daysAgo", "today"); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const applyPreset = (p: typeof PRESETS[0]) => {
        setPreset(p.label);
        setShowCustom(false);
        setStart(p.start);
        setEnd(p.end);
        fetchData(p.start, p.end);
    };

    const applyCustom = () => {
        if (!customStart || !customEnd) return;
        const s = toAPIDate(customStart);
        const e = toAPIDate(customEnd);
        setPreset("");
        setStart(s);
        setEnd(e);
        fetchData(s, e);
    };

    const handleRefresh = () => fetchData(start, end, true);

    // ── Error states ───────────────────────────────────────────────────────────

    if (error === "not_configured") {
        return (
            <div className="card p-8 text-center text-sm text-content-muted">
                Analytics not configured.{" "}
                <Link href="/admin/settings" className="text-accent hover:underline">Set up GA4 in Settings.</Link>
            </div>
        );
    }

    if (!loading && (error || !data)) {
        return (
            <div className="card p-8 text-center text-sm text-content-muted">
                Unable to load analytics data.{" "}
                {error && <span className="text-red-400 font-mono text-xs">{error}</span>}
            </div>
        );
    }

    // ── Toolbar ────────────────────────────────────────────────────────────────

    const periodLabel = `${fromAPIDate(start)} – ${fromAPIDate(end)}`;

    const toolbar = (
        <div className="flex items-center gap-2 flex-wrap">
            {!loading && lastUpdated && (
                <span className="text-[11px] text-content-muted hidden sm:block">
                    {periodLabel} · updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
            )}
            <div className="flex items-center bg-surface-input rounded-lg p-0.5 gap-0.5">
                {PRESETS.map(p => (
                    <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        disabled={loading}
                        className={`text-xs px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 ${
                            preset === p.label && !showCustom
                                ? "bg-accent text-white font-medium"
                                : "text-content-muted hover:text-content-secondary"
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setShowCustom(v => !v)}
                    disabled={loading}
                    className={`text-xs px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-40 ${
                        showCustom ? "bg-accent text-white font-medium" : "text-content-muted hover:text-content-secondary"
                    }`}
                >
                    <Calendar className="h-3 w-3" />
                    Custom
                </button>
            </div>
            {showCustom && (
                <div className="flex items-center gap-2">
                    <input type="date" value={customStart} max={customEnd} onChange={e => setCustomStart(e.target.value)} className="form-input px-2 py-1 text-xs" />
                    <span className="text-xs text-content-muted">to</span>
                    <input type="date" value={customEnd} min={customStart} max={todayISO()} onChange={e => setCustomEnd(e.target.value)} className="form-input px-2 py-1 text-xs" />
                    <button type="button" onClick={applyCustom} className="btn-primary text-xs py-1 px-3">Apply</button>
                </div>
            )}
            <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="p-1.5 rounded-md bg-surface-input text-content-muted hover:text-content-secondary transition-colors disabled:opacity-40"
                title="Refresh"
            >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
        </div>
    );

    // ── Loading ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-accent" />
                        Analytics
                    </h2>
                    {toolbar}
                </div>
                <div className="flex items-center justify-center h-48">
                    <HeartLoader />
                </div>
            </div>
        );
    }

    if (!data) return null;

    // ── Derived values ─────────────────────────────────────────────────────────

    const { summary, traffic, topPages, sources, sourceDetail, devices, mobileOS, countries, cities, keywords, organicQueries, searchConsoleError, newVsReturning, charts } = data;

    const engagementRate = summary.sessions.value > 0
        ? (summary.engagedSessions.value / summary.sessions.value) * 100
        : 0;
    const prevEngagementRate = summary.sessions.prev > 0
        ? (summary.engagedSessions.prev / summary.sessions.prev) * 100
        : 0;

    const prevLabel = "prev period";

    const statCards: StatCardProps[] = [
        { label: "Sessions",         value: summary.sessions.value.toLocaleString(),              pct: pctChange(summary.sessions.value, summary.sessions.prev),                 prevLabel, },
        { label: "Visitors",          value: summary.visitors.value.toLocaleString(),              pct: pctChange(summary.visitors.value, summary.visitors.prev),                 prevLabel, },
        { label: "Page Views",        value: summary.pageviews.value.toLocaleString(),             pct: pctChange(summary.pageviews.value, summary.pageviews.prev),               prevLabel, },
        { label: "Avg. Time on Site", value: formatDuration(summary.avgDuration.value),            pct: pctChange(summary.avgDuration.value, summary.avgDuration.prev),           prevLabel, },
        { label: "Bounce Rate",       value: `${(summary.bounceRate.value * 100).toFixed(1)}%`,   pct: pctChange(summary.bounceRate.value, summary.bounceRate.prev),              prevLabel, lowerIsBetter: true },
        { label: "Pages / Session",   value: summary.pagesPerSession.value.toFixed(2),            pct: pctChange(summary.pagesPerSession.value, summary.pagesPerSession.prev),   prevLabel, },
        { label: "Engaged Sessions",  value: summary.engagedSessions.value.toLocaleString(),      pct: pctChange(summary.engagedSessions.value, summary.engagedSessions.prev),   prevLabel, },
        { label: "Engagement Rate",   value: `${engagementRate.toFixed(1)}%`,                     pct: pctChange(engagementRate, prevEngagementRate),                            prevLabel, },
    ];

    const formattedTraffic = traffic.map(p => ({ ...p, date: formatDate(p.date) }));
    const maxPageViews     = Math.max(...topPages.map(p => p.views), 1);
    const maxSessions      = Math.max(...sources.map(s => s.sessions), 1);
    const maxCountry       = Math.max(...countries.map(c => c.sessions), 1);
    const maxCity          = Math.max(...(cities ?? []).map(c => c.sessions), 1);
    const maxKeyword       = Math.max(...(keywords ?? []).map(k => k.sessions), 1);

    const newVisitors    = newVsReturning.find(r => r.type === "new")?.sessions ?? 0;
    const returnVisitors = newVsReturning.find(r => r.type === "returning")?.sessions ?? 0;
    const nvrTotal       = newVisitors + returnVisitors || 1;
    const totalDevices   = devices.reduce((s, d) => s + d.sessions, 0) || 1;
    const mobileSessions = devices.find(d => d.device.toLowerCase() === "mobile")?.sessions ?? 0;
    const mobileOSFiltered = (mobileOS ?? []).filter(r => ["ios", "android"].includes(r.os.toLowerCase()));
    const totalMobileOS  = mobileOSFiltered.reduce((s, r) => s + r.sessions, 0) || 1;

    return (
        <div className="space-y-4">

            {/* Header + Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-content-secondary uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Analytics
                </h2>
                {toolbar}
            </div>

            {/* Stat cards — 4 columns on md, 8 on xl */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                {statCards.map(card => <StatCard key={card.label} {...card} />)}
            </div>

            {/* Traffic chart */}
            {charts.traffic && formattedTraffic.length > 0 && (
                <div className="card">
                    <div className="px-6 pt-6 pb-3" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                        <h3 className="text-sm font-semibold text-content-primary flex items-center gap-1.5">
                            Traffic Over Time
                            <InfoTooltip text="Daily sessions and pageviews across the selected date range. Sessions count each visit; pageviews count every page loaded within those visits." />
                        </h3>
                    </div>
                    <div className="px-6 pb-6 pt-5">
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={formattedTraffic} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradPageviews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border)" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--content-muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11, fill: "var(--content-muted)" }} tickLine={false} axisLine={false} width={36} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--ui-border-hover)" }} />
                            <Area type="monotone" dataKey="sessions"  stroke="var(--accent)" strokeWidth={2} fill="url(#gradSessions)"  dot={false} name="Sessions" />
                            <Area type="monotone" dataKey="pageviews" stroke="#10b981"        strokeWidth={2} fill="url(#gradPageviews)" dot={false} name="Pageviews" />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-3 justify-end">
                        {[{ color: "var(--accent)", label: "Sessions" }, { color: "#10b981", label: "Pageviews" }].map(({ color, label }) => (
                            <span key={label} className="flex items-center gap-1.5 text-xs text-content-muted">
                                <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
                                {label}
                            </span>
                        ))}
                    </div>
                    </div>
                </div>
            )}

            {/* Top Pages + Sources + Keywords + Organic Queries */}
            {(charts.topPages || charts.sources) && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {charts.topPages && topPages.length > 0 && (
                        <div className="card h-[430px] flex flex-col">
                            <div className="px-6 pt-6 pb-3 flex-shrink-0">
                                <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wide flex items-center gap-1.5">
                                    Top Pages
                                    <InfoTooltip text="Your most visited pages ranked by total pageviews. Bounce rate shows the percentage of visitors who left without clicking to another page." />
                                </h3>
                            </div>
                            <div className="px-6 pb-2 flex-shrink-0 grid grid-cols-[1fr_44px_48px]" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                                <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide">Page</span>
                                <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide text-right">Views</span>
                                <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide text-right">Bounce</span>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 pb-2">
                                {topPages.map((p, i) => (
                                    <div key={i} className="py-2">
                                        <div className="grid grid-cols-[1fr_44px_48px]">
                                            <span className="text-xs text-content-primary truncate pr-2">{p.page}</span>
                                            <span className="text-xs text-content-secondary tabular-nums text-right">{p.views.toLocaleString()}</span>
                                            <span className="text-xs text-content-muted tabular-nums text-right">{p.bounceRate > 0 ? `${(p.bounceRate * 100).toFixed(0)}%` : '—'}</span>
                                        </div>
                                        <div className="mt-1.5 h-[2px] w-full rounded-full" style={{ background: "var(--ui-border)" }}>
                                            <div className="h-full rounded-full" style={{ width: `${Math.min((p.bounceRate || 0) * 100, 100)}%`, background: p.bounceRate >= 0.7 ? '#ef4444' : p.bounceRate >= 0.4 ? '#f59e0b' : '#10b981' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {charts.sources && sources.length > 0 && (
                        <div className="card h-[430px] flex flex-col">
                            <div className="px-6 pt-6 pb-3 flex-shrink-0" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                                <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wide flex items-center gap-1.5">
                                    Traffic Sources
                                    <InfoTooltip text="How visitors arrive at your site — organic search, direct, social media, email, referrals, etc. Sub-items show the individual sources within each channel." />
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 pb-6">
                                {sources.map((s, i) => {
                                    const subs = (sourceDetail ?? [])
                                        .filter(d => d.channel === s.source)
                                        .slice(0, 4);
                                    return (
                                        <div key={i} className={i > 0 ? 'mt-2 border-t border-ui-border pt-2' : 'pt-2'}>
                                            <RankedBar label={s.source || "Direct"} value={s.sessions} max={maxSessions} />
                                            {subs.length > 0 && (
                                                <div className="ml-2 mt-1 space-y-1 pl-2 border-l border-ui-border">
                                                    {subs.map((d, j) => (
                                                        <div key={j} className="flex items-center justify-between gap-2">
                                                            <span className="text-[11px] text-content-muted truncate">{d.source}</span>
                                                            <span className="text-[11px] text-content-muted tabular-nums flex-shrink-0">{d.sessions.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="card h-[430px] flex flex-col">
                        <div className="px-6 pt-6 pb-3 flex-shrink-0">
                            <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wide flex items-center gap-1.5">
                                Top On Site Searches
                                <InfoTooltip text="Terms visitors typed into your site's internal search box. Shows what people are actively looking for once they're on the site." />
                            </h3>
                        </div>
                        {keywords && keywords.length > 0 ? (
                            <>
                                <div className="px-6 pb-2 flex-shrink-0 grid grid-cols-[1fr_56px]" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                                    <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide">Search Term</span>
                                    <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide text-right">Sessions</span>
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 pb-6">
                                    {keywords.map((k, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_56px] py-2 border-b border-ui-border last:border-0">
                                            <span className="text-xs text-content-primary truncate pr-2">{k.keyword}</span>
                                            <span className="text-xs text-content-secondary tabular-nums text-right">{k.sessions.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 px-6 pb-6">
                                <p className="text-xs text-content-muted leading-relaxed">
                                    No keyword data available. Enable{" "}
                                    <a href="https://support.google.com/analytics/answer/1012264" target="_blank" rel="noreferrer" className="text-accent hover:underline">site search tracking</a>{" "}
                                    in GA4 or link a Google Ads account to populate this section.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Organic Search Queries (Search Console) */}
                    <div className="card h-[430px] flex flex-col">
                        <div className="px-6 pt-6 pb-3 flex-shrink-0">
                            <h3 className="text-xs font-semibold text-content-muted uppercase tracking-wide flex items-center gap-1.5">
                                Organic Queries
                                <InfoTooltip text="Google search terms that led visitors to your site, sourced from Google Search Console. Clicks = visits from that query. Impressions = how many times it appeared in results. Position = average rank in search results." />
                            </h3>
                            <p className="text-xs text-content-muted mt-0.5">via Search Console</p>
                        </div>
                        {organicQueries && organicQueries.length > 0 ? (
                            <>
                                <div className="px-6 pb-2 flex-shrink-0 grid grid-cols-[1fr_48px_56px_38px]" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                                    <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide">Query</span>
                                    <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide text-right">Clicks</span>
                                    <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide text-right">Impr.</span>
                                    <span className="text-[10px] font-medium text-content-muted uppercase tracking-wide text-right">Pos.</span>
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 pb-6">
                                    {organicQueries.map((q, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_48px_56px_38px] py-2 border-b border-ui-border last:border-0">
                                            <span className="text-xs text-content-primary truncate pr-2">{q.query}</span>
                                            <span className="text-xs text-content-secondary tabular-nums text-right">{q.clicks.toLocaleString()}</span>
                                            <span className="text-xs text-content-muted tabular-nums text-right">{q.impressions.toLocaleString()}</span>
                                            <span className={`text-xs tabular-nums text-right ${q.position <= 3 ? 'text-emerald-500' : q.position <= 10 ? 'text-accent' : 'text-content-muted'}`}>{q.position}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 px-6 pb-6">
                                <p className="text-xs leading-relaxed" style={{ color: searchConsoleError ? 'var(--color-red-400, #f87171)' : undefined }}>
                                    {searchConsoleError
                                        ? searchConsoleError
                                        : <>No data yet. Add your Search Console site URL in{" "}<a href="/admin/settings" className="text-accent hover:underline">Analytics Settings</a>.</>
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* Devices + New vs Returning + Countries + Cities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Devices */}
                {devices.length > 0 && (
                    <div className="card">
                        <div className="px-6 pt-6 pb-3" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                            <h3 className="text-sm font-semibold text-content-primary flex items-center gap-1.5">
                                Devices
                                <InfoTooltip text="Breakdown of sessions by device type — desktop, mobile, or tablet. Mobile sub-items show the iOS vs Android split." />
                            </h3>
                        </div>
                        <div className="px-6 py-4">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={devices}
                                        dataKey="sessions"
                                        nameKey="device"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={36}
                                        outerRadius={62}
                                        strokeWidth={0}
                                        label={(props: { cx: number; cy: number; midAngle: number; outerRadius: number; index: number; device: string; sessions: number }) => {
                                            const { cx, cy, midAngle, outerRadius: or, index, device, sessions } = props;
                                            const RADIAN = Math.PI / 180;
                                            const sin = Math.sin(-midAngle * RADIAN);
                                            const cos = Math.cos(-midAngle * RADIAN);
                                            const ex = cx + (or + 14) * cos;
                                            const ey = cy + (or + 14) * sin;
                                            const tx = cx + (or + 22) * cos;
                                            const ty = cy + (or + 22) * sin;
                                            const anchor = tx > cx ? "start" : "end";
                                            const pct = ((sessions / totalDevices) * 100).toFixed(1);
                                            const isMobile = device.toLowerCase() === "mobile";
                                            const osLine = isMobile && mobileOSFiltered.length > 0
                                                ? mobileOSFiltered.map(r => `${r.os} ${((r.sessions / totalMobileOS) * 100).toFixed(0)}%`).join(" · ")
                                                : null;
                                            const color = DEVICE_COLORS[index % DEVICE_COLORS.length];
                                            return (
                                                <g>
                                                    <line x1={cx + or * cos} y1={cy + or * sin} x2={ex} y2={ey} stroke="var(--content-muted)" strokeWidth={1} />
                                                    <circle cx={ex} cy={ey} r={4} fill={color} />
                                                    <text x={tx} y={ty} textAnchor={anchor} dominantBaseline="central" style={{ fontSize: 11, fontWeight: 600, fill: "var(--content-primary)", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>
                                                        {device} {pct}%
                                                    </text>
                                                    {osLine && (
                                                        <text x={tx} y={ty + 13} textAnchor={anchor} dominantBaseline="central" style={{ fontSize: 10, fill: "var(--content-muted)" }}>
                                                            {osLine}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        }}
                                        labelLine={false}
                                    >
                                        {devices.map((_, i) => (
                                            <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* New vs Returning */}
                {(newVisitors > 0 || returnVisitors > 0) && (
                    <div className="card">
                        <div className="px-6 pt-6 pb-3" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                            <h3 className="text-sm font-semibold text-content-primary flex items-center gap-1.5">
                                New vs Returning
                                <InfoTooltip text="Whether visitors are first-time users or have been to the site before. Determined by browser/device recognition — returning counts the same device visiting again." />
                            </h3>
                        </div>
                        <div className="px-6 py-4">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: "New", value: newVisitors },
                                            { name: "Returning", value: returnVisitors },
                                        ]}
                                        dataKey="value"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={36}
                                        outerRadius={62}
                                        strokeWidth={0}
                                        label={(props: { cx: number; cy: number; midAngle: number; outerRadius: number; index: number; name: string; value: number }) => {
                                            const { cx, cy, midAngle, outerRadius: or, index, name, value } = props;
                                            const NVR_COLORS = ["var(--accent)", "#10b981"];
                                            const RADIAN = Math.PI / 180;
                                            const sin = Math.sin(-midAngle * RADIAN);
                                            const cos = Math.cos(-midAngle * RADIAN);
                                            const ex = cx + (or + 14) * cos;
                                            const ey = cy + (or + 14) * sin;
                                            const tx = cx + (or + 22) * cos;
                                            const ty = cy + (or + 22) * sin;
                                            const anchor = tx > cx ? "start" : "end";
                                            const pct = ((value / nvrTotal) * 100).toFixed(1);
                                            const color = NVR_COLORS[index];
                                            return (
                                                <g>
                                                    <line x1={cx + or * cos} y1={cy + or * sin} x2={ex} y2={ey} stroke="var(--content-muted)" strokeWidth={1} />
                                                    <circle cx={ex} cy={ey} r={4} fill={color} />
                                                    <text x={tx} y={ty} textAnchor={anchor} dominantBaseline="central" style={{ fontSize: 11, fontWeight: 600, fill: "var(--content-primary)", textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>
                                                        {name} {pct}%
                                                    </text>
                                                </g>
                                            );
                                        }}
                                        labelLine={false}
                                    >
                                        <Cell fill="var(--accent)" />
                                        <Cell fill="#10b981" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Top Countries */}
                {countries.length > 0 && (
                    <div className="card">
                        <div className="px-6 pt-6 pb-3" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                            <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 text-content-muted" />
                                Top Countries
                                <InfoTooltip text="Countries generating the most sessions during the selected period. Useful for understanding the geographic reach of your audience." />
                            </h3>
                        </div>
                        <div className="px-6 pb-4">
                            {countries.slice(0, 6).map((c, i) => (
                                <div key={i} className="py-2 border-b border-ui-border last:border-0">
                                    <RankedBar label={c.country} value={c.sessions} max={maxCountry} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Cities */}
                {cities && cities.length > 0 && (
                    <div className="card">
                        <div className="px-6 pt-6 pb-3" style={{ borderBottom: '2px solid rgba(128,128,128,0.2)' }}>
                            <h3 className="text-sm font-semibold text-content-primary flex items-center gap-1.5">
                                Top Cities
                                <InfoTooltip text="Cities generating the most sessions. Based on IP geolocation — useful for identifying local demand and where to focus regional marketing." />
                            </h3>
                        </div>
                        <div className="px-6 pb-4">
                            {cities.slice(0, 6).map((c, i) => (
                                <div key={i} className="py-2 border-b border-ui-border last:border-0">
                                    <RankedBar label={c.city} value={c.sessions} max={maxCity} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

        </div>
    );
}
