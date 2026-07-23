/** A single GA4 report row, dimensions + metrics flattened to primitives. */
export interface GaRow {
  dims: string[];
  metrics: number[];
}

export interface GaReportRequest {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  dateRanges?: { startDate: string; endDate: string }[];
  orderBys?: unknown[];
  limit?: number;
  dimensionFilter?: unknown;
}

export interface GaRealtimeRequest {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  limit?: number;
}
