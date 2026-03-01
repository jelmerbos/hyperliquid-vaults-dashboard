import { describe, it, expect } from "vitest";
import {
  sharpeRatio,
  romad,
  sortinoRatio,
  calmarRatio,
  recoveryFactor,
  rollingSharpe,
  valueAtRisk,
  conditionalVaR,
} from "@/lib/metrics/risk-adjusted";

describe("sharpeRatio", () => {
  it("returns 0 when volatility is 0", () => {
    expect(sharpeRatio(0.5, 0)).toBe(0);
  });

  it("computes return / vol: 0.20 / 0.10 = 2.0", () => {
    expect(sharpeRatio(0.20, 0.10)).toBeCloseTo(2.0);
  });

  it("handles negative return", () => {
    expect(sharpeRatio(-0.10, 0.20)).toBeCloseTo(-0.5);
  });
});

describe("romad", () => {
  it("returns 0 when max drawdown is 0", () => {
    expect(romad(0.5, 0)).toBe(0);
  });

  it("computes return / abs(maxDD): 0.20 / 0.25 = 0.80", () => {
    expect(romad(0.20, -0.25)).toBeCloseTo(0.80);
  });

  it("handles negative return", () => {
    expect(romad(-0.10, -0.25)).toBeCloseTo(-0.40);
  });
});

describe("sortinoRatio", () => {
  /** @req INST-01 */
  it("returns 0 for insufficient data", () => {
    expect(sortinoRatio(0.20, [])).toBe(0);
    expect(sortinoRatio(0.20, [0.01])).toBe(0);
  });

  /** @req INST-01 */
  it("returns 0 when no negative returns exist", () => {
    expect(sortinoRatio(0.20, [0.01, 0.02, 0.03])).toBe(0);
  });

  /** @req INST-01 */
  it("computes correctly with mixed returns", () => {
    // Known daily returns: 3 positive, 2 negative
    const daily = [0.01, -0.02, 0.015, -0.01, 0.005];
    // Downside squares: (-0.02)^2 + (-0.01)^2 = 0.0004 + 0.0001 = 0.0005
    // Downside variance: 0.0005 / 5 = 0.0001
    // Downside dev (annualized): sqrt(0.0001) * sqrt(365) = 0.01 * 19.105 = 0.19105
    const annRet = 0.20;
    const result = sortinoRatio(annRet, daily);
    expect(result).toBeCloseTo(0.20 / 0.19105, 1);
  });

  /** @req INST-01 */
  it("is higher than Sharpe when downside vol < total vol", () => {
    // Asymmetric returns: mostly positive with small negatives
    const daily = [0.05, 0.03, 0.04, -0.01, 0.02, -0.005];
    const annRet = 0.50;
    const mean = daily.reduce((a, b) => a + b, 0) / daily.length;
    const variance = daily.reduce((s, r) => s + (r - mean) ** 2, 0) / (daily.length - 1);
    const annVol = Math.sqrt(variance) * Math.sqrt(365);
    const sharpe = sharpeRatio(annRet, annVol);
    const sortino = sortinoRatio(annRet, daily);
    expect(sortino).toBeGreaterThan(sharpe);
  });
});

describe("calmarRatio", () => {
  /** @req INST-02 */
  it("returns 0 when max drawdown is 0", () => {
    expect(calmarRatio(0.5, 0)).toBe(0);
  });

  /** @req INST-02 */
  it("computes return / abs(maxDD): 0.30 / 0.15 = 2.0", () => {
    expect(calmarRatio(0.30, -0.15)).toBeCloseTo(2.0);
  });
});

describe("recoveryFactor", () => {
  /** @req INST-08 */
  it("returns 0 when max drawdown is 0", () => {
    expect(recoveryFactor(1.5, 0)).toBe(0);
  });

  /** @req INST-08 */
  it("computes cumReturn / abs(maxDD): 1.0 / 0.25 = 4.0", () => {
    expect(recoveryFactor(1.0, -0.25)).toBeCloseTo(4.0);
  });

  /** @req INST-08 */
  it("handles negative cumulative return", () => {
    expect(recoveryFactor(-0.20, -0.30)).toBeCloseTo(-0.20 / 0.30);
  });
});

describe("rollingSharpe", () => {
  /** @req INST-05 */
  it("returns empty when data shorter than window", () => {
    expect(rollingSharpe([0.01, -0.01], 5)).toEqual([]);
  });

  /** @req INST-05 */
  it("returns empty when window < 2", () => {
    expect(rollingSharpe([0.01, -0.01, 0.01], 1)).toEqual([]);
  });

  /** @req INST-05 */
  it("returns correct number of results", () => {
    const daily = [0.01, -0.01, 0.02, -0.02, 0.01, -0.01, 0.015];
    const result = rollingSharpe(daily, 3);
    expect(result).toHaveLength(5); // 7 - 3 + 1
  });

  /** @req INST-05 */
  it("window of constant returns yields 0 (no volatility)", () => {
    const daily = [0.01, 0.01, 0.01, 0.02, -0.01];
    const result = rollingSharpe(daily, 3);
    // First window [0.01, 0.01, 0.01] has zero vol -> Sharpe = 0
    expect(result[0]).toBe(0);
  });
});

describe("valueAtRisk", () => {
  /** @req INST-07 */
  it("returns 0 for insufficient data", () => {
    expect(valueAtRisk([])).toBe(0);
    expect(valueAtRisk([0.01])).toBe(0);
  });

  /** @req INST-07 */
  it("returns negative value for portfolio with losses", () => {
    // 20 returns: 15 positive, 5 negative
    const daily = [
      -0.05, -0.04, -0.03, -0.02, -0.01,
      0.01, 0.02, 0.03, 0.01, 0.02,
      0.01, 0.03, 0.02, 0.01, 0.02,
      0.01, 0.03, 0.02, 0.01, 0.02,
    ];
    const var95 = valueAtRisk(daily, 0.95);
    // 5th percentile: floor(20 * 0.05) = 1, so index 1 of sorted = -0.04
    expect(var95).toBeCloseTo(-0.04);
    expect(var95).toBeLessThan(0);
  });

  /** @req INST-07 */
  it("lower confidence yields less extreme VaR", () => {
    const daily = [-0.05, -0.04, -0.03, -0.02, -0.01, 0.01, 0.02, 0.03, 0.04, 0.05];
    const var95 = valueAtRisk(daily, 0.95);
    const var90 = valueAtRisk(daily, 0.90);
    // 95% VaR should be more negative (further in the tail) than 90%
    expect(var95).toBeLessThanOrEqual(var90);
  });
});

describe("conditionalVaR", () => {
  /** @req INST-07 */
  it("returns 0 for insufficient data", () => {
    expect(conditionalVaR([])).toBe(0);
    expect(conditionalVaR([0.01])).toBe(0);
  });

  /** @req INST-07 */
  it("CVaR is more negative than VaR (further into the tail)", () => {
    const daily = [
      -0.10, -0.05, -0.03, -0.02, -0.01,
      0.01, 0.02, 0.03, 0.04, 0.05,
      0.01, 0.02, 0.03, 0.04, 0.05,
      0.01, 0.02, 0.03, 0.04, 0.05,
    ];
    const var95 = valueAtRisk(daily, 0.95);
    const cvar95 = conditionalVaR(daily, 0.95);
    expect(cvar95).toBeLessThanOrEqual(var95);
  });

  /** @req INST-07 */
  it("computes average of tail losses", () => {
    // 10 returns sorted: -0.10, -0.08, -0.05, -0.03, -0.01, 0.01, 0.02, 0.03, 0.04, 0.05
    // 95% confidence: cutoff = floor(10 * 0.05) = 0, clamped to 1
    // Tail = [-0.10], average = -0.10
    const daily = [-0.10, -0.08, -0.05, -0.03, -0.01, 0.01, 0.02, 0.03, 0.04, 0.05];
    const cvar95 = conditionalVaR(daily, 0.95);
    expect(cvar95).toBeCloseTo(-0.10);
  });
});
