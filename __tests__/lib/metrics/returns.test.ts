import { describe, it, expect } from "vitest";
import {
  cumulativePnL,
  cumulativeReturn,
  annualizedReturn,
  dailyReturns,
  monthlyReturns,
  returnDistributionStats,
  monthlyDistributionStats,
} from "@/lib/metrics/returns";
import type { TimeSeries } from "@/lib/metrics/returns";

const MS_PER_DAY = 86_400_000;

describe("cumulativePnL", () => {
  it("returns 0 for empty history", () => {
    expect(cumulativePnL([])).toBe(0);
  });

  it("returns 0 for single point", () => {
    expect(cumulativePnL([[1000, 100]])).toBe(0);
  });

  it("computes last - first", () => {
    const history: TimeSeries = [
      [1000, 0],
      [2000, 50],
      [3000, 150],
    ];
    expect(cumulativePnL(history)).toBe(150);
  });

  it("handles negative PnL", () => {
    const history: TimeSeries = [
      [1000, 0],
      [2000, -100],
    ];
    expect(cumulativePnL(history)).toBe(-100);
  });
});

describe("cumulativeReturn", () => {
  it("returns 0 for empty/single", () => {
    expect(cumulativeReturn([])).toBe(0);
    expect(cumulativeReturn([[1000, 100]])).toBe(0);
  });

  it("returns 0 when start is 0", () => {
    expect(cumulativeReturn([[1000, 0], [2000, 100]])).toBe(0);
  });

  it("computes correct return: 100 -> 120 = 0.20", () => {
    const history: TimeSeries = [
      [1000, 100],
      [2000, 120],
    ];
    expect(cumulativeReturn(history)).toBeCloseTo(0.2);
  });

  it("handles loss: 100 -> 80 = -0.20", () => {
    const history: TimeSeries = [
      [1000, 100],
      [2000, 80],
    ];
    expect(cumulativeReturn(history)).toBeCloseTo(-0.2);
  });
});

describe("annualizedReturn", () => {
  it("returns 0 for empty/single", () => {
    expect(annualizedReturn([])).toBe(0);
    expect(annualizedReturn([[1000, 100]])).toBe(0);
  });

  it("100% return over 1 year = 100% annualized", () => {
    const history: TimeSeries = [
      [0, 100],
      [MS_PER_DAY * 365, 200],
    ];
    expect(annualizedReturn(history)).toBeCloseTo(1.0, 2);
  });

  it("100% return over 2 years = ~41.4% annualized", () => {
    // (2)^(1/2) - 1 = 0.4142
    const history: TimeSeries = [
      [0, 100],
      [MS_PER_DAY * 730, 200],
    ];
    expect(annualizedReturn(history)).toBeCloseTo(0.4142, 2);
  });
});

describe("dailyReturns", () => {
  it("returns empty for empty/single", () => {
    expect(dailyReturns([])).toEqual([]);
    expect(dailyReturns([[1000, 100]])).toEqual([]);
  });

  it("computes daily returns across 3 days", () => {
    // Day 0: 100, Day 1: 110 (+10%), Day 2: 99 (-10%)
    const history: TimeSeries = [
      [0, 100],
      [MS_PER_DAY, 110],
      [MS_PER_DAY * 2, 99],
    ];
    const result = dailyReturns(history);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(0.1);
    expect(result[1]).toBeCloseTo(-0.1, 2);
  });

  it("groups multiple points in same day, takes last", () => {
    const history: TimeSeries = [
      [0, 100],
      [1000, 105], // same day, overwritten
      [MS_PER_DAY, 110],
    ];
    const result = dailyReturns(history);
    expect(result).toHaveLength(1);
    // Last value for day 0 is 105, day 1 is 110
    expect(result[0]).toBeCloseTo((110 - 105) / 105);
  });
});

describe("monthlyReturns", () => {
  /** @req INST-04 */
  it("returns empty for empty/single", () => {
    expect(monthlyReturns([])).toEqual([]);
    expect(monthlyReturns([[1000, 100]])).toEqual([]);
  });

  /** @req INST-04 */
  it("computes month-over-month returns across 3 months", () => {
    // Jan 1 2024: 100, Feb 1 2024: 110, Mar 1 2024: 99
    const history: TimeSeries = [
      [Date.UTC(2024, 0, 1), 100],
      [Date.UTC(2024, 1, 1), 110],
      [Date.UTC(2024, 2, 1), 99],
    ];
    const result = monthlyReturns(history);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(0.1); // 100 -> 110
    expect(result[1]).toBeCloseTo(-0.1, 2); // 110 -> 99
  });

  /** @req INST-04 */
  it("groups multiple points in same month, takes last", () => {
    const history: TimeSeries = [
      [Date.UTC(2024, 0, 1), 100],
      [Date.UTC(2024, 0, 15), 105], // same month
      [Date.UTC(2024, 1, 1), 110],
    ];
    const result = monthlyReturns(history);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo((110 - 105) / 105);
  });
});

describe("returnDistributionStats", () => {
  /** @req INST-03 */
  it("returns zeros for empty input", () => {
    const stats = returnDistributionStats([]);
    expect(stats.winRate).toBe(0);
    expect(stats.avgWin).toBe(0);
    expect(stats.avgLoss).toBe(0);
    expect(stats.bestDay).toBe(0);
    expect(stats.worstDay).toBe(0);
  });

  /** @req INST-03 */
  it("computes correct stats for mixed returns", () => {
    // 3 wins (+10%, +5%, +20%), 2 losses (-10%, -5%)
    const daily = [0.10, -0.10, 0.05, -0.05, 0.20];
    const stats = returnDistributionStats(daily);
    expect(stats.winRate).toBeCloseTo(3 / 5);
    expect(stats.avgWin).toBeCloseTo((0.10 + 0.05 + 0.20) / 3);
    expect(stats.avgLoss).toBeCloseTo((-0.10 + -0.05) / 2);
    expect(stats.bestDay).toBeCloseTo(0.20);
    expect(stats.worstDay).toBeCloseTo(-0.10);
  });

  /** @req INST-03 */
  it("handles all-positive returns", () => {
    const stats = returnDistributionStats([0.01, 0.02, 0.03]);
    expect(stats.winRate).toBe(1);
    expect(stats.avgLoss).toBe(0);
  });
});

describe("monthlyDistributionStats", () => {
  /** @req INST-04 */
  it("returns zeros for empty input", () => {
    const stats = monthlyDistributionStats([]);
    expect(stats.positiveMonthPct).toBe(0);
    expect(stats.bestMonth).toBe(0);
    expect(stats.worstMonth).toBe(0);
  });

  /** @req INST-04 */
  it("computes correct stats", () => {
    const monthly = [0.05, -0.03, 0.10, -0.02];
    const stats = monthlyDistributionStats(monthly);
    expect(stats.positiveMonthPct).toBeCloseTo(2 / 4);
    expect(stats.bestMonth).toBeCloseTo(0.10);
    expect(stats.worstMonth).toBeCloseTo(-0.03);
  });
});
