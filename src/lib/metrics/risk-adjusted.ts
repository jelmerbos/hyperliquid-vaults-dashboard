/**
 * Sharpe ratio (assuming risk-free rate = 0).
 * annualizedReturn / annualizedVolatility
 */
export function sharpeRatio(annReturn: number, annVol: number): number {
  if (annVol === 0) return 0;
  return annReturn / annVol;
}

/**
 * Return over Max Drawdown.
 * annualizedReturn / abs(maxDrawdown)
 */
export function romad(annReturn: number, maxDD: number): number {
  if (maxDD === 0) return 0;
  return annReturn / Math.abs(maxDD);
}

const DAYS_PER_YEAR = 365;

/**
 * Sortino ratio (assuming risk-free rate = 0).
 * annualizedReturn / downside deviation
 * Downside deviation only penalizes negative returns.
 */
export function sortinoRatio(annReturn: number, dailyRets: number[]): number {
  if (dailyRets.length < 2) return 0;
  const downsideSquares = dailyRets
    .filter((r) => r < 0)
    .map((r) => r * r);
  if (downsideSquares.length === 0) return 0;
  const downsideVariance =
    downsideSquares.reduce((a, b) => a + b, 0) / dailyRets.length;
  const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(DAYS_PER_YEAR);
  if (downsideDeviation === 0) return 0;
  return annReturn / downsideDeviation;
}

/**
 * Calmar ratio: annualizedReturn / abs(maxDrawdown).
 * Industry standard name for what we already compute as RoMaD.
 * Kept as a separate function for clarity in the API.
 */
export function calmarRatio(annReturn: number, maxDD: number): number {
  if (maxDD === 0) return 0;
  return annReturn / Math.abs(maxDD);
}

/**
 * Recovery factor: cumulative return / abs(maxDrawdown).
 * Measures how well the strategy recovers from drawdowns.
 */
export function recoveryFactor(cumReturn: number, maxDD: number): number {
  if (maxDD === 0) return 0;
  return cumReturn / Math.abs(maxDD);
}

/**
 * Rolling Sharpe ratio over a sliding window.
 * Computes annualized return and vol for each window.
 * Length = dailyRets.length - windowDays + 1.
 */
export function rollingSharpe(dailyRets: number[], windowDays: number): number[] {
  if (dailyRets.length < windowDays || windowDays < 2) return [];

  const result: number[] = [];
  for (let i = 0; i <= dailyRets.length - windowDays; i++) {
    const window = dailyRets.slice(i, i + windowDays);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((s, r) => s + (r - mean) ** 2, 0) / (window.length - 1);
    const annRet = mean * DAYS_PER_YEAR;
    const annVol = Math.sqrt(variance) * Math.sqrt(DAYS_PER_YEAR);
    result.push(sharpeRatio(annRet, annVol));
  }
  return result;
}

/**
 * Historical Value at Risk at a given confidence level.
 * Returns the loss threshold (negative number) such that the probability
 * of a daily loss exceeding it equals (1 - confidence).
 * E.g. VaR(95%) returns the 5th percentile of daily returns.
 */
export function valueAtRisk(dailyRets: number[], confidence: number = 0.95): number {
  if (dailyRets.length < 2) return 0;
  const sorted = [...dailyRets].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * (1 - confidence));
  return sorted[Math.max(0, index)];
}

/**
 * Conditional Value at Risk (Expected Shortfall).
 * Average of all returns at or below the VaR threshold.
 */
export function conditionalVaR(dailyRets: number[], confidence: number = 0.95): number {
  if (dailyRets.length < 2) return 0;
  const sorted = [...dailyRets].sort((a, b) => a - b);
  const cutoff = Math.max(1, Math.floor(sorted.length * (1 - confidence)));
  const tail = sorted.slice(0, cutoff);
  return tail.reduce((a, b) => a + b, 0) / tail.length;
}
