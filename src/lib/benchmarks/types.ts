import type { TimeSeries } from "@/lib/metrics";

export type BenchmarkId = "BTC" | "HYPE";

export interface BenchmarkSeries {
  id: BenchmarkId;
  label: string;
  /** Daily price series: [timestamp_ms, price] */
  prices: TimeSeries;
  /** Daily returns derived from prices */
  dailyReturns: number[];
}

export interface BenchmarkProvider {
  /** Whether this provider returns real market data */
  isPlaceholder: boolean;
  /** Fetch benchmark series for a given date range */
  getSeries(
    id: BenchmarkId,
    startMs: number,
    endMs: number,
  ): Promise<BenchmarkSeries>;
}
