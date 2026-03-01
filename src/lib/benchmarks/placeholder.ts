import type { TimeSeries } from "@/lib/metrics";
import type { BenchmarkId, BenchmarkProvider, BenchmarkSeries } from "./types";

const MS_PER_DAY = 86_400_000;

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Deterministic for a given seed, making tests reproducible.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BENCHMARK_CONFIG: Record<
  BenchmarkId,
  { label: string; startPrice: number; dailyDrift: number; dailyVol: number; seed: number }
> = {
  BTC: {
    label: "Bitcoin",
    startPrice: 60000,
    dailyDrift: 0.0003, // ~11% annualized
    dailyVol: 0.035, // ~67% annualized
    seed: 42,
  },
  HYPE: {
    label: "Hyperliquid (HYPE)",
    startPrice: 5.0,
    dailyDrift: 0.0008, // ~34% annualized
    dailyVol: 0.06, // ~115% annualized
    seed: 137,
  },
};

/**
 * Generates a synthetic price series using geometric Brownian motion.
 * Deterministic for a given benchmark and date range.
 */
function generatePriceSeries(
  id: BenchmarkId,
  startMs: number,
  endMs: number,
): TimeSeries {
  const config = BENCHMARK_CONFIG[id];
  const rng = mulberry32(config.seed);

  const prices: TimeSeries = [];
  let price = config.startPrice;

  // Align to start of day
  let ts = startMs - (startMs % MS_PER_DAY);

  while (ts <= endMs) {
    prices.push([ts, price]);
    // Box-Muller transform for normal distribution
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const dailyReturn = config.dailyDrift + config.dailyVol * z;
    price = price * (1 + dailyReturn);
    ts += MS_PER_DAY;
  }

  return prices;
}

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

export const placeholderProvider: BenchmarkProvider = {
  isPlaceholder: true,

  async getSeries(
    id: BenchmarkId,
    startMs: number,
    endMs: number,
  ): Promise<BenchmarkSeries> {
    const config = BENCHMARK_CONFIG[id];
    const prices = generatePriceSeries(id, startMs, endMs);
    const dailyReturns = pricesToDailyReturns(prices);

    return {
      id,
      label: config.label,
      prices,
      dailyReturns,
    };
  },
};
