import { describe, it, expect } from "vitest";
import {
  equalWeight,
  minVariance,
  riskParity,
  efficientFrontier,
  covarianceMatrix,
} from "@/lib/portfolio/optimizer";
import type { PortfolioConstraints } from "@/lib/portfolio/types";

const DEFAULT_CONSTRAINTS: PortfolioConstraints = {
  minWeight: 0.05,
  maxWeight: 0.50,
};

// Helper: generate synthetic daily returns
function syntheticReturns(mean: number, vol: number, n: number, seed: number = 42): number[] {
  const returns: number[] = [];
  let state = seed;
  for (let i = 0; i < n; i++) {
    // Simple pseudo-random via linear congruential generator
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    const u = state / 0x7fffffff;
    // Box-Muller approximation (simplified)
    const z = Math.sqrt(-2 * Math.log(Math.max(u, 1e-10))) * Math.cos(2 * Math.PI * u);
    returns.push(mean + vol * z);
  }
  return returns;
}

describe("equalWeight", () => {
  /** @req PC-03 */
  it("returns uniform weights summing to 1", () => {
    const w = equalWeight(4);
    expect(w).toHaveLength(4);
    w.forEach((wi) => expect(wi).toBeCloseTo(0.25));
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1.0);
  });

  /** @req PC-03 */
  it("returns empty array for n=0", () => {
    expect(equalWeight(0)).toEqual([]);
  });

  /** @req PC-03 */
  it("returns [1] for single asset", () => {
    const w = equalWeight(1);
    expect(w).toEqual([1]);
  });
});

describe("covarianceMatrix", () => {
  it("returns empty for no assets", () => {
    expect(covarianceMatrix([])).toEqual([]);
  });

  it("is symmetric", () => {
    const r1 = syntheticReturns(0.001, 0.02, 100, 1);
    const r2 = syntheticReturns(0.0005, 0.015, 100, 2);
    const r3 = syntheticReturns(-0.0002, 0.03, 100, 3);
    const cov = covarianceMatrix([r1, r2, r3]);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(cov[i][j]).toBeCloseTo(cov[j][i]);
      }
    }
  });

  it("diagonal values are positive (variances)", () => {
    const r1 = syntheticReturns(0.001, 0.02, 100, 1);
    const r2 = syntheticReturns(0.0005, 0.015, 100, 2);
    const cov = covarianceMatrix([r1, r2]);
    expect(cov[0][0]).toBeGreaterThan(0);
    expect(cov[1][1]).toBeGreaterThan(0);
  });

  it("identical series produces correlation ~1.0", () => {
    const r = syntheticReturns(0.001, 0.02, 100, 1);
    const cov = covarianceMatrix([r, r]);
    // Off-diagonal should equal diagonal (perfect correlation)
    expect(cov[0][1]).toBeCloseTo(cov[0][0], 4);
  });
});

describe("minVariance", () => {
  /** @req PC-03 */
  it("produces lower portfolio vol than equal-weight", () => {
    // Create assets with different vols and low correlation
    const r1 = syntheticReturns(0.001, 0.02, 200, 10);
    const r2 = syntheticReturns(0.0005, 0.04, 200, 20);
    const r3 = syntheticReturns(0.0008, 0.01, 200, 30);
    const cov = covarianceMatrix([r1, r2, r3]);

    const mvWeights = minVariance(cov, DEFAULT_CONSTRAINTS);
    const eqWeights = equalWeight(3);

    // Portfolio variance = w'Sigma*w
    const mvVar = mvWeights.reduce((s1, wi, i) =>
      s1 + mvWeights.reduce((s2, wj, j) => s2 + wi * wj * cov[i][j], 0), 0);
    const eqVar = eqWeights.reduce((s1, wi, i) =>
      s1 + eqWeights.reduce((s2, wj, j) => s2 + wi * wj * cov[i][j], 0), 0);

    expect(mvVar).toBeLessThanOrEqual(eqVar + 1e-10);
  });

  /** @req PC-04 */
  it("weights sum to 1", () => {
    const r1 = syntheticReturns(0.001, 0.02, 100, 1);
    const r2 = syntheticReturns(0.0005, 0.03, 100, 2);
    const cov = covarianceMatrix([r1, r2]);
    const w = minVariance(cov, DEFAULT_CONSTRAINTS);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1.0);
  });

  /** @req PC-04 */
  it("all weights within min/max bounds", () => {
    const r1 = syntheticReturns(0.001, 0.02, 200, 10);
    const r2 = syntheticReturns(0.0005, 0.04, 200, 20);
    const r3 = syntheticReturns(0.0008, 0.01, 200, 30);
    const r4 = syntheticReturns(0.0003, 0.025, 200, 40);
    const cov = covarianceMatrix([r1, r2, r3, r4]);
    const constraints: PortfolioConstraints = { minWeight: 0.10, maxWeight: 0.40 };
    const w = minVariance(cov, constraints);

    w.forEach((wi) => {
      expect(wi).toBeGreaterThanOrEqual(constraints.minWeight - 1e-6);
      expect(wi).toBeLessThanOrEqual(constraints.maxWeight + 1e-6);
    });
  });

  /** @req PC-03 */
  it("returns [1] for single asset", () => {
    const cov = [[0.0004]];
    const w = minVariance(cov, DEFAULT_CONSTRAINTS);
    expect(w).toEqual([1]);
  });

  it("returns empty for no assets", () => {
    expect(minVariance([], DEFAULT_CONSTRAINTS)).toEqual([]);
  });
});

describe("riskParity", () => {
  /** @req PC-03 */
  it("weights inversely proportional to vol", () => {
    // vol1 = 0.10, vol2 = 0.20 -> w1 should be ~2x w2
    const vols = [0.10, 0.20];
    const loose: PortfolioConstraints = { minWeight: 0.01, maxWeight: 0.99 };
    const w = riskParity(vols, loose);
    expect(w[0] / w[1]).toBeCloseTo(2.0, 1);
  });

  /** @req PC-04 */
  it("weights sum to 1", () => {
    const vols = [0.15, 0.25, 0.10];
    const w = riskParity(vols, DEFAULT_CONSTRAINTS);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1.0);
  });

  /** @req PC-04 */
  it("respects constraints", () => {
    const vols = [0.05, 0.50]; // Very different vols -> extreme unconstrained weights
    const constraints: PortfolioConstraints = { minWeight: 0.20, maxWeight: 0.80 };
    const w = riskParity(vols, constraints);
    w.forEach((wi) => {
      expect(wi).toBeGreaterThanOrEqual(constraints.minWeight - 1e-6);
      expect(wi).toBeLessThanOrEqual(constraints.maxWeight + 1e-6);
    });
  });

  /** @req PC-03 */
  it("equal vol assets get equal weights", () => {
    const vols = [0.20, 0.20, 0.20];
    const w = riskParity(vols, DEFAULT_CONSTRAINTS);
    expect(w[0]).toBeCloseTo(w[1], 4);
    expect(w[1]).toBeCloseTo(w[2], 4);
  });

  it("handles zero vol gracefully", () => {
    const vols = [0, 0.20, 0.30];
    const w = riskParity(vols, DEFAULT_CONSTRAINTS);
    expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1.0);
  });
});

describe("efficientFrontier", () => {
  const r1 = syntheticReturns(0.001, 0.02, 200, 10);
  const r2 = syntheticReturns(0.002, 0.04, 200, 20);
  const r3 = syntheticReturns(0.0005, 0.01, 200, 30);
  const allReturns = [r1, r2, r3];
  const cov = covarianceMatrix(allReturns);
  const meanReturns = allReturns.map((r) => {
    const sum = r.reduce((s, v) => s + v, 0);
    return (sum / r.length) * 365; // annualized
  });

  /** @req PC-07 */
  it("returns sorted points by volatility", () => {
    const points = efficientFrontier(meanReturns, cov, DEFAULT_CONSTRAINTS, 10);
    for (let i = 1; i < points.length; i++) {
      expect(points[i].volatility).toBeGreaterThanOrEqual(points[i - 1].volatility - 1e-10);
    }
  });

  /** @req PC-07 */
  it("returns requested number of points", () => {
    const points = efficientFrontier(meanReturns, cov, DEFAULT_CONSTRAINTS, 15);
    expect(points.length).toBeLessThanOrEqual(15);
    expect(points.length).toBeGreaterThan(0);
  });

  /** @req PC-07 */
  it("each point has weights summing to 1", () => {
    const points = efficientFrontier(meanReturns, cov, DEFAULT_CONSTRAINTS, 10);
    points.forEach((p) => {
      expect(p.weights.reduce((s, v) => s + v, 0)).toBeCloseTo(1.0);
    });
  });

  /** @req PC-07 */
  it("returns empty for single asset", () => {
    expect(efficientFrontier([0.10], [[0.04]], DEFAULT_CONSTRAINTS)).toEqual([]);
  });

  /** @req PC-07 */
  it("returns empty when all mean returns are equal", () => {
    const points = efficientFrontier([0.10, 0.10, 0.10], cov, DEFAULT_CONSTRAINTS);
    expect(points).toEqual([]);
  });
});
