import type { TimeSeries } from "./returns";
import {
  cumulativePnL,
  pnlBasedDailyReturns,
  pnlBasedCumulativeReturn,
  pnlBasedAnnualizedReturn,
  pnlBasedMonthlyReturns,
  returnDistributionStats,
  monthlyDistributionStats,
} from "./returns";
import {
  maxDrawdown,
  maxDrawdownDuration,
  annualizedVolatility,
} from "./risk";
import {
  sharpeRatio,
  sortinoRatio,
  calmarRatio,
  recoveryFactor,
  valueAtRisk,
  conditionalVaR,
} from "./risk-adjusted";

export type DeepDivePeriod = "7D" | "30D" | "90D" | "365D" | "YTD" | "ITD";

export interface DeepDiveMetrics {
  annReturn: number;
  cumReturn: number;
  pnl: number;
  annVol: number;
  maxDD: number;
  maxDDDuration: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  recoveryFactor: number;
  var95: number;
  cvar95: number;
  winRate: number;
  positiveMonthPct: number;
  betaBtc: number | null;
  betaHype: number | null;
}

const MIN_DATA_POINTS = 5;

/**
 * Strip leading zero/near-zero values from account value history.
 * The Hyperliquid API often returns initial 0-value entries before
 * real deposits are made, which breaks return calculations.
 */
export function stripLeadingZeros(series: TimeSeries): TimeSeries {
  const firstNonZero = series.findIndex(([, val]) => val > 0.01);
  if (firstNonZero <= 0) return series;
  return series.slice(firstNonZero);
}

/**
 * Slice account value history to a specific lookback period.
 * Returns the portion of the series within the period window.
 */
export function sliceToPeriod(
  series: TimeSeries,
  period: DeepDivePeriod,
): TimeSeries {
  if (period === "ITD" || series.length === 0) return series;

  const lastTs = series[series.length - 1][0];
  let cutoffTs: number;

  if (period === "YTD") {
    const now = new Date(lastTs);
    cutoffTs = new Date(now.getUTCFullYear(), 0, 1).getTime();
  } else {
    const daysMap: Record<string, number> = {
      "7D": 7,
      "30D": 30,
      "90D": 90,
      "365D": 365,
    };
    cutoffTs = lastTs - daysMap[period] * 86_400_000;
  }

  const sliced = series.filter(([ts]) => ts >= cutoffTs);
  return sliced.length >= 2 ? sliced : series;
}

/**
 * Compute all deep dive metrics from account value history.
 * Strips leading zeros and slices to period before computing.
 * Returns null if insufficient data (< 5 data points after processing).
 */
export function computeDeepDiveMetrics(
  rawAccountValueHistory: TimeSeries,
  rawPnlHistory: TimeSeries,
  period: DeepDivePeriod = "ITD",
): DeepDiveMetrics | null {
  const cleaned = stripLeadingZeros(rawAccountValueHistory);
  const accountValueHistory = sliceToPeriod(cleaned, period);
  const pnlHistory = sliceToPeriod(rawPnlHistory, period);

  if (accountValueHistory.length < MIN_DATA_POINTS) return null;

  // PnL-based returns strip out deposit/withdrawal effects
  const daily = pnlBasedDailyReturns(accountValueHistory, pnlHistory);
  const monthly = pnlBasedMonthlyReturns(accountValueHistory, pnlHistory);
  const annRet = pnlBasedAnnualizedReturn(accountValueHistory, pnlHistory);
  const annVol = annualizedVolatility(daily);
  const maxDD = maxDrawdown(accountValueHistory);
  const cumRet = pnlBasedCumulativeReturn(accountValueHistory, pnlHistory);
  const pnl = cumulativePnL(pnlHistory);
  const distStats = returnDistributionStats(daily);
  const monthlyStats = monthlyDistributionStats(monthly);

  return {
    annReturn: annRet,
    cumReturn: cumRet,
    pnl,
    annVol,
    maxDD,
    maxDDDuration: maxDrawdownDuration(accountValueHistory),
    sharpe: sharpeRatio(annRet, annVol),
    sortino: sortinoRatio(annRet, daily),
    calmar: calmarRatio(annRet, maxDD),
    recoveryFactor: recoveryFactor(cumRet, maxDD),
    var95: valueAtRisk(daily, 0.95),
    cvar95: conditionalVaR(daily, 0.95),
    winRate: distStats.winRate,
    positiveMonthPct: monthlyStats.positiveMonthPct,
    betaBtc: null,
    betaHype: null,
  };
}

/**
 * Filter vaults by minimum TVL and minimum age in days.
 */
export function filterQualifyingVaults<
  T extends { summary: { tvl: string; createTimeMillis: number; isClosed: boolean } },
>(vaults: T[], minTvl: number, minAgeDays: number): T[] {
  const now = Date.now();
  const minAgeMs = minAgeDays * 86_400_000;

  return vaults.filter((v) => {
    if (v.summary.isClosed) return false;
    const tvl = parseFloat(v.summary.tvl);
    const age = now - v.summary.createTimeMillis;
    return tvl >= minTvl && age >= minAgeMs;
  });
}

/**
 * Pick top N vaults by TVL and by APR (annualized return), deduped.
 * topByTvl and topByReturn control how many from each ranking.
 */
/**
 * Metric keys eligible for percentile ranking.
 * Higher-is-better metrics are ranked ascending (higher value = higher percentile).
 * Lower-is-better metrics (maxDD, var95, cvar95, annVol) are ranked descending.
 */
const PERCENTILE_HIGHER_IS_BETTER: (keyof DeepDiveMetrics)[] = [
  "annReturn", "cumReturn", "pnl", "sharpe", "sortino",
  "calmar", "recoveryFactor", "winRate", "positiveMonthPct",
  // maxDD, var95, cvar95 are negative numbers where less negative = better,
  // so numerically higher value = better
  "maxDD", "var95", "cvar95",
];

const PERCENTILE_LOWER_IS_BETTER: (keyof DeepDiveMetrics)[] = [
  "annVol",
];

export type PercentileRanks = Partial<Record<keyof DeepDiveMetrics, number>>;

/**
 * Compute percentile ranks for each metric across a set of vaults.
 * Returns a map from vault index to percentile ranks (0-100).
 * A percentile of 90 means the vault scores better than 90% of peers for that metric.
 */
export function computePercentileRanks(
  metricsArray: (DeepDiveMetrics | null)[],
): PercentileRanks[] {
  const n = metricsArray.length;
  if (n === 0) return [];

  const result: PercentileRanks[] = metricsArray.map(() => ({}));

  function rankMetric(key: keyof DeepDiveMetrics, higherIsBetter: boolean) {
    // Collect values with indices, skip nulls
    const entries: { index: number; value: number }[] = [];
    for (let i = 0; i < n; i++) {
      const m = metricsArray[i];
      if (m == null) continue;
      const v = m[key];
      if (v == null || typeof v !== "number") continue;
      entries.push({ index: i, value: v });
    }

    if (entries.length < 2) return;

    // Sort: for higher-is-better, ascending sort so higher values get higher rank
    entries.sort((a, b) =>
      higherIsBetter ? a.value - b.value : b.value - a.value,
    );

    for (let rank = 0; rank < entries.length; rank++) {
      // Percentile: proportion of peers this vault beats
      const pct = (rank / (entries.length - 1)) * 100;
      result[entries[rank].index][key] = Math.round(pct);
    }
  }

  for (const key of PERCENTILE_HIGHER_IS_BETTER) {
    rankMetric(key, true);
  }
  for (const key of PERCENTILE_LOWER_IS_BETTER) {
    rankMetric(key, false);
  }

  return result;
}

export function pickTopVaults<
  T extends { apr: number; summary: { tvl: string; vaultAddress: string } },
>(vaults: T[], topByTvl: number = 5, topByReturn: number = 5): T[] {
  const byTvl = [...vaults]
    .sort((a, b) => parseFloat(b.summary.tvl) - parseFloat(a.summary.tvl))
    .slice(0, topByTvl);

  const byApr = [...vaults]
    .sort((a, b) => b.apr - a.apr)
    .slice(0, topByReturn);

  const seen = new Set<string>();
  const result: T[] = [];

  for (const v of [...byTvl, ...byApr]) {
    if (!seen.has(v.summary.vaultAddress)) {
      seen.add(v.summary.vaultAddress);
      result.push(v);
    }
  }

  return result;
}
