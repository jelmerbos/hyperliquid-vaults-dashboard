import { describe, it, expect } from "vitest";
import {
  cumulativePnL,
  cumulativeReturn,
  annualizedReturn,
  dailyReturns,
  monthlyReturns,
  returnDistributionStats,
  monthlyDistributionStats,
  pnlBasedDailyReturns,
  pnlBasedCumulativeReturn,
  pnlBasedAnnualizedReturn,
  pnlBasedMonthlyReturns,
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

describe("pnlBasedDailyReturns", () => {
  /** @req DIVE-13 */
  it("returns empty for insufficient data", () => {
    expect(pnlBasedDailyReturns([], [])).toEqual([]);
    expect(pnlBasedDailyReturns([[1000, 100]], [[1000, 0]])).toEqual([]);
  });

  /** @req DIVE-13 */
  it("computes deltaPnL / prevAV for clean data", () => {
    // Day 0: AV=1000, PnL=0; Day 1: AV=1010, PnL=10; Day 2: AV=1005, PnL=5
    const av: TimeSeries = [
      [0, 1000],
      [MS_PER_DAY, 1010],
      [MS_PER_DAY * 2, 1005],
    ];
    const pnl: TimeSeries = [
      [0, 0],
      [MS_PER_DAY, 10],
      [MS_PER_DAY * 2, 5],
    ];
    const result = pnlBasedDailyReturns(av, pnl);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(10 / 1000); // +1%
    expect(result[1]).toBeCloseTo(-5 / 1010); // -0.5% (PnL went from 10 to 5)
  });

  /** @req DIVE-13 */
  it("strips deposit effects: AV jump from deposit does not affect return", () => {
    // Day 0: AV=1000, PnL=0
    // Day 1: AV=2010, PnL=10 (deposit of 1000 + trading gain of 10)
    // Day 2: AV=2020, PnL=20 (trading gain of 10 more)
    //
    // AV-based daily returns would show: (2010-1000)/1000 = 101% then (2020-2010)/2010 = 0.5%
    // PnL-based should show: 10/1000 = 1% then 10/2010 = 0.5%
    const av: TimeSeries = [
      [0, 1000],
      [MS_PER_DAY, 2010],     // 1000 deposit + 10 trading gain
      [MS_PER_DAY * 2, 2020], // 10 more trading gain
    ];
    const pnl: TimeSeries = [
      [0, 0],
      [MS_PER_DAY, 10],  // Only trading P&L
      [MS_PER_DAY * 2, 20],
    ];
    const result = pnlBasedDailyReturns(av, pnl);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(0.01); // 10/1000 = 1%, not 101%
    expect(result[1]).toBeCloseTo(10 / 2010);
  });

  /** @req DIVE-13 */
  it("handles zero previous AV gracefully", () => {
    const av: TimeSeries = [
      [0, 0],
      [MS_PER_DAY, 100],
    ];
    const pnl: TimeSeries = [
      [0, 0],
      [MS_PER_DAY, 5],
    ];
    const result = pnlBasedDailyReturns(av, pnl);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(0);
  });
});

describe("pnlBasedCumulativeReturn", () => {
  /** @req DIVE-13 */
  it("returns 0 for insufficient data", () => {
    expect(pnlBasedCumulativeReturn([], [])).toBe(0);
  });

  /** @req DIVE-13 */
  it("computes totalPnL / startingAV", () => {
    const av: TimeSeries = [
      [0, 1000],
      [MS_PER_DAY, 1100],
    ];
    const pnl: TimeSeries = [
      [0, 0],
      [MS_PER_DAY, 50],
    ];
    // Return = 50/1000 = 5%, even though AV shows 10%
    expect(pnlBasedCumulativeReturn(av, pnl)).toBeCloseTo(0.05);
  });

  /** @req DIVE-13 */
  it("strips deposit effect from cumulative return", () => {
    // AV went from 1000 to 3050 but 2000 was deposits; only 50 was trading
    const av: TimeSeries = [
      [0, 1000],
      [MS_PER_DAY * 30, 3050],
    ];
    const pnl: TimeSeries = [
      [0, 0],
      [MS_PER_DAY * 30, 50],
    ];
    // AV-based: (3050-1000)/1000 = 205%
    // PnL-based: 50/1000 = 5%
    expect(pnlBasedCumulativeReturn(av, pnl)).toBeCloseTo(0.05);
  });
});

describe("pnlBasedAnnualizedReturn", () => {
  /** @req DIVE-13 */
  it("returns 0 for insufficient data", () => {
    expect(pnlBasedAnnualizedReturn([], [])).toBe(0);
  });

  /** @req DIVE-13 */
  it("annualizes PnL-based daily returns", () => {
    // 365 days, 1% total PnL-based return
    const av: TimeSeries = [
      [0, 10000],
      [MS_PER_DAY * 365, 10500],
    ];
    const pnl: TimeSeries = [
      [0, 0],
      [MS_PER_DAY * 365, 100],
    ];
    const annRet = pnlBasedAnnualizedReturn(av, pnl);
    // With just 2 points, we get 1 daily return of 100/10000 = 1%
    // Annualized over 1 year: (1.01)^1 - 1 = 1%
    expect(annRet).toBeCloseTo(0.01, 2);
  });
});

describe("pnlBasedMonthlyReturns", () => {
  /** @req DIVE-13 */
  it("returns empty for insufficient data", () => {
    expect(pnlBasedMonthlyReturns([], [])).toEqual([]);
  });

  /** @req DIVE-13 */
  it("computes monthly deltaPnL / prevMonthAV", () => {
    const av: TimeSeries = [
      [Date.UTC(2024, 0, 1), 1000],
      [Date.UTC(2024, 1, 1), 1050],
      [Date.UTC(2024, 2, 1), 1080],
    ];
    const pnl: TimeSeries = [
      [Date.UTC(2024, 0, 1), 0],
      [Date.UTC(2024, 1, 1), 50],
      [Date.UTC(2024, 2, 1), 80],
    ];
    const result = pnlBasedMonthlyReturns(av, pnl);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(50 / 1000);  // 5%
    expect(result[1]).toBeCloseTo(30 / 1050);  // ~2.86%
  });

  /** @req DIVE-13 */
  it("strips deposit effect from monthly returns", () => {
    // Month 1: deposit 5000, trading gain 20
    const av: TimeSeries = [
      [Date.UTC(2024, 0, 1), 1000],
      [Date.UTC(2024, 1, 1), 6020], // 5000 deposit + 20 gain
      [Date.UTC(2024, 2, 1), 6050], // 30 more gain
    ];
    const pnl: TimeSeries = [
      [Date.UTC(2024, 0, 1), 0],
      [Date.UTC(2024, 1, 1), 20],
      [Date.UTC(2024, 2, 1), 50],
    ];
    const result = pnlBasedMonthlyReturns(av, pnl);
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(20 / 1000);  // 2% (not 502%)
    expect(result[1]).toBeCloseTo(30 / 6020);
  });
});
