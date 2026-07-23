import { JWT } from "google-auth-library";
import type { GaRow, GaReportRequest, GaRealtimeRequest } from "./types";

const PROPERTY_ID = process.env.GA_PROPERTY_ID;
const SERVICE_ACCOUNT_KEY = process.env.GA_SERVICE_ACCOUNT_KEY;
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const BASE = "https://analyticsdata.googleapis.com/v1beta";

/** True only when both server-side GA env vars are present. */
export function gaConfigured(): boolean {
  return Boolean(PROPERTY_ID && SERVICE_ACCOUNT_KEY);
}

/** Pure: flatten GA4's { rows:[{ dimensionValues, metricValues }] } to GaRow[]. */
export function parseRows(json: unknown): GaRow[] {
  const rows = (json as { rows?: unknown[] })?.rows;
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const row = r as {
      dimensionValues?: { value?: string }[];
      metricValues?: { value?: string }[];
    };
    return {
      dims: (row.dimensionValues ?? []).map((d) => d.value ?? ""),
      metrics: (row.metricValues ?? []).map((m) => Number(m.value ?? 0)),
    };
  });
}

let cachedJwt: JWT | null = null;
function jwt(): JWT {
  if (!cachedJwt) {
    const key = JSON.parse(SERVICE_ACCOUNT_KEY as string) as {
      client_email: string;
      private_key: string;
    };
    cachedJwt = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: [SCOPE],
    });
  }
  return cachedJwt;
}

async function token(): Promise<string> {
  const { token } = await jwt().getAccessToken();
  if (!token) throw new Error("GA: failed to obtain access token");
  return token;
}

async function post(path: string, body: unknown): Promise<unknown> {
  if (!gaConfigured()) throw new Error("GA not configured");
  const res = await fetch(`${BASE}/properties/${PROPERTY_ID}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GA API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function runReport(body: GaReportRequest): Promise<GaRow[]> {
  return parseRows(await post(":runReport", body));
}

/** Batches up to 5 reports per GA4 call; splits larger arrays into chunks. */
export async function batchRunReports(
  bodies: GaReportRequest[],
): Promise<GaRow[][]> {
  const out: GaRow[][] = [];
  for (let i = 0; i < bodies.length; i += 5) {
    const chunk = bodies.slice(i, i + 5);
    const json = (await post(":batchRunReports", { requests: chunk })) as {
      reports?: unknown[];
    };
    for (const report of json.reports ?? []) out.push(parseRows(report));
  }
  return out;
}

export async function runRealtimeReport(
  body: GaRealtimeRequest,
): Promise<GaRow[]> {
  return parseRows(await post(":runRealtimeReport", body));
}
