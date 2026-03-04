"use client";

import { useEffect, useState, useCallback } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, Minus, Globe, Monitor, Smartphone, Tablet, Calendar, RefreshCw } from "lucide-react";
import Link from "next/link";

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
interface DeviceData { device: string; sessions: number; }
interface CountryData { country: string; sessions: number; }
interface NVRData { type: string; sessions: number; }
interface AnalyticsData {
    summary: Summary;
    traffic: TrafficPoint[];
    topPages: PageData[];
    sources: SourceData[];
    devices: DeviceData[];
    countries: CountryData[];
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

const DEVICE_COLORS = ["var(--accent)", "#a78bfa", "#34d399", "#f59e0b"];

const tooltipStyle = {
    background: "var(--surface-secondary)",
    border: "1px solid var(--ui-border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--content-primary)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

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
        <div className="card border-0 p-5 flex flex-col gap-1">
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
            <div className="card border-0 p-8 text-center text-sm text-content-muted">
                Analytics not configured.{" "}
                <Link href="/admin/settings" className="text-accent hover:underline">Set up GA4 in Settings.</Link>
            </div>
        );
    }

    if (!loading && (error || !data)) {
        return (
            <div className="card border-0 p-8 text-center text-sm text-content-muted">
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
                <div className="flex justify-end">{toolbar}</div>
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-5 w-5 text-accent animate-spin" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    // ── Derived values ─────────────────────────────────────────────────────────

    const { summary, traffic, topPages, sources, devices, countries, newVsReturning, charts } = data;

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

    const newVisitors    = newVsReturning.find(r => r.type === "new")?.sessions ?? 0;
    const returnVisitors = newVsReturning.find(r => r.type === "returning")?.sessions ?? 0;
    const nvrTotal       = newVisitors + returnVisitors || 1;
    const totalDevices   = devices.reduce((s, d) => s + d.sessions, 0) || 1;

    return (
        <div className="space-y-4">

            {/* Toolbar */}
            <div className="flex justify-end flex-wrap gap-3">{toolbar}</div>

            {/* Stat cards — 4 columns on md, 8 on xl */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                {statCards.map(card => <StatCard key={card.label} {...card} />)}
            </div>

            {/* Traffic chart */}
            {charts.traffic && formattedTraffic.length > 0 && (
                <div className="card border-0 p-6">
                    <h3 className="text-sm font-semibold text-content-primary mb-5">Traffic Over Time</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={formattedTraffic} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradPageviews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border)" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--content-muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11, fill: "var(--content-muted)" }} tickLine={false} axisLine={false} width={36} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--ui-border-hover)" }} />
                            <Area type="monotone" dataKey="sessions"  stroke="var(--accent)" strokeWidth={2} fill="url(#gradSessions)"  dot={false} name="Sessions" />
                            <Area type="monotone" dataKey="pageviews" stroke="#a78bfa"        strokeWidth={2} fill="url(#gradPageviews)" dot={false} name="Pageviews" />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-3 justify-end">
                        {[{ color: "var(--accent)", label: "Sessions" }, { color: "#a78bfa", label: "Pageviews" }].map(({ color, label }) => (
                            <span key={label} className="flex items-center gap-1.5 text-xs text-content-muted">
                                <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Pages + Sources */}
            {(charts.topPages || charts.sources) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {charts.topPages && topPages.length > 0 && (
                        <div className="card border-0 p-6">
                            <h3 className="text-sm font-semibold text-content-primary mb-4">Top Pages</h3>
                            <div className="space-y-3">
                                {topPages.map((p, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs text-content-muted font-mono w-4 flex-shrink-0 text-right">{i + 1}</span>
                                        <RankedBar
                                            label={p.page}
                                            value={p.views}
                                            max={maxPageViews}
                                            sub={p.bounceRate > 0 ? `${(p.bounceRate * 100).toFixed(0)}% bounce` : undefined}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {charts.sources && sources.length > 0 && (
                        <div className="card border-0 p-6">
                            <h3 className="text-sm font-semibold text-content-primary mb-4">Traffic Sources</h3>
                            <div className="space-y-3">
                                {sources.map((s, i) => (
                                    <RankedBar key={i} label={s.source || "Direct"} value={s.sessions} max={maxSessions} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Devices + New vs Returning + Countries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Devices */}
                {devices.length > 0 && (
                    <div className="card border-0 p-6">
                        <h3 className="text-sm font-semibold text-content-primary mb-4">Devices</h3>
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width={110} height={110}>
                                <PieChart>
                                    <Pie data={devices} dataKey="sessions" nameKey="device" cx="50%" cy="50%" innerRadius={28} outerRadius={52}>
                                        {devices.map((_, i) => (
                                            <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Sessions"]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2.5">
                                {devices.map((d, i) => {
                                    const Icon = DEVICE_ICONS[d.device.toLowerCase()] ?? Monitor;
                                    const pct = ((d.sessions / totalDevices) * 100).toFixed(1);
                                    return (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DEVICE_COLORS[i % DEVICE_COLORS.length] }} />
                                            <Icon className="h-3.5 w-3.5 text-content-muted flex-shrink-0" />
                                            <span className="text-xs text-content-secondary capitalize flex-1">{d.device}</span>
                                            <span className="text-xs text-content-muted tabular-nums">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* New vs Returning */}
                {(newVisitors > 0 || returnVisitors > 0) && (
                    <div className="card border-0 p-6">
                        <h3 className="text-sm font-semibold text-content-primary mb-4">New vs Returning</h3>
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width={110} height={110}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: "New", value: newVisitors },
                                            { name: "Returning", value: returnVisitors },
                                        ]}
                                        dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={52}
                                    >
                                        <Cell fill="var(--accent)" />
                                        <Cell fill="#a78bfa" />
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Sessions"]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-3">
                                {[
                                    { label: "New",       value: newVisitors,    color: "var(--accent)" },
                                    { label: "Returning", value: returnVisitors, color: "#a78bfa" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                                        <div>
                                            <div className="text-[11px] text-content-muted">{label}</div>
                                            <div className="text-sm font-semibold text-content-primary tabular-nums">{value.toLocaleString()}</div>
                                            <div className="text-[11px] text-content-muted">{((value / nvrTotal) * 100).toFixed(1)}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Countries */}
                {countries.length > 0 && (
                    <div className="card border-0 p-6">
                        <h3 className="text-sm font-semibold text-content-primary mb-4 flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-content-muted" />
                            Top Countries
                        </h3>
                        <div className="space-y-3">
                            {countries.slice(0, 6).map((c, i) => (
                                <RankedBar
                                    key={i}
                                    label={c.country}
                                    value={c.sessions}
                                    max={maxCountry}
                                    sub={`${((c.sessions / maxCountry) * 100).toFixed(0)}%`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
