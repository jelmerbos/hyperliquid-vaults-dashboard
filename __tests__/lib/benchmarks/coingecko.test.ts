import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPrices, coinGeckoId, clearCache } from "@/lib/benchmarks/coingecko";

const mockPrices: [number, number][] = [
  [1704067200000, 42000],
  [1704153600000, 42500],
  [1704240000000, 43100],
  [1704326400000, 42800],
  [1704412800000, 43500],
];

beforeEach(() => {
  clearCache();
  vi.restoreAllMocks();
});

describe("coinGeckoId", () => {
  /** @req BENCH-01 */
  it("maps BTC to bitcoin", () => {
    expect(coinGeckoId("BTC")).toBe("bitcoin");
  });

  /** @req BENCH-01 */
  it("maps HYPE to hyperliquid", () => {
    expect(coinGeckoId("HYPE")).toBe("hyperliquid");
  });
});

describe("fetchPrices", () => {
  /** @req BENCH-01 */
  it("fetches prices from CoinGecko Pro API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ prices: mockPrices }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const start = 1704067200000; // 2024-01-01
    const end = 1704412800000; // 2024-01-05
    const result = await fetchPrices("BTC", start, end, "test-key");

    expect(result).toEqual(mockPrices);
    expect(mockFetch).toHaveBeenCalledOnce();

    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain("pro-api.coingecko.com");
    expect(callUrl).toContain("/coins/bitcoin/market_chart/range");
    expect(callUrl).toContain("vs_currency=usd");

    const callOpts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(callOpts.headers).toEqual({ "x-cg-pro-api-key": "test-key" });
  });

  /** @req BENCH-01 */
  it("converts timestamps to seconds for CoinGecko API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ prices: mockPrices }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const startMs = 1704067200000;
    const endMs = 1704412800000;
    await fetchPrices("BTC", startMs, endMs, "test-key");

    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain(`from=${Math.floor(startMs / 1000)}`);
    expect(callUrl).toContain(`to=${Math.floor(endMs / 1000)}`);
  });

  /** @req BENCH-02 */
  it("returns cached data on second call", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ prices: mockPrices }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const start = 1704067200000;
    const end = 1704412800000;

    const result1 = await fetchPrices("BTC", start, end, "test-key");
    const result2 = await fetchPrices("BTC", start, end, "test-key");

    expect(result1).toEqual(result2);
    expect(mockFetch).toHaveBeenCalledOnce(); // only one fetch, second was cached
  });

  /** @req BENCH-02 */
  it("uses separate cache keys for different benchmarks", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ prices: mockPrices }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const start = 1704067200000;
    const end = 1704412800000;

    await fetchPrices("BTC", start, end, "test-key");
    await fetchPrices("HYPE", start, end, "test-key");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  /** @req BENCH-01 */
  it("throws on rate limit (429)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchPrices("BTC", 1704067200000, 1704412800000, "test-key"),
    ).rejects.toThrow("rate limit");
  });

  /** @req BENCH-01 */
  it("throws on non-OK response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "internal error",
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      fetchPrices("BTC", 1704067200000, 1704412800000, "test-key"),
    ).rejects.toThrow("CoinGecko API error 500");
  });
});
