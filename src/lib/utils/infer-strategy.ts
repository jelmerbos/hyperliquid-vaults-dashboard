import type { StrategyCategory } from "@/lib/ai/types";

/**
 * Lightweight keyword-based strategy inference from vault name + description.
 * Used in the deep-dive table for quick tagging without calling the AI endpoint.
 * For full AI classification, see the individual vault detail page.
 */

const PATTERNS: [RegExp, StrategyCategory][] = [
  [/\bdelta[\s-]?neutral\b/i, "delta-neutral"],
  [/\bbasis\s+trad/i, "delta-neutral"],
  [/\bfunding\s+rate\b/i, "delta-neutral"],
  [/\bcash[\s-]?and[\s-]?carry\b/i, "delta-neutral"],
  [/\bmarket[\s-]?mak/i, "market-making"],
  [/\bliquidity\s+provision/i, "market-making"],
  [/\bMM\b/, "market-making"],
  [/\bmomentum\b/i, "momentum"],
  [/\btrend[\s-]?follow/i, "momentum"],
  [/\bmean[\s-]?revert/i, "mean-reversion"],
  [/\bmean[\s-]?reversion/i, "mean-reversion"],
  [/\barbitrage\b/i, "arbitrage"],
  [/\barb\b/i, "arbitrage"],
  [/\byield\b/i, "yield-farming"],
  [/\bfarming\b/i, "yield-farming"],
  [/\bstaking\b/i, "yield-farming"],
  [/\blong[\s-]?only\b/i, "directional-long"],
  [/\blong[\s-]?bias/i, "directional-long"],
  [/\bbull/i, "directional-long"],
  [/\bshort[\s-]?only\b/i, "directional-short"],
  [/\bshort[\s-]?bias/i, "directional-short"],
  [/\bbear/i, "directional-short"],
  [/\bmulti[\s-]?strat/i, "multi-strategy"],
];

export function inferStrategy(
  name: string,
  description: string | undefined,
): StrategyCategory {
  const text = `${name} ${description ?? ""}`;
  for (const [pattern, category] of PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return "unknown";
}
