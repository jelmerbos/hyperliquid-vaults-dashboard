# Plan: Institutional-Grade Vault Dashboard

Date: 2026-02-28
Brainstorm: `docs/brainstorms/2026-02-28-institutional-upgrade.md`
Approved approach: C (Parallel Tracks)

## Requirements Covered

| ID | Requirement | Status |
|----|-------------|--------|
| INST-01 | Sortino ratio calculation | New |
| INST-02 | Calmar ratio calculation | New |
| INST-03 | Win rate, avg win, avg loss from daily returns | New |
| INST-04 | Positive month %, best/worst month returns | New |
| INST-05 | Rolling Sharpe ratio (90-day window) | New |
| INST-06 | Rolling volatility (90-day window) | New |
| INST-07 | VaR (95%) and CVaR | New |
| INST-08 | Recovery factor (cumReturn / abs(maxDD)) | New |
| INST-09 | Capital efficiency (volume / TVL) | New |
| INST-10 | Live perp positions via clearinghouseState | New |
| INST-11 | Live spot holdings via spotClearinghouseState | New |
| INST-12 | Position concentration (top N % of notional) | New |
| INST-13 | Leverage analysis (total notional / account value) | New |
| INST-14 | Leader stake and capacity display | New |
| INST-15 | Perp vs spot PnL split from existing snapshots | New |
| INST-16 | Benchmark data provider interface with placeholder | New |
| INST-17 | Beta to BTC | New |
| INST-18 | Beta to HYPE | New |
| INST-19 | Vault-to-vault correlation matrix | New |
| INST-20 | Jensen's alpha | New |
| INST-21 | Information ratio | New |
| INST-22 | Expanded metrics grid on vault detail page | New |
| INST-23 | Positions section on vault detail page | New |
| INST-24 | Benchmark section on vault detail page | New |
| INST-25 | Correlation matrix on compare page | New |
| INST-26 | Claude AI strategy classification | New |
| INST-27 | Claude AI DD memo generation | New |
| INST-28 | Claude AI vault chat interface | New |
| INST-29 | Claude AI scoring system (1-10 on dimensions) | New |

## Steps

---

### Step 1: Expand Metrics Library (Sortino, Calmar, Distribution Stats)

Pure functions, no UI changes. Extend the existing metrics module.

- **Files to modify:**
  - `src/lib/metrics/risk-adjusted.ts` - add `sortinoRatio`, `calmarRatio`, `recoveryFactor`
  - `src/lib/metrics/returns.ts` - add `monthlyReturns`, `returnDistributionStats` (win rate, avg win/loss, best/worst month, positive month %)
  - `src/lib/metrics/index.ts` - expand `VaultMetrics` interface and `computeVaultMetrics` function
- **Files to create:**
  - None
- **Tests:**
  - `__tests__/lib/metrics/risk-adjusted.test.ts` - add tests for Sortino, Calmar, recovery factor
  - `__tests__/lib/metrics/returns.test.ts` - add tests for monthly returns, distribution stats
- **Requirement IDs:** INST-01, INST-02, INST-03, INST-04, INST-08
- **Checkpoint:** `npx vitest --run` passes. All new metric functions produce correct values for known inputs (manually verified test cases).

---

### Step 2: Add Rolling Metrics and VaR

More complex metrics that operate on windowed data.

- **Files to modify:**
  - `src/lib/metrics/risk.ts` - add `rollingVolatility(dailyRets, windowDays)`
  - `src/lib/metrics/risk-adjusted.ts` - add `rollingSharpe(dailyRets, windowDays)`, `valueAtRisk(dailyRets, confidence)`, `conditionalVaR(dailyRets, confidence)`
- **Files to create:**
  - None
- **Tests:**
  - `__tests__/lib/metrics/risk.test.ts` - add rolling volatility tests
  - `__tests__/lib/metrics/risk-adjusted.test.ts` - add rolling Sharpe, VaR, CVaR tests
- **Requirement IDs:** INST-05, INST-06, INST-07
- **Checkpoint:** `npx vitest --run` passes. Rolling metrics return arrays of correct length (input length minus window + 1). VaR/CVaR return negative values for portfolios with losses.

---

### Step 3: Position Data Types, API Client, and API Route

Add types for clearinghouse responses, extend client, create API route.

- **Files to modify:**
  - `src/lib/api/types.ts` - add `PerpPosition`, `SpotBalance`, `ClearinghouseState`, `SpotClearinghouseState` interfaces
  - `src/lib/api/client.ts` - add `fetchClearinghouseState(address)`, `fetchSpotClearinghouseState(address)`
- **Files to create:**
  - `src/app/api/vaults/[address]/positions/route.ts` - GET route that calls both clearinghouse endpoints and returns combined result
- **Tests:**
  - `__tests__/lib/api/client.test.ts` - add tests for new fetch functions (mock responses)
- **Requirement IDs:** INST-10, INST-11
- **Checkpoint:** `npx vitest --run` passes. Manually test the API route with a known vault address: `curl http://localhost:3000/api/vaults/0x.../positions` returns position data (or confirms whether vault address works directly with clearinghouseState, or if we need to use the leader address instead).

---

### Step 4: Position Analysis Metrics

Compute derived metrics from position data.

- **Files to create:**
  - `src/lib/metrics/positions.ts` - `positionConcentration(positions)`, `totalLeverage(marginSummary)`, `perpVsSpotSplit(allTimeSnapshot, perpAllTimeSnapshot)`
- **Tests:**
  - `__tests__/lib/metrics/positions.test.ts` - tests for concentration, leverage, PnL split
- **Requirement IDs:** INST-12, INST-13, INST-15
- **Checkpoint:** `npx vitest --run` passes.

---

### Step 5: Vault Detail Page - Expanded Metrics Grid

Update the UI to show all new metrics.

- **Files to modify:**
  - `src/components/vault-detail/metrics-grid.tsx` - restructure into sections: Performance, Risk, Risk-Adjusted, Distribution
  - `src/app/vaults/[address]/page.tsx` - pass new metrics and volume data
  - `src/lib/utils/format.ts` - add any needed formatters (e.g. `formatRatio`)
- **Requirement IDs:** INST-22, INST-09
- **Checkpoint:** Dev server shows expanded metrics grid on vault detail page. All metrics render with correct formatting. No console errors.

---

### Step 6: Vault Detail Page - Positions Section

Display live positions and holdings.

- **Files to create:**
  - `src/lib/hooks/use-vault-positions.ts` - React Query hook for position data
  - `src/components/vault-detail/positions-table.tsx` - perp positions table (coin, size, entry, leverage, unrealized PnL, liq price) and spot balances table
  - `src/components/vault-detail/position-summary.tsx` - summary cards: total leverage, concentration %, perp/spot split, leader stake, capacity
- **Files to modify:**
  - `src/app/vaults/[address]/page.tsx` - add positions section below charts
  - `src/components/vault-detail/vault-header.tsx` - add leader stake badge
- **Requirement IDs:** INST-23, INST-14
- **Checkpoint:** Dev server shows positions table on vault detail page. If clearinghouseState doesn't work with vault address, switch to using leader address from vault details.

---

### Step 7: Benchmark Data Provider (Placeholder)

Establish the architecture for benchmark data with a placeholder implementation.

- **Files to create:**
  - `src/lib/benchmarks/types.ts` - `BenchmarkProvider` interface, `BenchmarkSeries` type
  - `src/lib/benchmarks/placeholder.ts` - generates synthetic BTC/HYPE daily returns (seeded random walk, deterministic for testing)
  - `src/lib/benchmarks/index.ts` - exports active provider (placeholder for now)
- **Tests:**
  - `__tests__/lib/benchmarks/placeholder.test.ts` - verify placeholder returns correct date range, deterministic output
- **Requirement IDs:** INST-16
- **Checkpoint:** `npx vitest --run` passes. Placeholder provider returns TimeSeries data for BTC and HYPE.

---

### Step 8: Benchmark Metrics (Beta, Alpha, Correlation)

Compute benchmark-relative statistics.

- **Files to create:**
  - `src/lib/metrics/benchmark.ts` - `beta(vaultReturns, benchmarkReturns)`, `alpha(vaultAnnReturn, benchmarkAnnReturn, beta)`, `correlation(seriesA, seriesB)`, `informationRatio(vaultReturns, benchmarkReturns)`, `correlationMatrix(allVaultReturns[])`
- **Tests:**
  - `__tests__/lib/metrics/benchmark.test.ts` - test beta (known covariance), alpha, correlation (perfect positive = 1, uncorrelated ~ 0), information ratio, correlation matrix symmetry
- **Requirement IDs:** INST-17, INST-18, INST-19, INST-20, INST-21
- **Checkpoint:** `npx vitest --run` passes. Beta of a series against itself = 1.0. Correlation matrix is symmetric with 1.0 diagonal.

---

### Step 9: Vault Detail Page - Benchmark Section

Show beta, alpha, and benchmark comparison on vault detail.

- **Files to create:**
  - `src/lib/hooks/use-benchmark.ts` - hook that fetches benchmark series from provider
  - `src/components/vault-detail/benchmark-section.tsx` - beta cards (BTC, HYPE), alpha, information ratio, benchmark overlay toggle on performance chart
- **Files to modify:**
  - `src/app/vaults/[address]/page.tsx` - add benchmark section
  - `src/components/vault-detail/performance-chart.tsx` - support optional benchmark overlay series
- **Requirement IDs:** INST-24
- **Checkpoint:** Dev server shows benchmark metrics. Performance chart can toggle BTC/HYPE overlay. Values shown with "(placeholder)" label since data is synthetic.

---

### Step 10: Compare Page - Correlation Matrix

Add cross-vault correlation to the compare page.

- **Files to create:**
  - `src/components/compare/correlation-matrix.tsx` - heatmap-style grid showing pairwise correlations between selected vaults
- **Files to modify:**
  - `src/app/compare/page.tsx` - add correlation matrix below existing charts
- **Requirement IDs:** INST-25
- **Checkpoint:** Dev server shows correlation matrix on compare page when 2+ vaults selected. Matrix is symmetric, diagonal = 1.0.

---

### Step 11: Claude AI - API Route and Strategy Classification

Server-side AI integration. Strategy classification from metrics + positions.

- **Files to create:**
  - `src/app/api/ai/analyze/route.ts` - POST route accepting vault metrics + positions, calls Claude API, returns structured classification + scores
  - `src/lib/ai/prompts.ts` - system prompts for strategy classification, scoring
  - `src/lib/ai/types.ts` - `StrategyClassification`, `VaultScore`, `DDMemo` response types
- **Files to modify:**
  - None
- **Requirement IDs:** INST-26, INST-29
- **Checkpoint:** `curl -X POST http://localhost:3000/api/ai/analyze` with sample vault data returns valid JSON with strategy classification and scores. Requires `ANTHROPIC_API_KEY` env var.
- **Not testable in vitest:** Requires live API key. Test manually. Prompt logic in `prompts.ts` is testable (string building).

---

### Step 12: Claude AI - DD Memo Generation

Extend the AI route to support memo generation.

- **Files to modify:**
  - `src/app/api/ai/analyze/route.ts` - add `mode: "memo"` option that returns a structured DD memo
  - `src/lib/ai/prompts.ts` - add DD memo prompt template
- **Requirement IDs:** INST-27
- **Checkpoint:** `curl -X POST http://localhost:3000/api/ai/analyze` with `mode: "memo"` returns a structured due diligence memo. Memo covers: strategy, risk assessment, edge hypothesis, concerns, capacity.

---

### Step 13: Claude AI - Chat Interface

Add a conversational interface for vault analysis.

- **Files to create:**
  - `src/app/api/ai/chat/route.ts` - POST streaming endpoint for conversational queries about vaults
  - `src/components/vault-detail/ai-chat.tsx` - chat panel UI (expandable drawer/panel, message list, input)
  - `src/lib/hooks/use-ai-chat.ts` - hook managing chat state and streaming
- **Requirement IDs:** INST-28
- **Checkpoint:** Dev server shows chat panel on vault detail. Can ask questions about the vault and receive streaming responses. Context includes vault metrics and positions.

---

### Step 14: Vault Detail Page - AI Section

Integrate classification, scoring, and memo into the vault detail page.

- **Files to create:**
  - `src/components/vault-detail/ai-analysis.tsx` - strategy tag, score cards, "Generate DD Memo" button, memo display
  - `src/lib/hooks/use-ai-analysis.ts` - React Query hook for AI analysis (with caching)
- **Files to modify:**
  - `src/app/vaults/[address]/page.tsx` - add AI section (gated behind ANTHROPIC_API_KEY availability)
- **Requirement IDs:** INST-26, INST-27, INST-28, INST-29
- **Checkpoint:** Dev server shows AI analysis section. Strategy tag renders. Scores display as radar chart or cards. DD memo generates on click. Chat panel works. All features degrade gracefully when no API key is set.

---

## Review Checkpoints

| After Step | Review |
|-----------|--------|
| Step 2 | All metric functions complete. Run full test suite. Review metric formulas against standard definitions. |
| Step 6 | Position transparency working end-to-end. Verify clearinghouseState API behavior with vault addresses. |
| Step 8 | Benchmark metrics complete. Verify beta/correlation math against known test vectors. |
| Step 10 | All non-AI features complete. Full visual review of vault detail and compare pages. |
| Step 14 | AI integration complete. Test with real API key. Review prompt quality and output structure. |

## Test Strategy

- Every metric function gets unit tests with known inputs/outputs
- Test tags: `/** @req INST-NN */` comment before each `test()` or `it()` block
- Coverage targets: all functions in `src/lib/metrics/` and `src/lib/metrics/benchmark.ts`
- **Not testable via vitest:**
  - INST-10, INST-11: Live API calls to Hyperliquid (test manually)
  - INST-26, INST-27, INST-28, INST-29: Claude API integration (requires API key, test manually)
  - INST-22, INST-23, INST-24, INST-25: UI rendering (visual verification in browser)

## Rollback Plan

Each step is a standalone commit on a feature branch. If anything goes wrong:
- Metric steps (1-2): revert the commit; existing metrics are untouched
- Position steps (3-6): positions are a new feature; revert removes them cleanly
- Benchmark steps (7-10): self-contained module; revert removes benchmark features
- AI steps (11-14): entirely additive; revert removes AI features, dashboard works without them
- The AI section is gated behind env var (`ANTHROPIC_API_KEY`), so it degrades gracefully even in production without reverting
