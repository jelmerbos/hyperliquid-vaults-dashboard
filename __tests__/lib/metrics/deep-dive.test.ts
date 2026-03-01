import { describe, it, expect } from "vitest";
import {
  computeDeepDiveMetrics,
  filterQualifyingVaults,
  pickTopVaults,
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

describe("computeDeepDiveMetrics", () => {
  /** @req DIVE-12 */
  it("returns null for insufficient data (< 30 points)", () => {
    const history = makeHistory(10);
    expect(computeDeepDiveMetrics(history)).toBeNull();
  });

  /** @req DIVE-12 */
  it("returns null for exactly 29 data points", () => {
    const history = makeHistory(29);
    expect(computeDeepDiveMetrics(history)).toBeNull();
  });

  /** @req DIVE-06 */
  it("returns metrics for 30+ data points", () => {
    const history = makeHistory(60, 10000, 0.002);
    const metrics = computeDeepDiveMetrics(history);

    expect(metrics).not.toBeNull();
    expect(metrics!.annReturn).toBeGreaterThan(0);
    expect(metrics!.cumReturn).toBeGreaterThan(0);
    expect(metrics!.annVol).toBeGreaterThan(0);
    expect(metrics!.sharpe).toBeGreaterThan(0);
    // Sortino is 0 when there are no negative returns (no downside deviation)
    expect(metrics!.sortino).toBeGreaterThanOrEqual(0);
  });

  /** @req DIVE-06 */
  it("computes all expected metric fields", () => {
    const history = makeHistory(90, 10000, 0.001);
    const metrics = computeDeepDiveMetrics(history)!;

    expect(metrics).toHaveProperty("annReturn");
    expect(metrics).toHaveProperty("cumReturn");
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
    const metrics = computeDeepDiveMetrics(history)!;

    expect(metrics.betaBtc).toBeNull();
    expect(metrics.betaHype).toBeNull();
  });

  /** @req DIVE-06 */
  it("computes reasonable VaR and CVaR values", () => {
    // Steady positive returns: VaR should be near zero or slightly positive
    const history = makeHistory(100, 10000, 0.001);
    const metrics = computeDeepDiveMetrics(history)!;

    // VaR is the 5th percentile return; for steady returns it should be close to the daily return
    expect(typeof metrics.var95).toBe("number");
    expect(typeof metrics.cvar95).toBe("number");
    // CVaR should be <= VaR (further in the tail)
    expect(metrics.cvar95).toBeLessThanOrEqual(metrics.var95 + 1e-10);
  });

  /** @req DIVE-06 */
  it("computes correct win rate for always-positive returns", () => {
    const history = makeHistory(60, 10000, 0.005);
    const metrics = computeDeepDiveMetrics(history)!;

    // All daily returns are positive (constant growth)
    expect(metrics.winRate).toBeCloseTo(1.0, 1);
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

    const result = pickTopVaults(vaults, 10);
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

    const result = pickTopVaults(vaults, 10);
    const addresses = result.map((v) => v.summary.vaultAddress);
    const unique = new Set(addresses);
    expect(addresses.length).toBe(unique.size); // no duplicates
  });

  /** @req DIVE-04 */
  it("respects maxCount limit", () => {
    const vaults = Array.from({ length: 20 }, (_, i) =>
      makeVaultListItem(`0x${i}`, String(i * 100000), i * 0.05, 200),
    );

    const result = pickTopVaults(vaults, 5);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  /** @req DIVE-04 */
  it("returns all vaults if fewer than maxCount", () => {
    const vaults = [
      makeVaultListItem("0xa", "1000000", 0.5, 200),
      makeVaultListItem("0xb", "500000", 0.3, 200),
    ];

    const result = pickTopVaults(vaults, 10);
    expect(result).toHaveLength(2);
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
    const metrics = computeDeepDiveMetrics(history)!;

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
