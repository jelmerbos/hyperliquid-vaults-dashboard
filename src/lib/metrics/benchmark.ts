/**
 * Benchmark-relative metrics: beta, alpha, correlation, information ratio.
 * All functions operate on aligned daily return arrays (same length, same dates).
 */

/**
 * Covariance between two return series.
 */
function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (a[i] - meanA) * (b[i] - meanB);
  }
  return sum / (n - 1);
}

/**
 * Variance of a return series (sample variance).
 */
function variance(a: number[]): number {
  if (a.length < 2) return 0;
  const mean = a.reduce((s, v) => s + v, 0) / a.length;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - mean) ** 2;
  }
  return sum / (a.length - 1);
}

/**
 * Beta: sensitivity of vault returns to benchmark returns.
 * beta = cov(vault, benchmark) / var(benchmark)
 * A beta of 1.0 means the vault moves 1:1 with the benchmark.
 */
export function beta(vaultReturns: number[], benchmarkReturns: number[]): number {
  const benchVar = variance(benchmarkReturns);
  if (benchVar === 0) return 0;
  return covariance(vaultReturns, benchmarkReturns) / benchVar;
}

/**
 * Jensen's alpha: excess return not explained by market exposure.
 * alpha = vaultAnnReturn - beta * benchmarkAnnReturn
 * Assumes risk-free rate = 0.
 */
export function alpha(
  vaultAnnReturn: number,
  benchmarkAnnReturn: number,
  b: number,
): number {
  return vaultAnnReturn - b * benchmarkAnnReturn;
}

/**
 * Pearson correlation coefficient between two return series.
 * Returns value between -1 and 1.
 */
export function correlation(seriesA: number[], seriesB: number[]): number {
  const n = Math.min(seriesA.length, seriesB.length);
  if (n < 2) return 0;
  const cov = covariance(seriesA, seriesB);
  const varA = variance(seriesA);
  const varB = variance(seriesB);
  const denom = Math.sqrt(varA * varB);
  if (denom === 0) return 0;
  return cov / denom;
}

/**
 * Information ratio: risk-adjusted excess return vs benchmark.
 * IR = mean(active returns) / std(active returns) * sqrt(365)
 * Active return = vault daily return - benchmark daily return.
 */
export function informationRatio(
  vaultReturns: number[],
  benchmarkReturns: number[],
): number {
  const n = Math.min(vaultReturns.length, benchmarkReturns.length);
  if (n < 2) return 0;

  const activeReturns: number[] = [];
  for (let i = 0; i < n; i++) {
    activeReturns.push(vaultReturns[i] - benchmarkReturns[i]);
  }

  const mean = activeReturns.reduce((s, v) => s + v, 0) / n;
  const activeVar = variance(activeReturns);
  if (activeVar === 0) return 0;

  const trackingError = Math.sqrt(activeVar) * Math.sqrt(365);
  const annualizedActiveReturn = mean * 365;
  return annualizedActiveReturn / trackingError;
}

/**
 * Correlation matrix for multiple vault return series.
 * Returns a symmetric NxN matrix where matrix[i][j] = correlation(vaults[i], vaults[j]).
 * Diagonal is always 1.0.
 */
export function correlationMatrix(allVaultReturns: number[][]): number[][] {
  const n = allVaultReturns.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0;
    for (let j = i + 1; j < n; j++) {
      const corr = correlation(allVaultReturns[i], allVaultReturns[j]);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  return matrix;
}
