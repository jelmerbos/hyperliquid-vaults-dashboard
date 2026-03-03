import type { TimeSeries } from "./returns";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

export interface DrawdownEpisode {
  startTs: number;
  troughTs: number;
  recoveryTs: number | null; // null = ongoing
  depth: number; // negative fraction
  durationDays: number; // start to recovery (or end)
  recoveryDays: number | null; // trough to recovery (null = ongoing)
}

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
 * Identify distinct drawdown episodes from an account value history.
 * An episode starts when value drops below the previous peak,
 * and ends when value recovers back to (or above) the peak.
 * Only episodes with depth <= -1% are included to filter noise.
 */
export function drawdownEpisodes(accountValueHistory: TimeSeries): DrawdownEpisode[] {
  if (accountValueHistory.length < 2) return [];

  const episodes: DrawdownEpisode[] = [];
  let peak = accountValueHistory[0][1];
  let peakTs = accountValueHistory[0][0];
  let inDrawdown = false;
  let currentStart = 0;
  let currentTroughTs = 0;
  let currentTroughVal = Infinity;
  let currentDepth = 0;

  for (const [ts, val] of accountValueHistory) {
    if (val >= peak) {
      // Recovered or new peak
      if (inDrawdown && currentDepth <= -0.01) {
        episodes.push({
          startTs: currentStart,
          troughTs: currentTroughTs,
          recoveryTs: ts,
          depth: currentDepth,
          durationDays: (ts - currentStart) / MS_PER_DAY,
          recoveryDays: (ts - currentTroughTs) / MS_PER_DAY,
        });
      }
      peak = val;
      peakTs = ts;
      inDrawdown = false;
      currentTroughVal = Infinity;
    } else {
      const dd = (val - peak) / peak;
      if (!inDrawdown) {
        inDrawdown = true;
        currentStart = peakTs;
        currentTroughTs = ts;
        currentTroughVal = val;
        currentDepth = dd;
      }
      if (val < currentTroughVal) {
        currentTroughVal = val;
        currentTroughTs = ts;
        currentDepth = dd;
      }
    }
  }

  // Handle ongoing drawdown
  if (inDrawdown && currentDepth <= -0.01) {
    const lastTs = accountValueHistory[accountValueHistory.length - 1][0];
    episodes.push({
      startTs: currentStart,
      troughTs: currentTroughTs,
      recoveryTs: null,
      depth: currentDepth,
      durationDays: (lastTs - currentStart) / MS_PER_DAY,
      recoveryDays: null,
    });
  }

  return episodes;
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
