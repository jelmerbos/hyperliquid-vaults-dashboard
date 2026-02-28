export type TimeSeries = [number, number][];

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;

/**
 * Cumulative PnL: last PnL value minus first.
 */
export function cumulativePnL(pnlHistory: TimeSeries): number {
  if (pnlHistory.length < 2) return 0;
  return pnlHistory[pnlHistory.length - 1][1] - pnlHistory[0][1];
}

/**
 * Cumulative return as a fraction: (end - start) / start.
 */
export function cumulativeReturn(accountValueHistory: TimeSeries): number {
  if (accountValueHistory.length < 2) return 0;
  const start = accountValueHistory[0][1];
  if (start === 0) return 0;
  const end = accountValueHistory[accountValueHistory.length - 1][1];
  return (end - start) / start;
}

/**
 * Annualized return from cumulative return and elapsed time.
 */
export function annualizedReturn(accountValueHistory: TimeSeries): number {
  if (accountValueHistory.length < 2) return 0;
  const start = accountValueHistory[0][1];
  if (start === 0) return 0;
  const end = accountValueHistory[accountValueHistory.length - 1][1];
  const totalReturn = end / start;
  const elapsedMs =
    accountValueHistory[accountValueHistory.length - 1][0] - accountValueHistory[0][0];
  const years = elapsedMs / (MS_PER_DAY * DAYS_PER_YEAR);
  if (years <= 0) return 0;
  return Math.pow(totalReturn, 1 / years) - 1;
}

/**
 * Daily returns from account value history.
 * Groups by calendar day, takes last value per day, computes day-over-day returns.
 */
export function dailyReturns(accountValueHistory: TimeSeries): number[] {
  if (accountValueHistory.length < 2) return [];

  // Group by day, take last value per day
  const dayMap = new Map<number, number>();
  for (const [ts, val] of accountValueHistory) {
    const day = Math.floor(ts / MS_PER_DAY);
    dayMap.set(day, val);
  }

  const days = Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]);
  const returns: number[] = [];
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1][1];
    if (prev === 0) {
      returns.push(0);
    } else {
      returns.push((days[i][1] - prev) / prev);
    }
  }
  return returns;
}
