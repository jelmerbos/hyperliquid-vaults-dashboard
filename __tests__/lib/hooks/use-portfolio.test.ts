import { describe, it, expect } from "vitest";
import { computePortfolioReturns, computePortfolioMetrics, computePortfolioPerformanceSeries } from "@/lib/portfolio/metrics";
import { efficientFrontier, covarianceMatrix, equalWeight } from "@/lib/portfolio/optimizer";
import { correlationMatrix } from "@/lib/metrics/benchmark";
import { annualizedVolatility } from "@/lib/metrics/risk";
import type { TimeSeries } from "@/lib/metrics/returns";

/**
 * Integration tests for the portfolio computation pipeline.
 * These verify the same logic used in usePortfolio hook,
 * without needing React rendering or mocked API calls.
 */

// Synthetic vault data
const MS_PER_DAY = 86_400_000;
const baseTs = 1700000000000;

function generateVaultData(mean: number, vol: number, days: number, seed: number) {
  const dailyReturns: number[] = [];
  const avHistory: TimeSeries = [];
  let value = 1000;
  let state = seed;

  for (let i = 0; i < days; i++) {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    const u = state / 0x7fffffff;
    const z = Math.sqrt(-2 * Math.log(Math.max(u, 1e-10))) * Math.cos(2 * Math.PI * u);
    const ret = mean + vol * z;
    dailyReturns.push(ret);
    value *= (1 + ret);
    avHistory.push([baseTs + i * MS_PER_DAY, value]);
  }

  return { dailyReturns, avHistory };
}

const vault1 = generateVaultData(0.001, 0.02, 100, 42);
const vault2 = generateVaultData(0.002, 0.04, 100, 99);
const vault3 = generateVaultData(0.0005, 0.01, 100, 7);

const allDailyReturns = [vault1.dailyReturns, vault2.dailyReturns, vault3.dailyReturns];
const allAvHistories = [vault1.avHistory, vault2.avHistory, vault3.avHistory];
const individualVols = allDailyReturns.map((r) => annualizedVolatility(r));

describe("portfolio computation pipeline (usePortfolio integration)", () => {
  /** @req PC-01 */
  it("processes multiple vaults into metrics arrays of matching length", () => {
    const weights = equalWeight(3);
    const portfolioReturns = computePortfolioReturns(allDailyReturns, weights);
    expect(portfolioReturns.length).toBe(100);
  });

  /** @req PC-05 */
  it("computes portfolio metrics from weighted vault returns", () => {
    const weights = equalWeight(3);
    const metrics = computePortfolioMetrics(allDailyReturns, weights, individualVols);

    expect(metrics.annualizedReturn).toBeDefined();
    expect(metrics.annualizedVolatility).toBeGreaterThan(0);
    expect(metrics.sharpeRatio).toBeDefined();
    expect(metrics.sortinoRatio).toBeDefined();
    expect(metrics.maxDrawdown).toBeLessThanOrEqual(0);
    expect(metrics.var95).toBeDefined();
    expect(metrics.cvar95).toBeDefined();
    expect(metrics.diversificationRatio).toBeGreaterThan(0);
  });

  /** @req PC-08 */
  it("computes correlation matrix with correct dimensions", () => {
    const matrix = correlationMatrix(allDailyReturns);
    expect(matrix).toHaveLength(3);
    matrix.forEach((row) => expect(row).toHaveLength(3));
    // Diagonal = 1.0
    expect(matrix[0][0]).toBe(1.0);
    expect(matrix[1][1]).toBe(1.0);
    expect(matrix[2][2]).toBe(1.0);
    // Symmetric
    expect(matrix[0][1]).toBeCloseTo(matrix[1][0]);
  });

  /** @req PC-07 */
  it("computes efficient frontier with correct point count", () => {
    const cov = covarianceMatrix(allDailyReturns);
    const meanReturns = allDailyReturns.map((r) => {
      const sum = r.reduce((s, v) => s + v, 0);
      return (sum / r.length) * 365;
    });
    const constraints = { minWeight: 0.05, maxWeight: 0.50 };
    const points = efficientFrontier(meanReturns, cov, constraints, 15);

    expect(points.length).toBeGreaterThan(0);
    expect(points.length).toBeLessThanOrEqual(15);
    // Sorted by vol
    for (let i = 1; i < points.length; i++) {
      expect(points[i].volatility).toBeGreaterThanOrEqual(points[i - 1].volatility - 1e-10);
    }
  });

  it("single vault: no frontier, identity correlation", () => {
    const matrix = correlationMatrix([vault1.dailyReturns]);
    expect(matrix).toEqual([[1.0]]);

    const cov = covarianceMatrix([vault1.dailyReturns]);
    const points = efficientFrontier([0.10], cov, { minWeight: 0.05, maxWeight: 0.50 });
    expect(points).toEqual([]);
  });

  it("performance series has correct shape", () => {
    const weights = equalWeight(3);
    const series = computePortfolioPerformanceSeries(allAvHistories, weights);
    expect(series.length).toBeGreaterThan(0);
    // First value should be ~100 (base)
    expect(series[0][1]).toBeCloseTo(100, 0);
  });

  it("vault with insufficient data returns gracefully", () => {
    const shortReturns = [vault1.dailyReturns.slice(0, 1)]; // Only 1 day
    const metrics = computePortfolioMetrics(shortReturns, [1], [0]);
    expect(metrics.annualizedReturn).toBe(0);
  });
});
