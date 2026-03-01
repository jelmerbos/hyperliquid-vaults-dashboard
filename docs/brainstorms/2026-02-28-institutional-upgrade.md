# Brainstorm: Institutional-Grade Vault Dashboard

Date: 2026-02-28
Status: Awaiting approval

## 1. Intent

**Goal:** Transform the Hyperliquid vaults dashboard from a basic metrics viewer into an institutional-grade evaluation tool for fund-of-funds allocation decisions. Triple purpose: personal allocation tool, learning project, and product demo.

**Users:** You (personal crypto allocation), potential institutional audience (demo/product).

**"Done" looks like:** A dashboard where you can evaluate any vault the way you'd evaluate a hedge fund manager at Theta: strategy classification, risk decomposition, benchmark-relative performance, correlation analysis, position transparency, and AI-assisted due diligence.

## 2. Constraints

### What exists
- 6 metrics (APR, cumPnL, maxDD, Sharpe, vol, RoMaD)
- Compare page (up to 4 vaults, normalized chart, metrics grid)
- Unused API data: volume, perp snapshots, follower details, leader stake, capacity

### What the Hyperliquid API actually provides
- `clearinghouseState` with vault address: **live perp positions** (coin, size, entry price, leverage, unrealized PnL, liquidation price)
- `spotClearinghouseState` with vault address: **live spot balances** (coin, total, entry notional)
- `vaultDetails`: historical PnL/AV series (allTime + perp-specific periods), followers, capacity
- No historical positions (only current snapshot)

### External dependencies needed
- Benchmark price data (BTC, HYPE): placeholder for now, real integration later
- Claude API: requires Anthropic API key, usage costs

### What can't change
- Next.js App Router architecture
- TanStack Query for data fetching
- Existing component patterns

## 3. Feature Breakdown

### Tier 1: Core Institutional Metrics (no external dependencies)

| Feature | Data Source | Effort |
|---------|-----------|--------|
| Sortino ratio | Existing daily returns | Small |
| Calmar ratio | Existing annReturn + maxDD | Small |
| Win rate / avg win / avg loss | Existing daily returns | Small |
| Positive month % | Existing daily returns | Small |
| Best/worst month returns | Existing daily returns | Small |
| Rolling Sharpe (90d) | Existing daily returns | Medium |
| Rolling volatility (90d) | Existing daily returns | Medium |
| Recovery factor | Existing metrics | Small |
| VaR (95%) / CVaR | Existing daily returns | Medium |
| Capital efficiency (volume/TVL) | Existing `vlm` field (unused) | Small |

### Tier 2: Position Transparency

| Feature | Data Source | Effort |
|---------|-----------|--------|
| Current perp positions table | `clearinghouseState` on vault address | Medium |
| Current spot holdings table | `spotClearinghouseState` on vault address | Medium |
| Perp vs spot PnL split | Existing `perpAllTime` vs `allTime` snapshots | Medium |
| Position concentration (top N %) | Derived from positions | Small |
| Leverage analysis | From position data | Small |
| Leader stake display | Existing `leaderFraction` field | Small |
| Capacity metrics | Existing `maxDistributable` / `maxWithdrawable` | Small |

### Tier 3: Benchmark & Correlation Analysis

| Feature | Data Source | Effort |
|---------|-----------|--------|
| Beta to BTC | Vault daily returns vs BTC daily returns | Medium |
| Beta to HYPE | Vault daily returns vs HYPE daily returns | Medium |
| Correlation matrix (vault vs vault) | Cross-vault daily returns | Medium |
| Alpha (Jensen's) | Return - beta * benchmark return | Small |
| Information ratio | Active return / tracking error | Medium |
| Benchmark overlay on performance chart | BTC/HYPE price series | Medium |

Data source: placeholder/mock for now. Architecture should support swapping in CoinGecko/Binance later.

### Tier 4: Claude AI Integration

| Feature | What It Does | Effort |
|---------|-------------|--------|
| Strategy auto-classification | Analyze return patterns, vol profile, correlation to classify: market-making, momentum, basis trade, directional, multi-strategy | Large |
| DD memo generation | Generate a structured due diligence summary per vault (strategy, risk, edge, concerns) | Large |
| Chat interface | Ask questions about specific vaults or compare vaults conversationally | Large |
| Scoring system | 1-10 scores on: consistency, risk management, capacity, transparency, strategy clarity | Medium |

## 4. Approaches

### Approach A: Bottom-Up (Metrics First, AI Last)

Build Tier 1 -> 2 -> 3 -> 4 in order. Each tier is independently useful.

| Aspect | Assessment |
|--------|-----------|
| Pros | Each step delivers value. Metrics foundation makes AI output more grounded. Lowest risk. |
| Cons | AI features come last; the "wow factor" is deferred. |
| Effort | Large (4-6 work sessions) |
| Risk | Low |

### Approach B: AI-First (Demo Impact)

Build Tier 4 (AI) first with existing metrics, then backfill Tiers 1-3.

| Aspect | Assessment |
|--------|-----------|
| Pros | Impressive demo fast. Claude can work with existing 6 metrics. |
| Cons | AI analysis is only as good as the input data. Without proper metrics (Sortino, beta, positions), the AI is classifying with limited signal. Garbage in, garbage out. |
| Effort | Large |
| Risk | High. AI output quality will be poor without position data and benchmark context. |

### Approach C: Parallel Tracks (Recommended)

**Track A:** Tier 1 + Tier 2 (metrics + positions) in one pass.
**Track B:** Tier 3 with placeholder benchmark data.
**Track C:** Tier 4 (AI) once Tracks A+B provide rich input data.

| Aspect | Assessment |
|--------|-----------|
| Pros | Position data and expanded metrics feed directly into better AI classification. Benchmark placeholders let you build the beta/correlation UI now. Each track can be a PR. |
| Cons | More upfront planning. |
| Effort | Large (4-6 work sessions) |
| Risk | Low-Medium |

## 5. Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| Vault address != leader address for `clearinghouseState` | Need to verify: does `clearinghouseState` work with vault address directly, or do we need the leader address? Test with a known vault. |
| Some vaults have very short history (< 30 days) | Metrics like rolling Sharpe need minimum data. Show "insufficient data" gracefully. |
| Claude API costs on every page load | Cache AI analysis. Generate once, store in local storage or server-side cache. Re-analyze on demand only. |
| Rate limits on Hyperliquid API | Already proxied; add response caching in API routes. |
| Benchmark data gap | Placeholder approach means beta/correlation features are architecturally ready but show mock data until a real source is connected. |
| Position data is point-in-time only | Can't show historical positions. UI should be clear this is a current snapshot, not historical. |

## 6. Key Architectural Decisions

### Claude API Integration Pattern
- **Server-side only.** API key stays on the server, never exposed to the client.
- New API route: `/api/ai/analyze` that accepts vault metrics + positions and returns structured analysis.
- Cache results aggressively (vault analysis doesn't change minute-to-minute).
- Use structured output (JSON mode) for classification and scoring; free text for memos.

### Benchmark Data Architecture
- New module: `src/lib/benchmarks/` with a provider interface.
- `PlaceholderProvider` returns synthetic BTC/HYPE data (random walk or flat).
- Interface designed so `CoinGeckoProvider` or `BinanceProvider` can be swapped in later.
- Beta and correlation calculations go in `src/lib/metrics/benchmark.ts`.

### Position Data
- New API route: `/api/vaults/[address]/positions` that calls `clearinghouseState` + `spotClearinghouseState`.
- New hook: `useVaultPositions(address)`.
- New component section on vault detail page.

## 7. Recommendation

**Go with Approach C (Parallel Tracks).**

Order of implementation:
1. Expand metrics library (Tier 1) - pure functions, easy to test
2. Add position data fetching + display (Tier 2) - validates the `clearinghouseState` API works with vault addresses
3. Benchmark placeholder + correlation/beta calculations (Tier 3)
4. Claude AI integration (Tier 4) - by this point, the AI has rich data to work with

This gives you a demo-ready institutional dashboard in stages, where each stage is independently valuable and testable.
