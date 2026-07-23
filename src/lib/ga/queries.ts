import { cacheLife } from "next/cache";
import {
  runReport,
  batchRunReports,
  runRealtimeReport,
  gaConfigured,
} from "./client";

export { gaConfigured };

export interface TrendPoint {
  date: string;
  desktop: number;
  mobile: number;
  app: number;
}
export interface Kpi {
  key: string;
  label: string;
  value: number;
  changePct: number;
}
export interface PageRow {
  path: string;
  title: string;
  views: number;
  avgSeconds: number;
}
export interface NameCount {
  name: string;
  value: number;
}

const range = (days: number) => [
  { startDate: `${days}daysAgo`, endDate: "today" },
];
/** "20260723" -> "2026-07-23" for chart labels. */
const isoDate = (d: string) =>
  `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

/** Map GA platform+device row into one of our three series buckets. */
function bucket(platform: string, device: string): "desktop" | "mobile" | "app" {
  if (platform === "iOS" || platform === "Android") return "app";
  return device === "desktop" ? "desktop" : "mobile";
}

async function _visitorsTrend(days: number): Promise<TrendPoint[]> {
  if (!gaConfigured()) return [];
  const rows = await runReport({
    dimensions: [
      { name: "date" },
      { name: "platform" },
      { name: "deviceCategory" },
    ],
    metrics: [{ name: "activeUsers" }],
    dateRanges: range(days),
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });
  const byDate = new Map<string, TrendPoint>();
  for (const { dims, metrics } of rows) {
    const [date, platform, device] = dims;
    const point =
      byDate.get(date) ??
      { date: isoDate(date), desktop: 0, mobile: 0, app: 0 };
    point[bucket(platform, device)] += metrics[0];
    byDate.set(date, point);
  }
  return [...byDate.values()];
}

async function _kpis(days: number): Promise<Kpi[]> {
  if (!gaConfigured()) return [];
  // Current vs previous equal-length window for the change badge.
  const body = (start: string, end: string) => ({
    metrics: [
      { name: "activeUsers" },
      { name: "screenPageViews" },
      { name: "userEngagementDuration" },
      { name: "newUsers" },
    ],
    dateRanges: [{ startDate: start, endDate: end }],
  });
  const [cur, prev] = await batchRunReports([
    body(`${days}daysAgo`, "today"),
    body(`${days * 2}daysAgo`, `${days + 1}daysAgo`),
  ]);
  const c = cur[0]?.metrics ?? [0, 0, 0, 0];
  const p = prev[0]?.metrics ?? [0, 0, 0, 0];
  const pct = (a: number, b: number) =>
    b <= 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 1000) / 10;
  // userEngagementDuration is total seconds; show avg per active user.
  const engCur = c[0] > 0 ? c[2] / c[0] : 0;
  const engPrev = p[0] > 0 ? p[2] / p[0] : 0;
  return [
    { key: "visitors", label: "Visitors", value: c[0], changePct: pct(c[0], p[0]) },
    { key: "views", label: "Page views", value: c[1], changePct: pct(c[1], p[1]) },
    {
      key: "engagement",
      label: "Avg engagement (s)",
      value: Math.round(engCur),
      changePct: pct(engCur, engPrev),
    },
    { key: "new", label: "New users", value: c[3], changePct: pct(c[3], p[3]) },
  ];
}

async function _realtime(): Promise<{ total: number; perMinute: number[] }> {
  if (!gaConfigured()) return { total: 0, perMinute: [] };
  const rows = await runRealtimeReport({
    dimensions: [{ name: "minutesAgo" }],
    metrics: [{ name: "activeUsers" }],
  });
  const perMinute = Array(30).fill(0);
  let total = 0;
  for (const { dims, metrics } of rows) {
    const m = Number(dims[0]);
    if (m >= 0 && m < 30) perMinute[29 - m] = metrics[0];
    total += metrics[0];
  }
  // total across minute buckets double-counts a user seen in two minutes;
  // a second no-dimension query gives the true unique count.
  const [uniqueRow] = await runRealtimeReport({
    metrics: [{ name: "activeUsers" }],
  });
  return { total: uniqueRow?.metrics[0] ?? total, perMinute };
}

async function _topPages(days: number): Promise<PageRow[]> {
  if (!gaConfigured()) return [];
  const rows = await runReport({
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "userEngagementDuration" },
      { name: "activeUsers" },
    ],
    dateRanges: range(days),
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  });
  return rows.map(({ dims, metrics }) => ({
    path: dims[0],
    title: dims[1],
    views: metrics[0],
    avgSeconds: metrics[2] > 0 ? Math.round(metrics[1] / metrics[2]) : 0,
  }));
}

function _named(
  dimension: string,
  metric = "activeUsers",
  limit = 8,
) {
  return async (days: number): Promise<NameCount[]> => {
    if (!gaConfigured()) return [];
    const rows = await runReport({
      dimensions: [{ name: dimension }],
      metrics: [{ name: metric }],
      dateRanges: range(days),
      orderBys: [{ metric: { metricName: metric }, desc: true }],
      limit,
    });
    return rows.map(({ dims, metrics }) => ({ name: dims[0], value: metrics[0] }));
  };
}

async function _geography(days: number) {
  const [countries, cities] = await Promise.all([
    _named("country")(days),
    _named("city")(days),
  ]);
  return { countries, cities };
}

async function _devices(days: number) {
  const [categories, browsers] = await Promise.all([
    _named("deviceCategory")(days),
    _named("browser")(days),
  ]);
  return { categories, browsers };
}

async function _busyHours(days: number) {
  if (!gaConfigured()) return [];
  const rows = await runReport({
    dimensions: [{ name: "dayOfWeek" }, { name: "hour" }],
    metrics: [{ name: "activeUsers" }],
    dateRanges: range(days),
  });
  return rows.map(({ dims, metrics }) => ({
    day: Number(dims[0]),
    hour: Number(dims[1]),
    value: metrics[0],
  }));
}

// 10-minute cache: GA data lags hours, so this keeps quota/latency trivial.
// Each exported query is a thin "use cache" wrapper over an uncached _fetcher.
const CACHE = { stale: 600, revalidate: 600, expire: 3600 };

export async function getVisitorsTrend(days: number): Promise<TrendPoint[]> {
  "use cache";
  cacheLife(CACHE);
  return _visitorsTrend(days);
}
export async function getKpis(days: number): Promise<Kpi[]> {
  "use cache";
  cacheLife(CACHE);
  return _kpis(days);
}
export async function getTopPages(days: number): Promise<PageRow[]> {
  "use cache";
  cacheLife(CACHE);
  return _topPages(days);
}
export async function getTrafficSources(days: number): Promise<NameCount[]> {
  "use cache";
  cacheLife(CACHE);
  return _named("sessionDefaultChannelGroup", "sessions")(days);
}
export async function getGeography(
  days: number,
): Promise<{ countries: NameCount[]; cities: NameCount[] }> {
  "use cache";
  cacheLife(CACHE);
  return _geography(days);
}
export async function getDevices(
  days: number,
): Promise<{ categories: NameCount[]; browsers: NameCount[] }> {
  "use cache";
  cacheLife(CACHE);
  return _devices(days);
}
export async function getLandingPages(days: number): Promise<NameCount[]> {
  "use cache";
  cacheLife(CACHE);
  return _named("landingPage", "sessions")(days);
}
export async function getBusyHours(
  days: number,
): Promise<{ day: number; hour: number; value: number }[]> {
  "use cache";
  cacheLife(CACHE);
  return _busyHours(days);
}
// Realtime is NOT cached — its route handler sets a short Cache-Control header.
export const getRealtimeActive = _realtime;
