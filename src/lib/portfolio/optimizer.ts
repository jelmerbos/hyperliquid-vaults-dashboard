import type { PortfolioConstraints, EfficientFrontierPoint } from "./types";

/**
 * Equal-weight allocation: 1/n for each of n assets.
 */
export function equalWeight(n: number): number[] {
  if (n <= 0) return [];
  const w = 1 / n;
  return Array(n).fill(w);
}

/**
 * Sample covariance matrix with Ledoit-Wolf shrinkage for stability.
 * Shrinks toward a diagonal matrix (identity * avg variance).
 */
export function covarianceMatrix(allDailyReturns: number[][]): number[][] {
  const n = allDailyReturns.length;
  if (n === 0) return [];

  const T = Math.min(...allDailyReturns.map((r) => r.length));
  if (T < 2) return Array.from({ length: n }, () => Array(n).fill(0));

  // Compute means
  const means = allDailyReturns.map((r) => {
    const slice = r.slice(r.length - T);
    return slice.reduce((s, v) => s + v, 0) / T;
  });

  // Sample covariance
  const sample: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    const ri = allDailyReturns[i].slice(allDailyReturns[i].length - T);
    for (let j = i; j < n; j++) {
      const rj = allDailyReturns[j].slice(allDailyReturns[j].length - T);
      let sum = 0;
      for (let t = 0; t < T; t++) {
        sum += (ri[t] - means[i]) * (rj[t] - means[j]);
      }
      const cov = sum / (T - 1);
      sample[i][j] = cov;
      sample[j][i] = cov;
    }
  }

  // Ledoit-Wolf shrinkage toward scaled identity
  const avgVar = sample.reduce((s, row, i) => s + row[i], 0) / n;
  const target: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? avgVar : 0)),
  );

  // Shrinkage intensity (simplified constant; 0.1 provides mild regularization)
  const shrinkage = 0.1;

  const result: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      (1 - shrinkage) * sample[i][j] + shrinkage * target[i][j],
    ),
  );

  return result;
}

/**
 * Portfolio variance: w' * Sigma * w
 */
function portfolioVariance(weights: number[], covMatrix: number[][]): number {
  const n = weights.length;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return variance;
}

/**
 * Project weights onto the constraint set: sum=1, minWeight <= w_i <= maxWeight.
 * Uses iterative clamping + renormalization.
 */
function projectWeights(weights: number[], constraints: PortfolioConstraints): number[] {
  const n = weights.length;
  const { minWeight, maxWeight } = constraints;
  const result = [...weights];

  // Iterative projection (max 50 iterations for convergence)
  for (let iter = 0; iter < 50; iter++) {
    // Clamp to bounds
    for (let i = 0; i < n; i++) {
      result[i] = Math.max(minWeight, Math.min(maxWeight, result[i]));
    }

    // Renormalize to sum=1
    const sum = result.reduce((s, w) => s + w, 0);
    if (sum === 0) {
      // Fallback to equal weight
      const eq = 1 / n;
      for (let i = 0; i < n; i++) result[i] = eq;
      break;
    }

    for (let i = 0; i < n; i++) {
      result[i] /= sum;
    }

    // Check if all constraints satisfied
    let satisfied = true;
    for (let i = 0; i < n; i++) {
      if (result[i] < minWeight - 1e-10 || result[i] > maxWeight + 1e-10) {
        satisfied = false;
        break;
      }
    }
    if (satisfied) break;
  }

  return result;
}

/**
 * Min-variance portfolio using projected gradient descent.
 * Minimizes w'Sigma*w subject to sum(w)=1, minWeight <= w_i <= maxWeight.
 */
export function minVariance(
  covMatrix: number[][],
  constraints: PortfolioConstraints,
): number[] {
  const n = covMatrix.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  // Check if constraints are feasible: n * minWeight <= 1 <= n * maxWeight
  if (n * constraints.minWeight > 1 + 1e-10 || n * constraints.maxWeight < 1 - 1e-10) {
    return equalWeight(n);
  }

  // Initialize with equal weights
  let weights = equalWeight(n);
  const learningRate = 0.5;
  const iterations = 1000;

  for (let iter = 0; iter < iterations; iter++) {
    // Gradient of w'Sigma*w is 2*Sigma*w
    const gradient: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        gradient[i] += 2 * covMatrix[i][j] * weights[j];
      }
    }

    // Gradient step
    const step = learningRate / (1 + iter * 0.01);
    const candidate = weights.map((w, i) => w - step * gradient[i]);

    // Project onto constraint set
    weights = projectWeights(candidate, constraints);
  }

  return weights;
}

/**
 * Risk parity: allocate inversely proportional to individual volatility.
 * Weights are normalized to sum=1 and clamped to constraints.
 */
export function riskParity(
  vols: number[],
  constraints: PortfolioConstraints,
): number[] {
  const n = vols.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  // Inverse-vol weighting
  const invVols = vols.map((v) => (v > 0 ? 1 / v : 0));
  const totalInv = invVols.reduce((s, v) => s + v, 0);

  if (totalInv === 0) return equalWeight(n);

  const rawWeights = invVols.map((v) => v / totalInv);
  return projectWeights(rawWeights, constraints);
}

/**
 * Min-variance portfolio with a target return constraint.
 * Uses projected gradient descent with a return penalty.
 */
function minVarianceAtReturn(
  covMatrix: number[][],
  meanReturns: number[],
  targetReturn: number,
  constraints: PortfolioConstraints,
): number[] {
  const n = covMatrix.length;
  if (n === 0) return [];
  if (n === 1) return [1];

  let weights = equalWeight(n);
  const learningRate = 0.5;
  const iterations = 1000;
  const returnPenalty = 100; // Lagrange multiplier for return constraint

  for (let iter = 0; iter < iterations; iter++) {
    // Gradient of w'Sigma*w
    const gradient: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        gradient[i] += 2 * covMatrix[i][j] * weights[j];
      }
    }

    // Add return constraint penalty: d/dw (lambda * (target - w'mu)^2) = -2*lambda*(target - w'mu)*mu
    const currentReturn = weights.reduce((s, w, i) => s + w * meanReturns[i], 0);
    const returnGap = targetReturn - currentReturn;
    for (let i = 0; i < n; i++) {
      gradient[i] -= 2 * returnPenalty * returnGap * meanReturns[i];
    }

    const step = learningRate / (1 + iter * 0.01);
    const candidate = weights.map((w, i) => w - step * gradient[i]);
    weights = projectWeights(candidate, constraints);
  }

  return weights;
}

/**
 * Compute efficient frontier: sweep target returns from min to max,
 * solve min-variance at each target.
 */
export function efficientFrontier(
  meanReturns: number[],
  covMatrix: number[][],
  constraints: PortfolioConstraints,
  nPoints: number = 20,
): EfficientFrontierPoint[] {
  const n = meanReturns.length;
  if (n < 2) return [];

  const minReturn = Math.min(...meanReturns);
  const maxReturn = Math.max(...meanReturns);

  if (maxReturn - minReturn < 1e-10) return [];

  const points: EfficientFrontierPoint[] = [];
  for (let i = 0; i < nPoints; i++) {
    const targetReturn = minReturn + (i / (nPoints - 1)) * (maxReturn - minReturn);
    const weights = minVarianceAtReturn(covMatrix, meanReturns, targetReturn, constraints);

    const actualReturn = weights.reduce((s, w, j) => s + w * meanReturns[j], 0);
    const vol = Math.sqrt(Math.max(0, portfolioVariance(weights, covMatrix)));

    points.push({
      volatility: vol,
      return: actualReturn,
      weights,
    });
  }

  // Sort by volatility
  points.sort((a, b) => a.volatility - b.volatility);

  return points;
}
