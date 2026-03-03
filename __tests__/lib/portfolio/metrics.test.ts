import { describe, it, expect } from "vitest";
import {
  computePortfolioReturns,
  computePortfolioMetrics,
  computePortfolioPerformanceSeries,
} from "@/lib/portfolio/metrics";
import type { TimeSeries } from "@/lib/metrics/returns";

describe("computePortfolioReturns", () => {
  /** @req PC-05 */
  it("weighted sum equals manual calculation", () => {
    const r1 = [0.01, -0.02, 0.03];
    const r2 = [0.02, 0.01, -0.01];
    const weights = [0.6, 0.4];

    const result = computePortfolioReturns([r1, r2], weights);

    expect(result[0]).toBeCloseTo(0.6 * 0.01 + 0.4 * 0.02);
    expect(result[1]).toBeCloseTo(0.6 * -0.02 + 0.4 * 0.01);
    expect(result[2]).toBeCloseTo(0.6 * 0.03 + 0.4 * -0.01);
  });

  /** @req PC-05 */
  it("aligns to shortest series", () => {
    const r1 = [0.01, -0.02, 0.03, 0.01];
    const r2 = [0.02, 0.01];
    const result = computePortfolioReturns([r1, r2], [0.5, 0.5]);
    expect(result).toHaveLength(2);
  });

  it("returns empty for empty input", () => {
    expect(computePortfolioReturns([], [])).toEqual([]);
  });
});

describe("computePortfolioMetrics", () => {
  // Two assets: one low-vol, one high-vol, weakly correlated
  const lowVol = Array.from({ length: 100 }, (_, i) =>
    0.001 + 0.005 * Math.sin(i * 0.3),
  );
  const highVol = Array.from({ length: 100 }, (_, i) =>
    0.002 + 0.02 * Math.cos(i * 0.7),
  );
  const lowVolAnnVol = (() => {
    const mean = lowVol.reduce((s, r) => s + r, 0) / lowVol.length;
    const variance = lowVol.reduce((s, r) => s + (r - mean) ** 2, 0) / (lowVol.length - 1);
    return Math.sqrt(variance) * Math.sqrt(365);
  })();
  const highVolAnnVol = (() => {
    const mean = highVol.reduce((s, r) => s + r, 0) / highVol.length;
    const variance = highVol.reduce((s, r) => s + (r - mean) ** 2, 0) / (highVol.length - 1);
    return Math.sqrt(variance) * Math.sqrt(365);
  })();

  /** @req PC-05 */
  it("portfolio vol is less than weighted sum of vols (diversification)", () => {
    const weights = [0.5, 0.5];
    const metrics = computePortfolioMetrics(
      [lowVol, highVol],
      weights,
      [lowVolAnnVol, highVolAnnVol],
    );
    const weightedVolSum = 0.5 * lowVolAnnVol + 0.5 * highVolAnnVol;
    expect(metrics.annualizedVolatility).toBeLessThan(weightedVolSum + 1e-10);
  });

  /** @req PC-05 */
  it("computes Sharpe, Sortino, maxDD, VaR, CVaR", () => {
    const weights = [0.5, 0.5];
    const metrics = computePortfolioMetrics(
      [lowVol, highVol],
      weights,
      [lowVolAnnVol, highVolAnnVol],
    );
    expect(typeof metrics.sharpeRatio).toBe("number");
    expect(typeof metrics.sortinoRatio).toBe("number");
    expect(typeof metrics.maxDrawdown).toBe("number");
    expect(typeof metrics.var95).toBe("number");
    expect(typeof metrics.cvar95).toBe("number");
    expect(metrics.maxDrawdown).toBeLessThanOrEqual(0);
  });

  /** @req PC-06 */
  it("diversification ratio > 1 when assets not perfectly correlated", () => {
    const weights = [0.5, 0.5];
    const metrics = computePortfolioMetrics(
      [lowVol, highVol],
      weights,
      [lowVolAnnVol, highVolAnnVol],
    );
    expect(metrics.diversificationRatio).toBeGreaterThan(1.0);
  });

  /** @req PC-06 */
  it("diversification ratio = 1 when all returns identical", () => {
    const weights = [0.5, 0.5];
    const vol = lowVolAnnVol;
    const metrics = computePortfolioMetrics(
      [lowVol, lowVol],
      weights,
      [vol, vol],
    );
    expect(metrics.diversificationRatio).toBeCloseTo(1.0, 1);
  });

  /** @req PC-09 */
  it("computes beta vs BTC benchmark", () => {
    const btcReturns = Array.from({ length: 100 }, (_, i) =>
      0.001 + 0.03 * Math.sin(i * 0.5),
    );
    const metrics = computePortfolioMetrics(
      [lowVol, highVol],
      [0.5, 0.5],
      [lowVolAnnVol, highVolAnnVol],
      btcReturns,
    );
    expect(metrics.betaBtc).not.toBeNull();
    expect(typeof metrics.betaBtc).toBe("number");
    expect(metrics.alphaBtc).not.toBeNull();
  });

  it("returns null benchmarks when not provided", () => {
    const metrics = computePortfolioMetrics(
      [lowVol, highVol],
      [0.5, 0.5],
      [lowVolAnnVol, highVolAnnVol],
    );
    expect(metrics.betaBtc).toBeNull();
    expect(metrics.betaHype).toBeNull();
  });

  it("returns zero metrics for empty input", () => {
    const metrics = computePortfolioMetrics([], [], []);
    expect(metrics.annualizedReturn).toBe(0);
    expect(metrics.annualizedVolatility).toBe(0);
  });
});

describe("computePortfolioPerformanceSeries", () => {
  const MS_PER_DAY = 86_400_000;
  const baseTs = 1700000000000;

  const av1: TimeSeries = Array.from({ length: 30 }, (_, i) => [
    baseTs + i * MS_PER_DAY,
    100 + i * 2, // grows $2/day
  ]);
  const av2: TimeSeries = Array.from({ length: 30 }, (_, i) => [
    baseTs + i * MS_PER_DAY,
    200 + i * 1, // grows $1/day
  ]);

  /** @req PC-12 */
  it("starts at 100 (weighted base)", () => {
    const series = computePortfolioPerformanceSeries([av1, av2], [0.5, 0.5]);
    expect(series.length).toBeGreaterThan(0);
    expect(series[0][1]).toBeCloseTo(100, 0);
  });

  /** @req PC-12 */
  it("tracks weighted blend of normalized values", () => {
    const series = computePortfolioPerformanceSeries([av1, av2], [0.5, 0.5]);
    // At day 10: av1 = 120 (normalized: 120/100*100=120), av2 = 210 (normalized: 210/200*100=105)
    // Blended: 0.5*120 + 0.5*105 = 112.5
    const day10 = series[10];
    expect(day10[1]).toBeCloseTo(112.5, 0);
  });

  it("returns empty for no input", () => {
    expect(computePortfolioPerformanceSeries([], [])).toEqual([]);
  });

  it("handles different length series (common range)", () => {
    const short: TimeSeries = Array.from({ length: 10 }, (_, i) => [
      baseTs + (i + 5) * MS_PER_DAY, // starts 5 days later
      50 + i,
    ]);
    const series = computePortfolioPerformanceSeries([av1, short], [0.5, 0.5]);
    // Should only cover the overlapping range
    expect(series.length).toBeLessThanOrEqual(10);
    expect(series.length).toBeGreaterThan(0);
  });
});
