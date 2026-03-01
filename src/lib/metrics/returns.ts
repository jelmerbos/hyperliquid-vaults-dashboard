export type TimeSeries = [number, number][];

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365;
const MS_PER_YEAR = MS_PER_DAY * DAYS_PER_YEAR;

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

/**
 * Monthly returns from account value history.
 * Groups by year-month, takes last value per month, computes month-over-month returns.
 */
export function monthlyReturns(accountValueHistory: TimeSeries): number[] {
  if (accountValueHistory.length < 2) return [];

  const monthMap = new Map<string, number>();
  for (const [ts, val] of accountValueHistory) {
    const date = new Date(ts);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    monthMap.set(key, val);
  }

  const months = Array.from(monthMap.entries()).sort((a, b) => {
    const [ay, am] = a[0].split("-").map(Number);
    const [by, bm] = b[0].split("-").map(Number);
    return ay !== by ? ay - by : am - bm;
  });

  const returns: number[] = [];
  for (let i = 1; i < months.length; i++) {
    const prev = months[i - 1][1];
    if (prev === 0) {
      returns.push(0);
    } else {
      returns.push((months[i][1] - prev) / prev);
    }
  }
  return returns;
}

/**
 * Return distribution statistics from daily returns.
 */
export interface ReturnDistributionStats {
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestDay: number;
  worstDay: number;
}

export function returnDistributionStats(dailyRets: number[]): ReturnDistributionStats {
  if (dailyRets.length === 0) {
    return { winRate: 0, avgWin: 0, avgLoss: 0, bestDay: 0, worstDay: 0 };
  }

  const wins = dailyRets.filter((r) => r > 0);
  const losses = dailyRets.filter((r) => r < 0);

  return {
    winRate: wins.length / dailyRets.length,
    avgWin: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
    avgLoss: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
    bestDay: Math.max(...dailyRets),
    worstDay: Math.min(...dailyRets),
  };
}

/**
 * Monthly distribution statistics.
 */
export interface MonthlyDistributionStats {
  positiveMonthPct: number;
  bestMonth: number;
  worstMonth: number;
}

export function monthlyDistributionStats(monthlyRets: number[]): MonthlyDistributionStats {
  if (monthlyRets.length === 0) {
    return { positiveMonthPct: 0, bestMonth: 0, worstMonth: 0 };
  }

  const positive = monthlyRets.filter((r) => r > 0);
  return {
    positiveMonthPct: positive.length / monthlyRets.length,
    bestMonth: Math.max(...monthlyRets),
    worstMonth: Math.min(...monthlyRets),
  };
}

/**
 * PnL-based daily returns: deltaPnL / AV_prev.
 * Strips out deposit/withdrawal effects by using PnL (trading-only)
 * divided by the previous day's account value.
 * Requires both series to be aligned by timestamp (same days).
 */
export function pnlBasedDailyReturns(
  accountValueHistory: TimeSeries,
  pnlHistory: TimeSeries,
): number[] {
  if (accountValueHistory.length < 2 || pnlHistory.length < 2) return [];

  // Group AV by day, take last value per day
  const avByDay = new Map<number, number>();
  for (const [ts, val] of accountValueHistory) {
    avByDay.set(Math.floor(ts / MS_PER_DAY), val);
  }

  // Group PnL by day, take last value per day
  const pnlByDay = new Map<number, number>();
  for (const [ts, val] of pnlHistory) {
    pnlByDay.set(Math.floor(ts / MS_PER_DAY), val);
  }

  // Find common days sorted
  const commonDays = Array.from(avByDay.keys())
    .filter((d) => pnlByDay.has(d))
    .sort((a, b) => a - b);

  if (commonDays.length < 2) return [];

  const returns: number[] = [];
  for (let i = 1; i < commonDays.length; i++) {
    const prevAv = avByDay.get(commonDays[i - 1])!;
    const deltaPnl = pnlByDay.get(commonDays[i])! - pnlByDay.get(commonDays[i - 1])!;

    if (prevAv === 0) {
      returns.push(0);
    } else {
      returns.push(deltaPnl / prevAv);
    }
  }
  return returns;
}

/**
 * PnL-based cumulative return: totalPnL / startingAV.
 * Flow-adjusted: measures trading performance relative to starting capital.
 */
export function pnlBasedCumulativeReturn(
  accountValueHistory: TimeSeries,
  pnlHistory: TimeSeries,
): number {
  if (accountValueHistory.length < 2 || pnlHistory.length < 2) return 0;
  const startAv = accountValueHistory[0][1];
  if (startAv === 0) return 0;
  const totalPnl = pnlHistory[pnlHistory.length - 1][1] - pnlHistory[0][1];
  return totalPnl / startAv;
}

/**
 * PnL-based annualized return.
 * Compounds PnL-based daily returns over the period, then annualizes.
 */
export function pnlBasedAnnualizedReturn(
  accountValueHistory: TimeSeries,
  pnlHistory: TimeSeries,
): number {
  const daily = pnlBasedDailyReturns(accountValueHistory, pnlHistory);
  if (daily.length === 0) return 0;

  // Compound daily returns to get total return
  let compounded = 1;
  for (const r of daily) {
    compounded *= 1 + r;
  }

  const elapsedMs =
    accountValueHistory[accountValueHistory.length - 1][0] - accountValueHistory[0][0];
  const years = elapsedMs / (MS_PER_DAY * DAYS_PER_YEAR);
  if (years <= 0) return 0;

  return Math.pow(compounded, 1 / years) - 1;
}

/**
 * PnL-based monthly returns: deltaPnL per month / AV at start of month.
 * Flow-adjusted version of monthlyReturns.
 */
export function pnlBasedMonthlyReturns(
  accountValueHistory: TimeSeries,
  pnlHistory: TimeSeries,
): number[] {
  if (accountValueHistory.length < 2 || pnlHistory.length < 2) return [];

  // Group AV by month, take last value per month
  const avByMonth = new Map<string, number>();
  for (const [ts, val] of accountValueHistory) {
    const date = new Date(ts);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    avByMonth.set(key, val);
  }

  // Group PnL by month, take last value per month
  const pnlByMonth = new Map<string, number>();
  for (const [ts, val] of pnlHistory) {
    const date = new Date(ts);
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    pnlByMonth.set(key, val);
  }

  // Find common months sorted
  const commonMonths = Array.from(avByMonth.keys())
    .filter((m) => pnlByMonth.has(m))
    .sort((a, b) => {
      const [ay, am] = a.split("-").map(Number);
      const [by, bm] = b.split("-").map(Number);
      return ay !== by ? ay - by : am - bm;
    });

  if (commonMonths.length < 2) return [];

  const returns: number[] = [];
  for (let i = 1; i < commonMonths.length; i++) {
    const prevAv = avByMonth.get(commonMonths[i - 1])!;
    const deltaPnl = pnlByMonth.get(commonMonths[i])! - pnlByMonth.get(commonMonths[i - 1])!;

    if (prevAv === 0) {
      returns.push(0);
    } else {
      returns.push(deltaPnl / prevAv);
    }
  }
  return returns;
}
