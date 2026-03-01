import type { TimeSeries } from "./returns";
import {
  annualizedReturn,
  cumulativeReturn,
  dailyReturns,
  monthlyReturns,
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

export interface DeepDiveMetrics {
  annReturn: number;
  cumReturn: number;
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

const MIN_DATA_POINTS = 30;

/**
 * Compute all deep dive metrics from account value history.
 * Returns null if insufficient data (< 30 data points).
 */
export function computeDeepDiveMetrics(
  accountValueHistory: TimeSeries,
): DeepDiveMetrics | null {
  if (accountValueHistory.length < MIN_DATA_POINTS) return null;

  const daily = dailyReturns(accountValueHistory);
  const monthly = monthlyReturns(accountValueHistory);
  const annRet = annualizedReturn(accountValueHistory);
  const annVol = annualizedVolatility(daily);
  const maxDD = maxDrawdown(accountValueHistory);
  const cumRet = cumulativeReturn(accountValueHistory);
  const distStats = returnDistributionStats(daily);
  const monthlyStats = monthlyDistributionStats(monthly);

  return {
    annReturn: annRet,
    cumReturn: cumRet,
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
 * Pick top N vaults: half by TVL, half by APR, deduped.
 * Returns up to maxCount unique vaults.
 */
export function pickTopVaults<
  T extends { apr: number; summary: { tvl: string; vaultAddress: string } },
>(vaults: T[], maxCount: number = 10): T[] {
  const half = Math.ceil(maxCount / 2);

  const byTvl = [...vaults]
    .sort((a, b) => parseFloat(b.summary.tvl) - parseFloat(a.summary.tvl))
    .slice(0, half);

  const byApr = [...vaults]
    .sort((a, b) => b.apr - a.apr)
    .slice(0, half);

  const seen = new Set<string>();
  const result: T[] = [];

  for (const v of [...byTvl, ...byApr]) {
    if (!seen.has(v.summary.vaultAddress) && result.length < maxCount) {
      seen.add(v.summary.vaultAddress);
      result.push(v);
    }
  }

  return result;
}
