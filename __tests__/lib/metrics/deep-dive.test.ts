import { describe, it, expect } from "vitest";
import {
  computeDeepDiveMetrics,
  computePercentileRanks,
  filterQualifyingVaults,
  pickTopVaults,
  stripLeadingZeros,
  sliceToPeriod,
} from "@/lib/metrics/deep-dive";
import { beta } from "@/lib/metrics/benchmark";
import { dailyReturns } from "@/lib/metrics";
import type { DeepDiveMetrics } from "@/lib/metrics/deep-dive";
import type { TimeSeries } from "@/lib/metrics";

// Generate a synthetic account value history with N daily data points
function makeHistory(days: number, startValue: number = 10000, dailyReturn: number = 0.001): TimeSeries {
  const series: TimeSeries = [];
  let value = startValue;
  const startTs = Date.now() - days * 86_400_000;
  for (let i = 0; i < days; i++) {
    series.push([startTs + i * 86_400_000, value]);
    value *= 1 + dailyReturn;
  }
  return series;
}

// Generate a synthetic PnL history matching account value history
function makePnlHistory(avHistory: TimeSeries): TimeSeries {
  if (avHistory.length === 0) return [];
  const start = avHistory[0][1];
  return avHistory.map(([ts, val]) => [ts, val - start]);
}

// Helper to make mock vault list items
function makeVaultListItem(
  address: string,
  tvl: string,
  apr: number,
  ageDays: number,
  isClosed: boolean = false,
) {
  return {
    apr,
    pnls: [] as [string, string[]][],
    summary: {
      name: `Vault ${address}`,
      vaultAddress: address,
      leader: "0xleader",
      tvl,
      isClosed,
      relationship: { type: "normal" },
      createTimeMillis: Date.now() - ageDays * 86_400_000,
    },
  };
}

describe("stripLeadingZeros", () => {
  /** @req DIVE-12 */
  it("strips leading zero values from series", () => {
    const series: TimeSeries = [
      [1000, 0],
      [2000, 0],
      [3000, 100],
      [4000, 110],
    ];
    const result = stripLeadingZeros(series);
    expect(result).toHaveLength(2);
    expect(result[0][1]).toBe(100);
  });

  /** @req DIVE-12 */
  it("returns original series if no leading zeros", () => {
    const series: TimeSeries = [[1000, 100], [2000, 110]];
    const result = stripLeadingZeros(series);
    expect(result).toHaveLength(2);
  });

  /** @req DIVE-12 */
  it("strips near-zero values (< 0.01)", () => {
    const series: TimeSeries = [
      [1000, 0.005],
      [2000, 50],
      [3000, 60],
    ];
    const result = stripLeadingZeros(series);
    expect(result).toHaveLength(2);
    expect(result[0][1]).toBe(50);
  });
});

describe("sliceToPeriod", () => {
  /** @req DIVE-11 */
  it("returns full series for ITD period", () => {
    const series = makeHistory(100);
    const result = sliceToPeriod(series, "ITD");
    expect(result).toHaveLength(100);
  });

  /** @req DIVE-11 */
  it("slices to last 30 days for 30D period", () => {
    const series = makeHistory(100);
    const result = sliceToPeriod(series, "30D");
    expect(result.length).toBeGreaterThanOrEqual(29);
    expect(result.length).toBeLessThanOrEqual(31);
  });

  /** @req DIVE-11 */
  it("slices to last 7 days for 7D period", () => {
    const series = makeHistory(100);
    const result = sliceToPeriod(series, "7D");
    expect(result.length).toBeGreaterThanOrEqual(6);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  /** @req DIVE-11 */
  it("returns full series if sliced result would be < 2 points", () => {
    const series = makeHistory(5);
    const result = sliceToPeriod(series, "7D");
    // 5 days of data with 7D lookback: all points are within window
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe("computeDeepDiveMetrics", () => {
  /** @req DIVE-12 */
  it("returns null for insufficient data (< 5 points)", () => {
    const history = makeHistory(3);
    const pnl = makePnlHistory(history);
    expect(computeDeepDiveMetrics(history, pnl)).toBeNull();
  });

  /** @req DIVE-06 */
  it("returns metrics for 5+ data points", () => {
    const history = makeHistory(60, 10000, 0.002);
    const pnl = makePnlHistory(history);
    const metrics = computeDeepDiveMetrics(history, pnl);

    expect(metrics).not.toBeNull();
    expect(metrics!.annReturn).toBeGreaterThan(0);
    expect(metrics!.cumReturn).toBeGreaterThan(0);
    expect(metrics!.pnl).toBeGreaterThan(0);
    expect(metrics!.annVol).toBeGreaterThan(0);
    expect(metrics!.sharpe).toBeGreaterThan(0);
    expect(metrics!.sortino).toBeGreaterThanOrEqual(0);
  });

  /** @req DIVE-06 */
  it("computes all expected metric fields including pnl", () => {
    const history = makeHistory(90, 10000, 0.001);
    const pnl = makePnlHistory(history);
    const metrics = computeDeepDiveMetrics(history, pnl)!;

    expect(metrics).toHaveProperty("annReturn");
    expect(metrics).toHaveProperty("cumReturn");
    expect(metrics).toHaveProperty("pnl");
    expect(metrics).toHaveProperty("annVol");
    expect(metrics).toHaveProperty("maxDD");
    expect(metrics).toHaveProperty("maxDDDuration");
    expect(metrics).toHaveProperty("sharpe");
    expect(metrics).toHaveProperty("sortino");
    expect(metrics).toHaveProperty("calmar");
    expect(metrics).toHaveProperty("recoveryFactor");
    expect(metrics).toHaveProperty("var95");
    expect(metrics).toHaveProperty("cvar95");
    expect(metrics).toHaveProperty("winRate");
    expect(metrics).toHaveProperty("positiveMonthPct");
    expect(metrics).toHaveProperty("betaBtc");
    expect(metrics).toHaveProperty("betaHype");
  });

  /** @req DIVE-06 */
  it("initializes beta fields as null", () => {
    const history = makeHistory(60);
    const pnl = makePnlHistory(history);
    const metrics = computeDeepDiveMetrics(history, pnl)!;

    expect(metrics.betaBtc).toBeNull();
    expect(metrics.betaHype).toBeNull();
  });

  /** @req DIVE-06 */
  it("computes reasonable VaR and CVaR values", () => {
    const history = makeHistory(100, 10000, 0.001);
    const pnl = makePnlHistory(history);
    const metrics = computeDeepDiveMetrics(history, pnl)!;

    expect(typeof metrics.var95).toBe("number");
    expect(typeof metrics.cvar95).toBe("number");
    expect(metrics.cvar95).toBeLessThanOrEqual(metrics.var95 + 1e-10);
  });

  /** @req DIVE-06 */
  it("computes correct win rate for always-positive returns", () => {
    const history = makeHistory(60, 10000, 0.005);
    const pnl = makePnlHistory(history);
    const metrics = computeDeepDiveMetrics(history, pnl)!;

    expect(metrics.winRate).toBeCloseTo(1.0, 1);
  });

  /** @req DIVE-11 */
  it("respects period parameter for metric computation", () => {
    const history = makeHistory(100, 10000, 0.002);
    const pnl = makePnlHistory(history);
    const itdMetrics = computeDeepDiveMetrics(history, pnl, "ITD")!;
    const shortMetrics = computeDeepDiveMetrics(history, pnl, "30D")!;

    // Cumulative return for 30D should be less than ITD (shorter period)
    expect(shortMetrics.cumReturn).toBeLessThan(itdMetrics.cumReturn);
  });

  /** @req DIVE-12 */
  it("strips leading zeros before computing metrics", () => {
    // Start with zeros, then real values
    const zeros: TimeSeries = Array.from({ length: 5 }, (_, i) => [
      Date.now() - (100 - i) * 86_400_000,
      0,
    ]);
    const real = makeHistory(60, 10000, 0.002);
    const history = [...zeros, ...real];
    const pnl = makePnlHistory(history);
    const metrics = computeDeepDiveMetrics(history, pnl);

    expect(metrics).not.toBeNull();
    expect(metrics!.annReturn).toBeGreaterThan(0);
  });
});

describe("filterQualifyingVaults", () => {
  /** @req DIVE-02 */
  it("filters by minimum TVL", () => {
    const vaults = [
      makeVaultListItem("0xa", "1000000", 0.5, 200),
      makeVaultListItem("0xb", "100000", 0.3, 200),
      makeVaultListItem("0xc", "500000", 0.4, 200),
    ];

    const result = filterQualifyingVaults(vaults, 500000, 0);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.summary.vaultAddress)).toEqual(["0xa", "0xc"]);
  });

  /** @req DIVE-03 */
  it("filters by minimum age", () => {
    const vaults = [
      makeVaultListItem("0xa", "1000000", 0.5, 200),
      makeVaultListItem("0xb", "1000000", 0.3, 90),
      makeVaultListItem("0xc", "1000000", 0.4, 180),
    ];

    const result = filterQualifyingVaults(vaults, 0, 180);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.summary.vaultAddress)).toEqual(["0xa", "0xc"]);
  });

  /** @req DIVE-02 DIVE-03 */
  it("filters by both TVL and age", () => {
    const vaults = [
      makeVaultListItem("0xa", "1000000", 0.5, 200), // passes both
      makeVaultListItem("0xb", "100000", 0.3, 200),   // fails TVL
      makeVaultListItem("0xc", "1000000", 0.4, 90),   // fails age
    ];

    const result = filterQualifyingVaults(vaults, 500000, 180);
    expect(result).toHaveLength(1);
    expect(result[0].summary.vaultAddress).toBe("0xa");
  });

  /** @req DIVE-02 */
  it("excludes closed vaults", () => {
    const vaults = [
      makeVaultListItem("0xa", "1000000", 0.5, 200, true), // closed
      makeVaultListItem("0xb", "1000000", 0.3, 200, false),
    ];

    const result = filterQualifyingVaults(vaults, 0, 0);
    expect(result).toHaveLength(1);
    expect(result[0].summary.vaultAddress).toBe("0xb");
  });
});

describe("pickTopVaults", () => {
  /** @req DIVE-04 */
  it("picks top 5 by TVL + top 5 by APR, deduped", () => {
    const vaults = Array.from({ length: 20 }, (_, i) =>
      makeVaultListItem(
        `0x${i.toString(16).padStart(2, "0")}`,
        String((20 - i) * 100000), // TVL: 2M, 1.9M, ...
        i * 0.05,                   // APR: 0%, 5%, 10%, ...
        200,
      ),
    );

    const result = pickTopVaults(vaults, 5, 5);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result.length).toBeGreaterThanOrEqual(5);

    // Top by TVL: 0x00 (2M), 0x01 (1.9M), 0x02 (1.8M), 0x03 (1.7M), 0x04 (1.6M)
    // Top by APR: 0x13 (95%), 0x12 (90%), 0x11 (85%), 0x10 (80%), 0x0f (75%)
    // No overlap, so should be exactly 10
    expect(result).toHaveLength(10);
  });

  /** @req DIVE-04 */
  it("deduplicates vaults that appear in both TVL and APR lists", () => {
    const vaults = [
      makeVaultListItem("0xa", "1000000", 0.9, 200), // top TVL AND top APR
      makeVaultListItem("0xb", "500000", 0.8, 200),
      makeVaultListItem("0xc", "200000", 0.1, 200),
    ];

    const result = pickTopVaults(vaults, 5, 5);
    const addresses = result.map((v) => v.summary.vaultAddress);
    const unique = new Set(addresses);
    expect(addresses.length).toBe(unique.size); // no duplicates
  });

  /** @req DIVE-04 */
  it("respects separate topByTvl and topByReturn limits", () => {
    const vaults = Array.from({ length: 20 }, (_, i) =>
      makeVaultListItem(`0x${i}`, String((20 - i) * 100000), i * 0.05, 200),
    );

    // 3 by TVL + 2 by APR = at most 5
    const result = pickTopVaults(vaults, 3, 2);
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  /** @req DIVE-04 */
  it("allows asymmetric selection (10 by TVL, 3 by return)", () => {
    const vaults = Array.from({ length: 20 }, (_, i) =>
      makeVaultListItem(
        `0x${i.toString(16).padStart(2, "0")}`,
        String((20 - i) * 100000),
        i * 0.05,
        200,
      ),
    );

    const result = pickTopVaults(vaults, 10, 3);
    // At most 13 unique vaults (10 TVL + 3 APR, likely some overlap)
    expect(result.length).toBeLessThanOrEqual(13);
    expect(result.length).toBeGreaterThanOrEqual(10);
  });

  /** @req DIVE-04 */
  it("returns all vaults if fewer than requested", () => {
    const vaults = [
      makeVaultListItem("0xa", "1000000", 0.5, 200),
      makeVaultListItem("0xb", "500000", 0.3, 200),
    ];

    const result = pickTopVaults(vaults, 10, 10);
    expect(result).toHaveLength(2);
  });
});

describe("computePercentileRanks", () => {
  function makeTestMetrics(overrides: Partial<DeepDiveMetrics> = {}): DeepDiveMetrics {
    return {
      annReturn: 0.1,
      cumReturn: 0.1,
      pnl: 1000,
      annVol: 0.2,
      maxDD: -0.1,
      maxDDDuration: 10,
      sharpe: 0.5,
      sortino: 0.7,
      calmar: 1.0,
      recoveryFactor: 1.0,
      var95: -0.02,
      cvar95: -0.03,
      winRate: 0.5,
      positiveMonthPct: 0.5,
      betaBtc: null,
      betaHype: null,
      ...overrides,
    };
  }

  /** @req DIVE-14 */
  it("returns empty array for empty input", () => {
    expect(computePercentileRanks([])).toEqual([]);
  });

  /** @req DIVE-14 */
  it("ranks higher-is-better metrics correctly", () => {
    const metrics = [
      makeTestMetrics({ sharpe: 0.5 }),
      makeTestMetrics({ sharpe: 1.5 }),
      makeTestMetrics({ sharpe: 2.5 }),
    ];
    const ranks = computePercentileRanks(metrics);
    expect(ranks[0].sharpe).toBe(0);   // worst
    expect(ranks[1].sharpe).toBe(50);  // middle
    expect(ranks[2].sharpe).toBe(100); // best
  });

  /** @req DIVE-14 */
  it("ranks lower-is-better metrics correctly (lower vol = higher percentile)", () => {
    const metrics = [
      makeTestMetrics({ annVol: 0.10 }),  // lowest vol = best
      makeTestMetrics({ annVol: 0.20 }),
      makeTestMetrics({ annVol: 0.30 }),  // highest vol = worst
    ];
    const ranks = computePercentileRanks(metrics);
    expect(ranks[0].annVol).toBe(100);  // lowest vol = best percentile
    expect(ranks[1].annVol).toBe(50);
    expect(ranks[2].annVol).toBe(0);    // highest vol = worst percentile
  });

  /** @req DIVE-14 */
  it("handles null metrics gracefully", () => {
    const metrics = [
      makeTestMetrics({ sharpe: 1.0 }),
      null,
      makeTestMetrics({ sharpe: 2.0 }),
    ];
    const ranks = computePercentileRanks(metrics);
    expect(ranks).toHaveLength(3);
    expect(ranks[0].sharpe).toBe(0);
    expect(ranks[1].sharpe).toBeUndefined();
    expect(ranks[2].sharpe).toBe(100);
  });

  /** @req DIVE-14 */
  it("computes percentiles for maxDD (less negative = better = higher percentile)", () => {
    const metrics = [
      makeTestMetrics({ maxDD: -0.30 }), // worst DD (30%)
      makeTestMetrics({ maxDD: -0.10 }), // best DD (10%)
      makeTestMetrics({ maxDD: -0.20 }),  // middle
    ];
    const ranks = computePercentileRanks(metrics);
    // -0.10 is numerically highest = best percentile (higher-is-better)
    expect(ranks[1].maxDD).toBe(100); // -0.10 = best
    expect(ranks[2].maxDD).toBe(50);  // -0.20 = middle
    expect(ranks[0].maxDD).toBe(0);   // -0.30 = worst
  });
});

describe("beta enrichment", () => {
  /** @req DIVE-07 */
  it("beta can be computed from vault and benchmark daily returns", () => {
    // Vault that moves 2x the benchmark
    const benchmarkReturns = [0.01, -0.005, 0.02, -0.01, 0.015, 0.008, -0.003, 0.012, -0.007, 0.01];
    const vaultReturns = benchmarkReturns.map((r) => r * 2 + 0.001); // 2x leverage + small alpha

    const b = beta(vaultReturns, benchmarkReturns);
    expect(b).toBeGreaterThan(1.5);
    expect(b).toBeLessThan(2.5);
  });

  /** @req DIVE-07 */
  it("beta is approximately 0 for uncorrelated returns", () => {
    // Alternating pattern that has no correlation with benchmark
    const benchmarkReturns = [0.01, -0.01, 0.01, -0.01, 0.01, -0.01, 0.01, -0.01, 0.01, -0.01];
    const vaultReturns =     [0.02, 0.02, -0.02, -0.02, 0.02, 0.02, -0.02, -0.02, 0.02, 0.02];

    const b = beta(vaultReturns, benchmarkReturns);
    expect(Math.abs(b)).toBeLessThan(0.5);
  });

  /** @req DIVE-07 */
  it("DeepDiveMetrics betaBtc and betaHype start as null and can be set", () => {
    const history = makeHistory(60, 10000, 0.002);
    const pnl = makePnlHistory(history);
    const metrics = computeDeepDiveMetrics(history, pnl)!;

    expect(metrics.betaBtc).toBeNull();
    expect(metrics.betaHype).toBeNull();

    // Simulate what the hook does: compute beta and assign
    const vaultDaily = dailyReturns(history);
    const fakeBenchmarkReturns = vaultDaily.map((r) => r * 0.5);
    metrics.betaBtc = beta(vaultDaily, fakeBenchmarkReturns);

    expect(metrics.betaBtc).toBeGreaterThan(1.5);
    expect(metrics.betaHype).toBeNull(); // unchanged
  });
});
