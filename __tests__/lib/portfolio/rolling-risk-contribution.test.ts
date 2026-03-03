import { describe, it, expect } from "vitest";
import { rollingRiskContribution } from "@/lib/portfolio/metrics";

// Deterministic pseudo-random returns using LCG
function syntheticReturns(mean: number, vol: number, n: number, seed: number): number[] {
  let state = seed;
  const returns: number[] = [];
  for (let i = 0; i < n; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const u = state / 4294967296;
    const z = (u - 0.5) * 3.46;
    returns.push(mean + vol * z);
  }
  return returns;
}

describe("rollingRiskContribution", () => {
  const returns1 = syntheticReturns(0.001, 0.02, 50, 42);
  const returns2 = syntheticReturns(0.0005, 0.03, 50, 123);

  /** @req PC-16 */
  it("returns correct dimensions", () => {
    const result = rollingRiskContribution([returns1, returns2], [0.6, 0.4], 20);
    expect(result).toHaveLength(2); // 2 vaults
    expect(result[0]).toHaveLength(31); // 50 - 20 + 1
    expect(result[1]).toHaveLength(31);
  });

  /** @req PC-16 */
  it("contributions sum to ~1 for each window", () => {
    const result = rollingRiskContribution([returns1, returns2], [0.6, 0.4], 20);
    for (let w = 0; w < result[0].length; w++) {
      const sum = result[0][w] + result[1][w];
      expect(sum).toBeCloseTo(1.0, 2);
    }
  });

  /** @req PC-16 */
  it("returns empty for insufficient data", () => {
    expect(rollingRiskContribution([], [], 20)).toEqual([]);
    expect(rollingRiskContribution([returns1], [1.0], 100)).toEqual([]);
  });

  /** @req PC-16 */
  it("returns empty for mismatched weights", () => {
    expect(rollingRiskContribution([returns1, returns2], [0.5], 20)).toEqual([]);
  });

  /** @req PC-16 */
  it("single vault gets 100% contribution", () => {
    const result = rollingRiskContribution([returns1], [1.0], 20);
    expect(result).toHaveLength(1);
    for (const val of result[0]) {
      expect(val).toBeCloseTo(1.0, 2);
    }
  });
});
