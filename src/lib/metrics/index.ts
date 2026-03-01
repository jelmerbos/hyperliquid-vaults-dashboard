import type { TimeSeries } from "./returns";
import type { ReturnDistributionStats, MonthlyDistributionStats } from "./returns";
import {
  cumulativePnL,
  cumulativeReturn,
  annualizedReturn,
  dailyReturns,
  monthlyReturns,
  returnDistributionStats,
  monthlyDistributionStats,
} from "./returns";
import {
  maxDrawdown,
  drawdownSeries,
  maxDrawdownDuration,
  annualizedVolatility,
} from "./risk";
import {
  sharpeRatio,
  romad,
  sortinoRatio,
  calmarRatio,
  recoveryFactor,
} from "./risk-adjusted";

export interface VaultMetrics {
  cumulativePnL: number;
  cumulativeReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  romad: number;
  sortinoRatio: number;
  calmarRatio: number;
  recoveryFactor: number;
  returnDistribution: ReturnDistributionStats;
  monthlyDistribution: MonthlyDistributionStats;
  drawdownSeries: TimeSeries;
}

export function computeVaultMetrics(
  accountValueHistory: TimeSeries,
  pnlHistory: TimeSeries,
): VaultMetrics {
  const daily = dailyReturns(accountValueHistory);
  const monthly = monthlyReturns(accountValueHistory);
  const annRet = annualizedReturn(accountValueHistory);
  const annVol = annualizedVolatility(daily);
  const maxDD = maxDrawdown(accountValueHistory);
  const cumRet = cumulativeReturn(accountValueHistory);

  return {
    cumulativePnL: cumulativePnL(pnlHistory),
    cumulativeReturn: cumRet,
    annualizedReturn: annRet,
    maxDrawdown: maxDD,
    maxDrawdownDuration: maxDrawdownDuration(accountValueHistory),
    annualizedVolatility: annVol,
    sharpeRatio: sharpeRatio(annRet, annVol),
    romad: romad(annRet, maxDD),
    sortinoRatio: sortinoRatio(annRet, daily),
    calmarRatio: calmarRatio(annRet, maxDD),
    recoveryFactor: recoveryFactor(cumRet, maxDD),
    returnDistribution: returnDistributionStats(daily),
    monthlyDistribution: monthlyDistributionStats(monthly),
    drawdownSeries: drawdownSeries(accountValueHistory),
  };
}

export type { TimeSeries } from "./returns";
export type { ReturnDistributionStats, MonthlyDistributionStats } from "./returns";
export {
  dailyReturns,
  monthlyReturns,
  pnlBasedDailyReturns,
  pnlBasedCumulativeReturn,
  pnlBasedAnnualizedReturn,
  pnlBasedMonthlyReturns,
} from "./returns";
