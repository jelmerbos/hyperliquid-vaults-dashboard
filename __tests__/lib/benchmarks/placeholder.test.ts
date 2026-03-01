import { describe, it, expect } from "vitest";
import { placeholderProvider } from "@/lib/benchmarks/placeholder";

const MS_PER_DAY = 86_400_000;

describe("placeholderProvider", () => {
  /** @req INST-16 */
  it("isPlaceholder is true", () => {
    expect(placeholderProvider.isPlaceholder).toBe(true);
  });

  /** @req INST-16 */
  it("returns BTC series with correct date range", async () => {
    const start = Date.UTC(2024, 0, 1);
    const end = Date.UTC(2024, 0, 10); // 10 days
    const series = await placeholderProvider.getSeries("BTC", start, end);

    expect(series.id).toBe("BTC");
    expect(series.label).toBe("Bitcoin");
    expect(series.prices.length).toBeGreaterThanOrEqual(10);
    expect(series.prices[0][0]).toBe(start);
    expect(series.dailyReturns).toHaveLength(series.prices.length - 1);
  });

  /** @req INST-16 */
  it("returns HYPE series with correct structure", async () => {
    const start = Date.UTC(2024, 0, 1);
    const end = Date.UTC(2024, 1, 1); // ~31 days
    const series = await placeholderProvider.getSeries("HYPE", start, end);

    expect(series.id).toBe("HYPE");
    expect(series.label).toBe("Hyperliquid (HYPE)");
    expect(series.prices.length).toBeGreaterThanOrEqual(31);
  });

  /** @req INST-16 */
  it("produces deterministic output for same inputs", async () => {
    const start = Date.UTC(2024, 0, 1);
    const end = Date.UTC(2024, 0, 30);

    const series1 = await placeholderProvider.getSeries("BTC", start, end);
    const series2 = await placeholderProvider.getSeries("BTC", start, end);

    expect(series1.prices).toEqual(series2.prices);
    expect(series1.dailyReturns).toEqual(series2.dailyReturns);
  });

  /** @req INST-16 */
  it("prices are always positive", async () => {
    const start = Date.UTC(2023, 0, 1);
    const end = Date.UTC(2024, 0, 1); // full year
    const series = await placeholderProvider.getSeries("BTC", start, end);

    for (const [, price] of series.prices) {
      expect(price).toBeGreaterThan(0);
    }
  });

  /** @req INST-16 */
  it("daily returns have realistic magnitude", async () => {
    const start = Date.UTC(2024, 0, 1);
    const end = Date.UTC(2024, 6, 1); // 6 months
    const series = await placeholderProvider.getSeries("BTC", start, end);

    // No single-day return should exceed +/- 50% for BTC-like asset
    for (const ret of series.dailyReturns) {
      expect(Math.abs(ret)).toBeLessThan(0.5);
    }
  });

  /** @req INST-16 */
  it("BTC and HYPE produce different series", async () => {
    const start = Date.UTC(2024, 0, 1);
    const end = Date.UTC(2024, 0, 30);

    const btc = await placeholderProvider.getSeries("BTC", start, end);
    const hype = await placeholderProvider.getSeries("HYPE", start, end);

    // Different starting prices
    expect(btc.prices[0][1]).not.toBe(hype.prices[0][1]);
    // Different return series
    expect(btc.dailyReturns[0]).not.toBe(hype.dailyReturns[0]);
  });
});
