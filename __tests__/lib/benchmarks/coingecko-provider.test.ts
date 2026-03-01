import { describe, it, expect, vi, beforeEach } from "vitest";
import { coingeckoProvider } from "@/lib/benchmarks/coingecko-provider";

const mockPrices: [number, number][] = [
  [1704067200000, 42000],
  [1704153600000, 42500],
  [1704240000000, 43100],
  [1704326400000, 42800],
  [1704412800000, 43500],
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("coingeckoProvider", () => {
  /** @req BENCH-03 */
  it("isPlaceholder is false", () => {
    expect(coingeckoProvider.isPlaceholder).toBe(false);
  });

  /** @req BENCH-03 */
  it("calls the correct API route", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prices: mockPrices }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const start = 1704067200000;
    const end = 1704412800000;
    await coingeckoProvider.getSeries("BTC", start, end);

    expect(mockFetch).toHaveBeenCalledOnce();
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toBe(`/api/benchmarks/BTC?start=${start}&end=${end}`);
  });

  /** @req BENCH-03 */
  it("returns BenchmarkSeries with correct structure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prices: mockPrices }),
    }));

    const series = await coingeckoProvider.getSeries(
      "BTC",
      1704067200000,
      1704412800000,
    );

    expect(series.id).toBe("BTC");
    expect(series.label).toBe("Bitcoin");
    expect(series.prices).toEqual(mockPrices);
    expect(series.dailyReturns).toHaveLength(mockPrices.length - 1);
  });

  /** @req BENCH-03 */
  it("computes daily returns correctly from prices", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prices: mockPrices }),
    }));

    const series = await coingeckoProvider.getSeries(
      "BTC",
      1704067200000,
      1704412800000,
    );

    // First return: (42500 - 42000) / 42000
    expect(series.dailyReturns[0]).toBeCloseTo(500 / 42000, 10);
    // Second return: (43100 - 42500) / 42500
    expect(series.dailyReturns[1]).toBeCloseTo(600 / 42500, 10);
  });

  /** @req BENCH-03 */
  it("returns HYPE series with correct label", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prices: mockPrices }),
    }));

    const series = await coingeckoProvider.getSeries(
      "HYPE",
      1704067200000,
      1704412800000,
    );

    expect(series.id).toBe("HYPE");
    expect(series.label).toBe("Hyperliquid (HYPE)");
  });

  /** @req BENCH-06 */
  it("throws on API error (e.g. 503 no key)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Benchmark data unavailable (no API key)" }),
    }));

    await expect(
      coingeckoProvider.getSeries("BTC", 1704067200000, 1704412800000),
    ).rejects.toThrow("Benchmark data unavailable");
  });

  /** @req BENCH-06 */
  it("throws with fallback message when error JSON is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("not json"); },
    }));

    await expect(
      coingeckoProvider.getSeries("BTC", 1704067200000, 1704412800000),
    ).rejects.toThrow("Request failed");
  });
});
