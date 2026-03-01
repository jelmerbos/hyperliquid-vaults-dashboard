import type { BenchmarkId, BenchmarkProvider, BenchmarkSeries } from "./types";
import type { TimeSeries } from "@/lib/metrics";

const LABELS: Record<BenchmarkId, string> = {
  BTC: "Bitcoin",
  HYPE: "Hyperliquid (HYPE)",
};

function pricesToDailyReturns(prices: TimeSeries): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1][1];
    if (prev === 0) {
      returns.push(0);
    } else {
      returns.push((prices[i][1] - prev) / prev);
    }
  }
  return returns;
}

export const coingeckoProvider: BenchmarkProvider = {
  isPlaceholder: false,

  async getSeries(
    id: BenchmarkId,
    startMs: number,
    endMs: number,
  ): Promise<BenchmarkSeries> {
    const res = await fetch(
      `/api/benchmarks/${id}?start=${startMs}&end=${endMs}`,
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(data.error || `Benchmark fetch failed (${res.status})`);
    }

    const json = (await res.json()) as { prices: [number, number][] };
    const prices: TimeSeries = json.prices;
    const dailyReturns = pricesToDailyReturns(prices);

    return {
      id,
      label: LABELS[id],
      prices,
      dailyReturns,
    };
  },
};
