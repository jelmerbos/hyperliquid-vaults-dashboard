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
