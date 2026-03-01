import { describe, it, expect } from "vitest";
import {
  buildVaultContext,
  CLASSIFICATION_SYSTEM_PROMPT,
  MEMO_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import type { AnalyzeRequest } from "@/lib/ai/types";

const baseRequest: AnalyzeRequest = {
  mode: "classify",
  vaultName: "Test Vault",
  vaultDescription: "A delta-neutral strategy",
  metrics: {
    annualizedReturn: 0.45,
    annualizedVolatility: 0.25,
    maxDrawdown: 0.12,
    sharpeRatio: 1.8,
    sortinoRatio: 2.5,
    calmarRatio: 3.75,
    recoveryFactor: 4.2,
    cumulativeReturn: 0.85,
  },
};

describe("buildVaultContext", () => {
  /** @req INST-26 */
  it("includes vault name and description", () => {
    const ctx = buildVaultContext(baseRequest);
    expect(ctx).toContain("## Vault: Test Vault");
    expect(ctx).toContain("A delta-neutral strategy");
  });

  /** @req INST-26 */
  it("formats metrics as percentages and ratios", () => {
    const ctx = buildVaultContext(baseRequest);
    expect(ctx).toContain("Annualized Return: 45.0%");
    expect(ctx).toContain("Annualized Volatility: 25.0%");
    expect(ctx).toContain("Max Drawdown: 12.0%");
    expect(ctx).toContain("Sharpe Ratio: 1.80");
    expect(ctx).toContain("Sortino Ratio: 2.50");
    expect(ctx).toContain("Calmar Ratio: 3.75");
    expect(ctx).toContain("Recovery Factor: 4.20");
    expect(ctx).toContain("Cumulative Return: 85.0%");
  });

  /** @req INST-26 */
  it("includes optional vault metadata when provided", () => {
    const ctx = buildVaultContext({
      ...baseRequest,
      tvl: 1500000,
      ageInDays: 180,
      followerCount: 42,
    });
    expect(ctx).toContain("TVL: $1,500,000");
    expect(ctx).toContain("Age: 180 days");
    expect(ctx).toContain("Followers: 42");
  });

  /** @req INST-26 */
  it("omits optional fields when not provided", () => {
    const ctx = buildVaultContext(baseRequest);
    expect(ctx).not.toContain("TVL:");
    expect(ctx).not.toContain("Age:");
    expect(ctx).not.toContain("Followers:");
  });

  /** @req INST-26 */
  it("includes position data when provided", () => {
    const ctx = buildVaultContext({
      ...baseRequest,
      positions: {
        perpPositions: [
          {
            coin: "BTC",
            size: "0.5",
            entryPrice: "60000",
            leverage: 5,
            unrealizedPnl: "1500",
          },
          {
            coin: "ETH",
            size: "-10",
            entryPrice: "3500",
            leverage: 3,
            unrealizedPnl: "-200",
          },
        ],
        spotBalances: [{ coin: "USDC", total: "50000" }],
        totalLeverage: 2.5,
        topConcentration: 0.75,
      },
    });

    expect(ctx).toContain("Total Leverage: 2.50x");
    expect(ctx).toContain("Top 3 Concentration: 75.0%");
    expect(ctx).toContain("BTC LONG");
    expect(ctx).toContain("ETH SHORT");
    expect(ctx).toContain("leverage=5x");
    expect(ctx).toContain("USDC: 50000");
  });

  /** @req INST-26 */
  it("handles no description gracefully", () => {
    const ctx = buildVaultContext({
      ...baseRequest,
      vaultDescription: "",
    });
    expect(ctx).toContain("No description provided");
  });
});

describe("CLASSIFICATION_SYSTEM_PROMPT", () => {
  /** @req INST-26 */
  it("includes all strategy categories", () => {
    const categories = [
      "delta-neutral",
      "directional-long",
      "directional-short",
      "market-making",
      "momentum",
      "mean-reversion",
      "arbitrage",
      "multi-strategy",
      "yield-farming",
      "unknown",
    ];
    for (const cat of categories) {
      expect(CLASSIFICATION_SYSTEM_PROMPT).toContain(cat);
    }
  });

  /** @req INST-29 */
  it("includes scoring criteria", () => {
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("riskManagement");
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("returnQuality");
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("consistency");
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("transparency");
    expect(CLASSIFICATION_SYSTEM_PROMPT).toContain("overall");
  });
});

describe("MEMO_SYSTEM_PROMPT", () => {
  /** @req INST-27 */
  it("covers all required DD memo sections", () => {
    expect(MEMO_SYSTEM_PROMPT).toContain("Strategy overview");
    expect(MEMO_SYSTEM_PROMPT).toContain("Risk assessment");
    expect(MEMO_SYSTEM_PROMPT).toContain("Edge hypothesis");
    expect(MEMO_SYSTEM_PROMPT).toContain("Concerns");
    expect(MEMO_SYSTEM_PROMPT).toContain("Capacity analysis");
    expect(MEMO_SYSTEM_PROMPT).toContain("Recommendation");
  });

  /** @req INST-27 */
  it("targets institutional audience", () => {
    expect(MEMO_SYSTEM_PROMPT).toContain("fund-of-funds");
    expect(MEMO_SYSTEM_PROMPT).toContain("investment committee");
  });
});

describe("CHAT_SYSTEM_PROMPT", () => {
  /** @req INST-28 */
  it("covers chat assistant capabilities", () => {
    expect(CHAT_SYSTEM_PROMPT).toContain("strategy");
    expect(CHAT_SYSTEM_PROMPT).toContain("risk");
    expect(CHAT_SYSTEM_PROMPT).toContain("positions");
    expect(CHAT_SYSTEM_PROMPT).toContain("due diligence");
  });

  /** @req INST-28 */
  it("instructs direct analytical style", () => {
    expect(CHAT_SYSTEM_PROMPT).toContain("direct");
    expect(CHAT_SYSTEM_PROMPT).toContain("analytical");
  });
});
