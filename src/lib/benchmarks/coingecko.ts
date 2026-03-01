import type { BenchmarkId } from "./types";

const COINGECKO_IDS: Record<BenchmarkId, string> = {
  BTC: "bitcoin",
  HYPE: "hyperliquid",
};

const COINGECKO_PRO_URL = "https://pro-api.coingecko.com/api/v3";

/** In-memory cache: key -> { data, expiresAt } */
const cache = new Map<string, { data: [number, number][]; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheKey(coinId: string, startDay: string, endDay: string): string {
  return `${coinId}_${startDay}_${endDay}`;
}

function dayString(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

export function coinGeckoId(id: BenchmarkId): string {
  return COINGECKO_IDS[id];
}

/**
 * Fetch daily prices from CoinGecko Pro API.
 * Returns array of [timestamp_ms, price] pairs.
 */
export async function fetchPrices(
  benchmarkId: BenchmarkId,
  startMs: number,
  endMs: number,
  apiKey: string,
): Promise<[number, number][]> {
  const coinId = COINGECKO_IDS[benchmarkId];
  const key = cacheKey(coinId, dayString(startMs), dayString(endMs));

  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const fromSec = Math.floor(startMs / 1000);
  const toSec = Math.floor(endMs / 1000);

  const url = `${COINGECKO_PRO_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromSec}&to=${toSec}`;

  const res = await fetch(url, {
    headers: { "x-cg-pro-api-key": apiKey },
  });

  if (res.status === 429) {
    throw new Error("CoinGecko rate limit exceeded. Try again later.");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CoinGecko API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { prices: [number, number][] };
  const prices = json.prices;

  cache.set(key, { data: prices, expiresAt: Date.now() + CACHE_TTL_MS });

  return prices;
}

/** Clear the in-memory cache (useful for testing). */
export function clearCache(): void {
  cache.clear();
}
