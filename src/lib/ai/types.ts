// AI analysis response types

export type StrategyCategory =
  | "delta-neutral"
  | "directional-long"
  | "directional-short"
  | "market-making"
  | "momentum"
  | "mean-reversion"
  | "arbitrage"
  | "multi-strategy"
  | "yield-farming"
  | "unknown";

export interface StrategyClassification {
  primaryStrategy: StrategyCategory;
  secondaryStrategies: StrategyCategory[];
  confidence: number; // 0-1
  reasoning: string;
}

export interface VaultScore {
  overall: number; // 1-10
  riskManagement: number; // 1-10
  returnQuality: number; // 1-10
  consistency: number; // 1-10
  transparency: number; // 1-10
  summary: string;
}

export interface AnalyzeResponse {
  classification: StrategyClassification;
  score: VaultScore;
}

export interface DDMemo {
  title: string;
  date: string;
  sections: {
    strategyOverview: string;
    riskAssessment: string;
    edgeHypothesis: string;
    concerns: string[];
    capacityAnalysis: string;
    recommendation: string;
  };
}

export interface AnalyzeRequest {
  mode: "classify" | "memo";
  vaultName: string;
  vaultDescription: string;
  metrics: {
    annualizedReturn: number;
    annualizedVolatility: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    recoveryFactor: number;
    cumulativeReturn: number;
  };
  positions?: {
    perpPositions: {
      coin: string;
      size: string;
      entryPrice: string;
      leverage: number;
      unrealizedPnl: string;
    }[];
    spotBalances: {
      coin: string;
      total: string;
    }[];
    totalLeverage: number;
    topConcentration: number;
  };
  tvl?: number;
  ageInDays?: number;
  followerCount?: number;
}
