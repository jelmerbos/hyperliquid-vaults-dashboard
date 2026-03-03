import type { TimeSeries } from "@/lib/metrics/returns";
import { annualizedVolatility } from "@/lib/metrics/risk";
import { sharpeRatio, sortinoRatio, valueAtRisk, conditionalVaR } from "@/lib/metrics/risk-adjusted";
import { beta, alpha } from "@/lib/metrics/benchmark";
import type { PortfolioMetrics } from "./types";

const DAYS_PER_YEAR = 365;

export interface StressScenario {
  name: string;
  description: string;
  shocks: Record<string, number>; // asset class -> shock magnitude (fraction, e.g. -0.30)
}

export interface StressTestResult {
  scenario: StressScenario;
  portfolioImpact: number; // fraction
  perVaultImpact: number[]; // fraction per vault
}

export const PREDEFINED_SCENARIOS: StressScenario[] = [
  {
    name: "Crypto Crash (-50%)",
    description: "Broad crypto market drops 50%",
    shocks: { crypto: -0.50 },
  },
  {
    name: "BTC Flash Crash (-30%)",
    description: "Bitcoin flash crash, alts drop 40%",
    shocks: { btc: -0.30, altcoin: -0.40 },
  },
  {
    name: "Moderate Correction (-20%)",
    description: "Market-wide 20% correction",
    shocks: { crypto: -0.20 },
  },
  {
    name: "DeFi Contagion (-60%)",
    description: "DeFi protocol failure cascades",
    shocks: { crypto: -0.35, defi: -0.60 },
  },
  {
    name: "Liquidity Crisis (-40%)",
    description: "Severe liquidity withdrawal across vaults",
    shocks: { crypto: -0.40 },
  },
];

/**
 * Weighted sum of daily returns: r_p[t] = sum(w_i * r_i[t]).
 * Aligns all series to the shortest length (trimmed from start).
 */
export function computePortfolioReturns(
  allDailyReturns: number[][],
  weights: number[],
): number[] {
  if (allDailyReturns.length === 0 || weights.length === 0) return [];

  const minLen = Math.min(...allDailyReturns.map((r) => r.length));
  if (minLen === 0) return [];

  const result: number[] = Array(minLen).fill(0);
  for (let i = 0; i < allDailyReturns.length; i++) {
    const r = allDailyReturns[i];
    const offset = r.length - minLen;
    for (let t = 0; t < minLen; t++) {
      result[t] += weights[i] * r[offset + t];
    }
  }
  return result;
}

/**
 * Compute max drawdown from a daily returns series.
 * Reconstructs cumulative value (base 1.0) and tracks peak-to-trough.
 */
function maxDrawdownFromReturns(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;

  let cumValue = 1.0;
  let peak = 1.0;
  let maxDD = 0;

  for (const r of dailyReturns) {
    cumValue *= (1 + r);
    if (cumValue > peak) peak = cumValue;
    const dd = (cumValue - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  return maxDD;
}

/**
 * Compute portfolio-level metrics from component daily returns.
 */
export function computePortfolioMetrics(
  allDailyReturns: number[][],
  weights: number[],
  individualVols: number[],
  btcReturns?: number[],
  hypeReturns?: number[],
): PortfolioMetrics {
  const portfolioReturns = computePortfolioReturns(allDailyReturns, weights);

  if (portfolioReturns.length < 2) {
    return {
      annualizedReturn: 0,
      annualizedVolatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
      diversificationRatio: 0,
      betaBtc: null,
      betaHype: null,
      alphaBtc: null,
      alphaHype: null,
    };
  }

  const meanDaily = portfolioReturns.reduce((s, r) => s + r, 0) / portfolioReturns.length;
  const annReturn = meanDaily * DAYS_PER_YEAR;
  const annVol = annualizedVolatility(portfolioReturns);
  const maxDD = maxDrawdownFromReturns(portfolioReturns);

  // Diversification ratio: sum(w_i * sigma_i) / sigma_portfolio
  const weightedVolSum = weights.reduce((s, w, i) => {
    const vol = i < individualVols.length ? individualVols[i] : 0;
    return s + w * vol;
  }, 0);
  const divRatio = annVol > 0 ? weightedVolSum / annVol : 1;

  // Benchmark metrics
  let betaBtc: number | null = null;
  let betaHype: number | null = null;
  let alphaBtc: number | null = null;
  let alphaHype: number | null = null;

  if (btcReturns && btcReturns.length >= 2) {
    const minLen = Math.min(portfolioReturns.length, btcReturns.length);
    const pSlice = portfolioReturns.slice(portfolioReturns.length - minLen);
    const bSlice = btcReturns.slice(btcReturns.length - minLen);
    betaBtc = beta(pSlice, bSlice);
    const btcMean = bSlice.reduce((s, r) => s + r, 0) / bSlice.length;
    alphaBtc = alpha(annReturn, btcMean * DAYS_PER_YEAR, betaBtc);
  }

  if (hypeReturns && hypeReturns.length >= 2) {
    const minLen = Math.min(portfolioReturns.length, hypeReturns.length);
    const pSlice = portfolioReturns.slice(portfolioReturns.length - minLen);
    const hSlice = hypeReturns.slice(hypeReturns.length - minLen);
    betaHype = beta(pSlice, hSlice);
    const hypeMean = hSlice.reduce((s, r) => s + r, 0) / hSlice.length;
    alphaHype = alpha(annReturn, hypeMean * DAYS_PER_YEAR, betaHype);
  }

  return {
    annualizedReturn: annReturn,
    annualizedVolatility: annVol,
    sharpeRatio: sharpeRatio(annReturn, annVol),
    sortinoRatio: sortinoRatio(annReturn, portfolioReturns),
    maxDrawdown: maxDD,
    var95: valueAtRisk(portfolioReturns, 0.95),
    cvar95: conditionalVaR(portfolioReturns, 0.95),
    diversificationRatio: divRatio,
    betaBtc,
    betaHype,
    alphaBtc,
    alphaHype,
  };
}

/**
 * Build a normalized base-100 portfolio performance series from individual
 * account value histories and weights.
 *
 * Each vault's AV history is converted to a normalized series (base 100),
 * then blended with the given weights. Aligns by common date range.
 */
export function computePortfolioPerformanceSeries(
  allAvHistories: TimeSeries[],
  weights: number[],
): TimeSeries {
  if (allAvHistories.length === 0 || weights.length === 0) return [];

  // Group each series by day (use start-of-day timestamp)
  const MS_PER_DAY = 86_400_000;
  const dayMaps: Map<number, number>[] = allAvHistories.map((series) => {
    const map = new Map<number, number>();
    for (const [ts, val] of series) {
      const day = Math.floor(ts / MS_PER_DAY) * MS_PER_DAY;
      map.set(day, val); // Last value per day wins
    }
    return map;
  });

  // Find common day range (intersection of all series)
  const allDays = dayMaps.map((m) => [...m.keys()].sort((a, b) => a - b));
  const commonStart = Math.max(...allDays.map((d) => d[0] ?? Infinity));
  const commonEnd = Math.min(...allDays.map((d) => d[d.length - 1] ?? -Infinity));

  if (commonStart >= commonEnd) return [];

  // Get sorted unique days from the first series within range
  const referenceDays = allDays[0].filter((d) => d >= commonStart && d <= commonEnd);
  if (referenceDays.length < 2) return [];

  // Get starting values for normalization
  const startValues = dayMaps.map((m) => {
    for (const day of referenceDays) {
      const v = m.get(day);
      if (v !== undefined && v > 0) return v;
    }
    return 1;
  });

  // Build blended series
  const result: TimeSeries = [];
  for (const day of referenceDays) {
    let portfolioValue = 0;
    let valid = true;

    for (let i = 0; i < dayMaps.length; i++) {
      const val = dayMaps[i].get(day);
      if (val === undefined) {
        valid = false;
        break;
      }
      const normalized = (val / startValues[i]) * 100;
      portfolioValue += weights[i] * normalized;
    }

    if (valid) {
      result.push([day, portfolioValue]);
    }
  }

  return result;
}

/**
 * Rolling risk contribution: for each window, compute each vault's
 * percentage contribution to portfolio risk.
 * Returns number[][] where result[vaultIdx][windowIdx] = percent contribution.
 * Length of each inner array = (minLen - windowDays + 1).
 */
export function rollingRiskContribution(
  allDailyReturns: number[][],
  weights: number[],
  windowDays: number,
): number[][] {
  const n = allDailyReturns.length;
  if (n === 0 || weights.length !== n || windowDays < 2) return [];

  const minLen = Math.min(...allDailyReturns.map((r) => r.length));
  if (minLen < windowDays) return [];

  // Align to shortest (trim from start)
  const aligned = allDailyReturns.map((r) => r.slice(r.length - minLen));
  const numWindows = minLen - windowDays + 1;

  const result: number[][] = Array.from({ length: n }, () => Array(numWindows).fill(0));

  for (let w = 0; w < numWindows; w++) {
    // Build window covariance matrix
    const windowReturns = aligned.map((r) => r.slice(w, w + windowDays));

    // Compute sample covariance matrix inline (no shrinkage for rolling)
    const means = windowReturns.map(
      (r) => r.reduce((s, v) => s + v, 0) / r.length,
    );
    const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        let sum = 0;
        for (let t = 0; t < windowDays; t++) {
          sum += (windowReturns[i][t] - means[i]) * (windowReturns[j][t] - means[j]);
        }
        cov[i][j] = sum / (windowDays - 1);
        cov[j][i] = cov[i][j];
      }
    }

    // Portfolio variance
    let portVar = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portVar += weights[i] * cov[i][j] * weights[j];
      }
    }

    if (portVar <= 0) continue;

    // Contribution: w_i * (Cov*w)_i / portVar
    for (let i = 0; i < n; i++) {
      let covWi = 0;
      for (let j = 0; j < n; j++) {
        covWi += cov[i][j] * weights[j];
      }
      result[i][w] = (weights[i] * covWi) / portVar;
    }
  }

  return result;
}

/**
 * Stress test: estimate portfolio impact under predefined shock scenarios.
 * Uses each vault's historical beta to the portfolio as a sensitivity proxy.
 * The shock is applied uniformly (beta-weighted) to each vault.
 */
export function stressTest(
  allDailyReturns: number[][],
  weights: number[],
  scenarios: StressScenario[],
): StressTestResult[] {
  const n = allDailyReturns.length;
  if (n === 0 || weights.length !== n) return [];

  const portfolioReturns = computePortfolioReturns(allDailyReturns, weights);
  if (portfolioReturns.length < 10) return [];

  // Compute each vault's beta to the portfolio
  const minLen = Math.min(...allDailyReturns.map((r) => r.length), portfolioReturns.length);
  const betas = allDailyReturns.map((r) => {
    const aligned = r.slice(r.length - minLen);
    const pAligned = portfolioReturns.slice(portfolioReturns.length - minLen);
    return beta(aligned, pAligned);
  });

  // Also compute each vault's annualized vol for scaling
  const vols = allDailyReturns.map((r) => annualizedVolatility(r));
  const portVol = annualizedVolatility(portfolioReturns);

  return scenarios.map((scenario) => {
    // Use the primary shock magnitude (first value, typically "crypto")
    const shockMagnitude = Object.values(scenario.shocks)[0] ?? -0.20;

    // Per-vault impact: scale by beta and vol ratio
    const perVaultImpact = betas.map((b, i) => {
      const volRatio = portVol > 0 ? vols[i] / portVol : 1;
      return shockMagnitude * b * volRatio;
    });

    // Portfolio impact: weighted sum
    const portfolioImpact = perVaultImpact.reduce(
      (sum, impact, i) => sum + weights[i] * impact,
      0,
    );

    return { scenario, portfolioImpact, perVaultImpact };
  });
}

/**
 * Worst N-day return for a daily return series.
 * Computes rolling N-day cumulative returns and returns the minimum.
 */
export function worstNDayReturn(dailyReturns: number[], nDays: number): number {
  if (dailyReturns.length < nDays || nDays < 1) return 0;

  let worst = Infinity;
  for (let i = 0; i <= dailyReturns.length - nDays; i++) {
    let cumReturn = 1;
    for (let j = 0; j < nDays; j++) {
      cumReturn *= 1 + dailyReturns[i + j];
    }
    const totalReturn = cumReturn - 1;
    if (totalReturn < worst) worst = totalReturn;
  }
  return worst;
}

/**
 * Marginal Contribution to Risk (MCTR) for each asset.
 *
 * MCTR_i = (Cov * w)_i / sigma_p
 * Component risk = w_i * MCTR_i
 * Percent contribution = component_risk / sigma_p
 *
 * Returns an array of { mctr, componentRisk, percentContribution } per asset.
 */
export function computeMCTR(
  covMatrix: number[][],
  weights: number[],
): { mctr: number; componentRisk: number; percentContribution: number }[] {
  const n = weights.length;
  if (n === 0 || covMatrix.length !== n) return [];

  // Portfolio variance = w' * Cov * w
  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      portfolioVariance += weights[i] * covMatrix[i][j] * weights[j];
    }
  }
  const portfolioVol = Math.sqrt(Math.max(0, portfolioVariance));
  if (portfolioVol === 0) {
    return weights.map(() => ({ mctr: 0, componentRisk: 0, percentContribution: 0 }));
  }

  // (Cov * w) vector
  const covW: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      covW[i] += covMatrix[i][j] * weights[j];
    }
  }

  // Annualize (daily cov -> annualized): multiply by sqrt(365) for MCTR, 365 for variance
  const annFactor = Math.sqrt(365);
  const annPortfolioVol = portfolioVol * annFactor;

  return weights.map((w, i) => {
    const mctr = (covW[i] / portfolioVol) * annFactor;
    const componentRisk = w * mctr;
    const percentContribution = annPortfolioVol > 0 ? componentRisk / annPortfolioVol : 0;
    return { mctr, componentRisk, percentContribution };
  });
}
