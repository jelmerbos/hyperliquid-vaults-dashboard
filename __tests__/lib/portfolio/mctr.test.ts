import { describe, it, expect } from "vitest";
import { computeMCTR } from "@/lib/portfolio/metrics";

describe("computeMCTR", () => {
  const covMatrix = [
    [0.0004, 0.0001],
    [0.0001, 0.0009],
  ];

  it("returns MCTR for each asset", () => {
    const weights = [0.6, 0.4];
    const result = computeMCTR(covMatrix, weights);

    expect(result).toHaveLength(2);
    // Each entry should have mctr, componentRisk, percentContribution
    for (const row of result) {
      expect(row).toHaveProperty("mctr");
      expect(row).toHaveProperty("componentRisk");
      expect(row).toHaveProperty("percentContribution");
    }
  });

  it("percent contributions sum to ~1", () => {
    const weights = [0.6, 0.4];
    const result = computeMCTR(covMatrix, weights);

    const totalPct = result.reduce((s, r) => s + r.percentContribution, 0);
    expect(totalPct).toBeCloseTo(1.0, 2);
  });

  it("component risks sum to portfolio vol", () => {
    const weights = [0.5, 0.5];
    const result = computeMCTR(covMatrix, weights);

    // Portfolio variance = w'Cov*w
    let portVar = 0;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        portVar += weights[i] * covMatrix[i][j] * weights[j];
      }
    }
    const portVol = Math.sqrt(portVar) * Math.sqrt(365);

    const totalComponentRisk = result.reduce((s, r) => s + r.componentRisk, 0);
    expect(totalComponentRisk).toBeCloseTo(portVol, 6);
  });

  it("returns empty for empty inputs", () => {
    expect(computeMCTR([], [])).toEqual([]);
  });

  it("returns zeros for zero covariance", () => {
    const zeroCov = [
      [0, 0],
      [0, 0],
    ];
    const result = computeMCTR(zeroCov, [0.5, 0.5]);
    expect(result).toHaveLength(2);
    expect(result[0].mctr).toBe(0);
    expect(result[0].percentContribution).toBe(0);
  });

  it("higher-vol asset has higher MCTR in equal-weight portfolio", () => {
    const weights = [0.5, 0.5];
    const result = computeMCTR(covMatrix, weights);
    // Asset 1 has higher variance (0.0009 vs 0.0004)
    expect(result[1].mctr).toBeGreaterThan(result[0].mctr);
  });
});
