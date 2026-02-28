import type { TimeSeries } from "./returns";
import {
  cumulativePnL,
  cumulativeReturn,
  annualizedReturn,
  dailyReturns,
} from "./returns";
import {
  maxDrawdown,
  drawdownSeries,
  maxDrawdownDuration,
  annualizedVolatility,
} from "./risk";
import { sharpeRatio, romad } from "./risk-adjusted";

export interface VaultMetrics {
  cumulativePnL: number;
  cumulativeReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  romad: number;
  drawdownSeries: TimeSeries;
}

export function computeVaultMetrics(
  accountValueHistory: TimeSeries,
  pnlHistory: TimeSeries,
): VaultMetrics {
  const daily = dailyReturns(accountValueHistory);
  const annRet = annualizedReturn(accountValueHistory);
  const annVol = annualizedVolatility(daily);
  const maxDD = maxDrawdown(accountValueHistory);

  return {
    cumulativePnL: cumulativePnL(pnlHistory),
    cumulativeReturn: cumulativeReturn(accountValueHistory),
    annualizedReturn: annRet,
    maxDrawdown: maxDD,
    maxDrawdownDuration: maxDrawdownDuration(accountValueHistory),
    annualizedVolatility: annVol,
    sharpeRatio: sharpeRatio(annRet, annVol),
    romad: romad(annRet, maxDD),
    drawdownSeries: drawdownSeries(accountValueHistory),
  };
}

export type { TimeSeries } from "./returns";
export { dailyReturns } from "./returns";
