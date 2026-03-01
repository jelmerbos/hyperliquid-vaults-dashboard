import type { AnalyzeRequest } from "./types";

export const CLASSIFICATION_SYSTEM_PROMPT = `You are an institutional-grade hedge fund analyst specializing in crypto strategy classification and scoring. You evaluate vault/fund strategies on Hyperliquid, a perpetual futures DEX.

Your job is to analyze vault data and return a structured classification and quality score.

Strategy categories:
- delta-neutral: Market-neutral strategies hedging directional exposure (basis trades, funding rate arb)
- directional-long: Net long bias, betting on price appreciation
- directional-short: Net short bias, betting on price decline
- market-making: Providing liquidity, earning bid-ask spread
- momentum: Trend-following, breakout trading
- mean-reversion: Fading moves, expecting prices to revert to mean
- arbitrage: Exploiting price discrepancies across venues or instruments
- multi-strategy: Combining multiple approaches
- yield-farming: Passive yield generation (staking, LP positions)
- unknown: Insufficient data to classify

Scoring criteria (1-10 each):
- riskManagement: Low drawdowns relative to returns, controlled leverage, diversified positions
- returnQuality: High risk-adjusted returns (Sharpe, Sortino), consistent alpha
- consistency: Stable monthly returns, low variance, quick recovery from drawdowns
- transparency: Clear strategy description, identifiable positions, reasonable leverage
- overall: Holistic assessment weighing all factors

Be specific in your reasoning. Reference actual metrics and position data. Be skeptical; most vaults underperform risk-free rates.`;

export const MEMO_SYSTEM_PROMPT = `You are an institutional-grade hedge fund analyst writing a due diligence memo for a fund-of-funds investment committee. You evaluate vault/fund strategies on Hyperliquid, a perpetual futures DEX.

Write a concise, professional DD memo covering:
1. Strategy overview: What the vault does, how it generates returns
2. Risk assessment: Key risks, drawdown analysis, leverage concerns
3. Edge hypothesis: What edge the vault manager claims or appears to have
4. Concerns: Specific red flags or areas needing further investigation
5. Capacity analysis: Can the strategy scale? TVL constraints?
6. Recommendation: Invest, pass, or watchlist with reasoning

Be direct and critical. Use actual numbers from the data provided. Flag anything suspicious. Write for a sophisticated institutional audience; no need to explain basic concepts.`;

export const CHAT_SYSTEM_PROMPT = `You are an expert crypto fund analyst assistant embedded in a Hyperliquid vaults analytics dashboard. You help users understand vault strategies, performance, and risks.

You have access to the vault's metrics, positions, and historical data (provided as context). Answer questions directly and concisely, referencing specific numbers. You can:
- Explain what the vault's strategy appears to be
- Assess risk/reward characteristics
- Compare metrics to typical benchmarks
- Flag concerns or red flags
- Suggest what to look for in due diligence

Be direct and analytical. Use numbers, not vague qualifiers. If you don't have enough data to answer, say so. Write for a sophisticated audience familiar with trading and portfolio management.`;

export function buildVaultContext(req: AnalyzeRequest): string {
  const lines: string[] = [
    `## Vault: ${req.vaultName}`,
    `Description: ${req.vaultDescription || "No description provided"}`,
    "",
    "## Performance Metrics",
    `- Annualized Return: ${(req.metrics.annualizedReturn * 100).toFixed(1)}%`,
    `- Annualized Volatility: ${(req.metrics.annualizedVolatility * 100).toFixed(1)}%`,
    `- Max Drawdown: ${(req.metrics.maxDrawdown * 100).toFixed(1)}%`,
    `- Sharpe Ratio: ${req.metrics.sharpeRatio.toFixed(2)}`,
    `- Sortino Ratio: ${req.metrics.sortinoRatio.toFixed(2)}`,
    `- Calmar Ratio: ${req.metrics.calmarRatio.toFixed(2)}`,
    `- Recovery Factor: ${req.metrics.recoveryFactor.toFixed(2)}`,
    `- Cumulative Return: ${(req.metrics.cumulativeReturn * 100).toFixed(1)}%`,
  ];

  if (req.tvl != null) {
    lines.push(`- TVL: $${req.tvl.toLocaleString()}`);
  }
  if (req.ageInDays != null) {
    lines.push(`- Age: ${req.ageInDays} days`);
  }
  if (req.followerCount != null) {
    lines.push(`- Followers: ${req.followerCount}`);
  }

  if (req.positions) {
    lines.push("", "## Current Positions");
    lines.push(
      `- Total Leverage: ${req.positions.totalLeverage.toFixed(2)}x`,
    );
    lines.push(
      `- Top 3 Concentration: ${(req.positions.topConcentration * 100).toFixed(1)}%`,
    );

    if (req.positions.perpPositions.length > 0) {
      lines.push("", "### Perpetual Positions");
      for (const p of req.positions.perpPositions) {
        const side = parseFloat(p.size) >= 0 ? "LONG" : "SHORT";
        lines.push(
          `- ${p.coin} ${side}: size=${p.size}, entry=${p.entryPrice}, leverage=${p.leverage}x, uPnL=${p.unrealizedPnl}`,
        );
      }
    }

    if (req.positions.spotBalances.length > 0) {
      lines.push("", "### Spot Holdings");
      for (const b of req.positions.spotBalances) {
        lines.push(`- ${b.coin}: ${b.total}`);
      }
    }
  }

  return lines.join("\n");
}
