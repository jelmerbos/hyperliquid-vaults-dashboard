---
date: 2026-03-01
tags: [type/episodic, project/hyperliquid-vaults-dashboard]
project: Hyperliquid Vaults Dashboard
cwd: /Users/jelmerbos/hyperliquid-vaults-dashboard
---

# Hyperliquid Vaults Dashboard: Institutional Upgrade Complete

## What happened
Executed all 14 steps of the institutional-upgrade plan (Approach C: Parallel Tracks). Added risk-adjusted metrics (Sortino, Calmar, VaR, CVaR, rolling Sharpe/vol), position transparency (perp + spot via clearinghouseState), benchmark analysis (beta, alpha, correlation with placeholder data), and Claude AI integration (strategy classification, DD memos, streaming chat). 124 tests passing, build clean.

## Key decisions
- Used `claude-sonnet-4-5` for AI calls (cost/quality balance for classification tasks)
- Removed `output_config: { format: { type: "json_mode" } }` from Anthropic SDK calls; SDK types only accept "json_schema". Used prompt-level JSON instruction instead.
- Benchmark provider uses seeded PRNG (geometric Brownian motion) as placeholder; architecture supports swapping to real data feed later.
- AI section returns null when ANTHROPIC_API_KEY not set (503 = AI_UNAVAILABLE), graceful degradation.
- VaultDetails type doesn't include `createTimeMillis`; vault age not available on detail page (only on list items).

## Errors and workarounds
- SDK type error with `output_config: { format: { type: "json_mode" } }`: removed output_config, added "Respond only with the JSON object" to prompts.
- `vault.summary?.createTimeMillis` doesn't exist on VaultDetails: removed age calculation from AI analysis component.

## Files created/modified
- **Metrics:** `src/lib/metrics/positions.ts`, extended `returns.ts`, `risk.ts`, `risk-adjusted.ts`, `benchmark.ts`
- **Benchmarks:** `src/lib/benchmarks/types.ts`, `placeholder.ts`, `index.ts`
- **AI:** `src/lib/ai/types.ts`, `prompts.ts`, `src/app/api/ai/analyze/route.ts`, `src/app/api/ai/chat/route.ts`
- **Hooks:** `use-vault-positions.ts`, `use-benchmark.ts`, `use-ai-analysis.ts`, `use-ai-chat.ts`
- **Components:** `positions-table.tsx`, `position-summary.tsx`, `benchmark-section.tsx`, `correlation-matrix.tsx`, `ai-analysis.tsx`, `ai-chat.tsx`
- **Tests:** 8 test files, 124 tests total

## Open items
- Replace benchmark placeholder with real BTC/HYPE price data
- Test Claude AI with real API key and tune prompts
- Fix layout (ASXN HyperScreener as reference)
- Build Vaults Deep Dive page (brainstorm interview complete)
