import { describe, it, expect } from "vitest";
import {
  stressTest,
  worstNDayReturn,
  PREDEFINED_SCENARIOS,
} from "@/lib/portfolio/metrics";

// Deterministic pseudo-random returns using LCG
function syntheticReturns(mean: number, vol: number, n: number, seed: number): number[] {
  let state = seed;
  const returns: number[] = [];
  for (let i = 0; i < n; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const u = state / 4294967296;
    // Box-Muller approximation: use simple linear transform
    const z = (u - 0.5) * 3.46; // rough approximation
    returns.push(mean + vol * z);
  }
  return returns;
}

describe("stressTest", () => {
  const returns1 = syntheticReturns(0.001, 0.02, 100, 42);
  const returns2 = syntheticReturns(0.0005, 0.03, 100, 123);

  /** @req PC-17 */
  it("returns one result per scenario", () => {
    const results = stressTest([returns1, returns2], [0.6, 0.4], PREDEFINED_SCENARIOS);
    expect(results).toHaveLength(PREDEFINED_SCENARIOS.length);
  });

  /** @req PC-17 */
  it("each result has portfolioImpact and perVaultImpact", () => {
    const results = stressTest([returns1, returns2], [0.6, 0.4], PREDEFINED_SCENARIOS);
    for (const r of results) {
      expect(typeof r.portfolioImpact).toBe("number");
      expect(r.perVaultImpact).toHaveLength(2);
    }
  });

  /** @req PC-17 */
  it("more severe scenarios produce larger negative impacts", () => {
    const results = stressTest([returns1, returns2], [0.6, 0.4], PREDEFINED_SCENARIOS);
    // Crypto Crash (-50%) should be more severe than Moderate Correction (-20%)
    const crash = results.find((r) => r.scenario.name.includes("Crash (-50%)"));
    const moderate = results.find((r) => r.scenario.name.includes("Moderate"));
    if (crash && moderate) {
      expect(crash.portfolioImpact).toBeLessThan(moderate.portfolioImpact);
    }
  });

  /** @req PC-17 */
  it("returns empty for insufficient data", () => {
    expect(stressTest([], [], PREDEFINED_SCENARIOS)).toEqual([]);
    expect(stressTest([[0.01]], [1.0], PREDEFINED_SCENARIOS)).toEqual([]);
  });
});

describe("worstNDayReturn", () => {
  /** @req PC-17 */
  it("computes worst 1-day return", () => {
    const rets = [0.01, -0.05, 0.02, -0.03, 0.01];
    expect(worstNDayReturn(rets, 1)).toBeCloseTo(-0.05, 4);
  });

  /** @req PC-17 */
  it("computes worst 3-day cumulative return", () => {
    const rets = [0.01, -0.05, -0.03, 0.02, 0.01];
    // Check all 3-day windows and pick the worst
    const windows = [
      (1 + 0.01) * (1 - 0.05) * (1 - 0.03) - 1, // days 0-2
      (1 - 0.05) * (1 - 0.03) * (1 + 0.02) - 1, // days 1-3
      (1 - 0.03) * (1 + 0.02) * (1 + 0.01) - 1, // days 2-4
    ];
    const expected = Math.min(...windows);
    expect(worstNDayReturn(rets, 3)).toBeCloseTo(expected, 4);
  });

  /** @req PC-17 */
  it("returns 0 for insufficient data", () => {
    expect(worstNDayReturn([], 1)).toBe(0);
    expect(worstNDayReturn([0.01], 5)).toBe(0);
  });

  /** @req PC-17 */
  it("returns 0 for nDays < 1", () => {
    expect(worstNDayReturn([0.01, 0.02], 0)).toBe(0);
  });
});
