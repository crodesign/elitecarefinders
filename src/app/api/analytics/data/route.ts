import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function parseDateParam(param: string): Date {
    if (param === 'today') return new Date();
    if (param === 'yesterday') { const d = new Date(); d.setDate(d.getDate() - 1); return d; }
    const m = param.match(/^(\d+)daysAgo$/);
    if (m) { const d = new Date(); d.setDate(d.getDate() - parseInt(m[1])); return d; }
    return new Date(param);
}

function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function getPrevPeriod(start: string, end: string) {
    const startD = parseDateParam(start);
    const endD = parseDateParam(end);
    const duration = endD.getTime() - startD.getTime();
    const prevEndD = new Date(startD.getTime() - 86400000);
    const prevStartD = new Date(prevEndD.getTime() - duration);
    return { startDate: toISODate(prevStartD), endDate: toISODate(prevEndD) };
}

function rowMetric(row: { metricValues?: { value?: string | null }[] } | null | undefined, idx: number): number {
    return parseFloat(row?.metricValues?.[idx]?.value || '0');
}

function settled<T>(result: PromiseSettledResult<{ data: T }>): T | null {
    return result.status === 'fulfilled' ? result.value.data : null;
}

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    const adminRoles = ['super_admin', 'system_admin', 'regional_manager'];
    if (!roleRow || !adminRoles.includes(roleRow.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: settingsRow } = await supabase.from('site_settings').select('value').eq('key', 'analytics_settings').single();
    let settings: { propertyId?: string; serviceAccountJson?: string; charts?: Record<string, boolean> } = {};
    try { settings = JSON.parse(settingsRow?.value || '{}'); } catch { return NextResponse.json({ error: 'Invalid settings' }, { status: 500 }); }
    if (!settings.propertyId || !settings.serviceAccountJson) return NextResponse.json({ error: 'Not configured' }, { status: 404 });

    let credentials: object;
    try { credentials = JSON.parse(settings.serviceAccountJson); } catch { return NextResponse.json({ error: 'Invalid service account JSON' }, { status: 500 }); }

    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });

    const url = new URL(request.url);
    const startDate = url.searchParams.get('start') || '30daysAgo';
    const endDate = url.searchParams.get('end') || 'today';
    const prev = getPrevPeriod(startDate, endDate);
    const property = `properties/${settings.propertyId.replace(/^properties\//, '')}`;

    const SUMMARY_METRICS = [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'screenPageViewsPerSession' },
        { name: 'engagedSessions' },
    ];

    try {
        const results = await Promise.allSettled([
            // [0] Summary current period
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], metrics: SUMMARY_METRICS } }),
            // [1] Summary previous period
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate: prev.startDate, endDate: prev.endDate }], metrics: SUMMARY_METRICS } }),
            // [2] Traffic time series
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' } }] } }),
            // [3] Top pages
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }, { name: 'bounceRate' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 } }),
            // [4] Sources
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 } }),
            // [5] Devices
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] } }),
            // [6] Countries
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'country' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 } }),
            // [7] New vs Returning
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'newVsReturning' }], metrics: [{ name: 'sessions' }] } }),
            // [8] Cities
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'city' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 } }),
            // [9] Site search terms
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'searchTerm' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 } }),
            // [10] Paid keywords (Google Ads)
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'sessionGoogleAdsKeyword' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 10 } }),
            // [11] Mobile OS breakdown (iOS vs Android)
            analyticsdata.properties.runReport({ property, requestBody: { dateRanges: [{ startDate, endDate }], dimensions: [{ name: 'operatingSystem' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 6 } }),
        ]);

        const cur = settled(results[0])?.rows?.[0];
        const prv = settled(results[1])?.rows?.[0];

        const summary = {
            sessions:          { value: rowMetric(cur, 0), prev: rowMetric(prv, 0) },
            visitors:          { value: rowMetric(cur, 1), prev: rowMetric(prv, 1) },
            pageviews:         { value: rowMetric(cur, 2), prev: rowMetric(prv, 2) },
            avgDuration:       { value: rowMetric(cur, 3), prev: rowMetric(prv, 3) },
            bounceRate:        { value: rowMetric(cur, 4), prev: rowMetric(prv, 4) },
            pagesPerSession:   { value: rowMetric(cur, 5), prev: rowMetric(prv, 5) },
            engagedSessions:   { value: rowMetric(cur, 6), prev: rowMetric(prv, 6) },
        };

        const traffic = (settled(results[2])?.rows || []).map(r => ({
            date: r.dimensionValues?.[0]?.value ?? '',
            sessions: parseInt(r.metricValues?.[0]?.value || '0'),
            pageviews: parseInt(r.metricValues?.[1]?.value || '0'),
        }));

        const topPages = (settled(results[3])?.rows || []).map(r => ({
            page: r.dimensionValues?.[0]?.value ?? '',
            views: parseInt(r.metricValues?.[0]?.value || '0'),
            bounceRate: parseFloat(r.metricValues?.[1]?.value || '0'),
        }));

        const sources = (settled(results[4])?.rows || []).map(r => ({
            source: r.dimensionValues?.[0]?.value || 'Direct',
            sessions: parseInt(r.metricValues?.[0]?.value || '0'),
        }));

        const devices = (settled(results[5])?.rows || []).map(r => ({
            device: r.dimensionValues?.[0]?.value || 'Unknown',
            sessions: parseInt(r.metricValues?.[0]?.value || '0'),
        }));

        const countries = (settled(results[6])?.rows || []).map(r => ({
            country: r.dimensionValues?.[0]?.value || 'Unknown',
            sessions: parseInt(r.metricValues?.[0]?.value || '0'),
        }));

        const newVsReturning = (settled(results[7])?.rows || []).map(r => ({
            type: r.dimensionValues?.[0]?.value || 'unknown',
            sessions: parseInt(r.metricValues?.[0]?.value || '0'),
        }));

        const cities = (settled(results[8])?.rows || [])
            .map(r => ({ city: r.dimensionValues?.[0]?.value || 'Unknown', sessions: parseInt(r.metricValues?.[0]?.value || '0') }))
            .filter(r => r.city !== '(not set)');

        const JUNK = new Set(['(not set)', '(not provided)', '']);
        const siteSearch = (settled(results[9])?.rows || [])
            .map(r => ({ keyword: r.dimensionValues?.[0]?.value || '', sessions: parseInt(r.metricValues?.[0]?.value || '0') }))
            .filter(r => !JUNK.has(r.keyword));
        const paidKeywords = (settled(results[10])?.rows || [])
            .map(r => ({ keyword: r.dimensionValues?.[0]?.value || '', sessions: parseInt(r.metricValues?.[0]?.value || '0') }))
            .filter(r => !JUNK.has(r.keyword));
        // Merge: sum sessions for duplicate terms, sort by sessions desc, take top 10
        const kwMap = new Map<string, number>();
        [...siteSearch, ...paidKeywords].forEach(({ keyword, sessions }) => {
            kwMap.set(keyword, (kwMap.get(keyword) ?? 0) + sessions);
        });
        const keywords = [...kwMap.entries()]
            .map(([keyword, sessions]) => ({ keyword, sessions }))
            .sort((a, b) => b.sessions - a.sessions)
            .slice(0, 10);

        const mobileOS = (settled(results[11])?.rows || [])
            .map(r => ({ os: r.dimensionValues?.[0]?.value || 'Unknown', sessions: parseInt(r.metricValues?.[0]?.value || '0') }))
            .filter(r => r.os !== '(not set)');

        return NextResponse.json({ summary, traffic, topPages, sources, devices, mobileOS, countries, newVsReturning, cities, keywords, charts: settings.charts });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'GA4 API error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
