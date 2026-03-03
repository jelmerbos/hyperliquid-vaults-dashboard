export interface PortfolioAllocation {
  vaultAddress: string;
  weight: number; // 0-1, sum to 1
}

export interface PortfolioConstraints {
  minWeight: number; // default 0.05 (5%)
  maxWeight: number; // default 0.50 (50%)
}

export interface PortfolioMetrics {
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  var95: number;
  cvar95: number;
  diversificationRatio: number;
  betaBtc: number | null;
  betaHype: number | null;
  alphaBtc: number | null;
  alphaHype: number | null;
}

export interface EfficientFrontierPoint {
  volatility: number;
  return: number;
  weights: number[];
  isCurrent?: boolean;
}

export type OptimizerStrategy = "equal-weight" | "min-variance" | "risk-parity";

export const DEFAULT_CONSTRAINTS: PortfolioConstraints = {
  minWeight: 0.05,
  maxWeight: 0.50,
};
