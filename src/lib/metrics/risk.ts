import type { TimeSeries } from "./returns";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

/**
 * Max drawdown as a negative fraction (e.g. -0.20 = 20% drawdown).
 * Returns 0 if no drawdown occurred.
 */
export function maxDrawdown(accountValueHistory: TimeSeries): number {
  if (accountValueHistory.length < 2) return 0;
  let peak = accountValueHistory[0][1];
  let maxDD = 0;
  for (const [, val] of accountValueHistory) {
    if (val > peak) peak = val;
    const dd = (val - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD;
}

/**
 * Drawdown series: [timestamp, drawdown_fraction][] for charting.
 */
export function drawdownSeries(accountValueHistory: TimeSeries): TimeSeries {
  if (accountValueHistory.length < 2) return [];
  let peak = accountValueHistory[0][1];
  return accountValueHistory.map(([ts, val]) => {
    if (val > peak) peak = val;
    return [ts, peak === 0 ? 0 : (val - peak) / peak];
  });
}

/**
 * Max drawdown duration in days.
 * Duration = time from peak to recovery (or end if still in drawdown).
 */
export function maxDrawdownDuration(accountValueHistory: TimeSeries): number {
  if (accountValueHistory.length < 2) return 0;
  let peak = accountValueHistory[0][1];
  let peakTs = accountValueHistory[0][0];
  let maxDurationMs = 0;

  for (const [ts, val] of accountValueHistory) {
    if (val >= peak) {
      const durationMs = ts - peakTs;
      if (durationMs > maxDurationMs) maxDurationMs = durationMs;
      peak = val;
      peakTs = ts;
    }
  }

  // Check if still in drawdown at end
  const lastTs = accountValueHistory[accountValueHistory.length - 1][0];
  const finalDuration = lastTs - peakTs;
  if (finalDuration > maxDurationMs) maxDurationMs = finalDuration;

  return maxDurationMs / MS_PER_DAY;
}

/**
 * Annualized volatility from daily returns.
 */
export function annualizedVolatility(dailyRets: number[]): number {
  if (dailyRets.length < 2) return 0;
  const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length;
  const variance =
    dailyRets.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (dailyRets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(DAYS_PER_YEAR);
}

/**
 * Rolling annualized volatility over a sliding window.
 * Returns array of [index, annualizedVol] for each complete window.
 * Length = dailyRets.length - windowDays + 1.
 */
export function rollingVolatility(dailyRets: number[], windowDays: number): number[] {
  if (dailyRets.length < windowDays || windowDays < 2) return [];

  const result: number[] = [];
  for (let i = 0; i <= dailyRets.length - windowDays; i++) {
    const window = dailyRets.slice(i, i + windowDays);
    result.push(annualizedVolatility(window));
  }
  return result;
}
