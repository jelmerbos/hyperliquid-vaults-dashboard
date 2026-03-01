# Plan: Real Benchmark Data (CoinGecko Pro)

Date: 2026-03-01
Brainstorm: Skipped (scope clear, established pattern from portfolio_monitoring)
Approved approach: CoinGecko Pro API with server-side caching

## Requirements Covered

| ID | Requirement | Status |
|----|-------------|--------|
| BENCH-01 | Server-side CoinGecko API route for BTC/HYPE daily prices | New |
| BENCH-02 | In-memory cache with TTL (avoid re-fetching on every request) | New |
| BENCH-03 | CoinGecko provider implementing BenchmarkProvider interface | New |
| BENCH-04 | Swap placeholder for real provider in benchmarks/index.ts | New |
| BENCH-05 | Remove "Placeholder Data" badge from UI when real data is active | New |
| BENCH-06 | Graceful fallback to placeholder when COINGECKO_API_KEY is not set | New |
| BENCH-07 | Tests for CoinGecko provider (mocked HTTP) | New |

## Steps

---

### Step 1: API Route for CoinGecko Price Data

Server-side route that fetches daily prices from CoinGecko Pro and caches them.

- **Files to create:**
  - `src/app/api/benchmarks/[id]/route.ts` - GET route accepting BenchmarkId (BTC/HYPE), query params `start` and `end` (unix ms). Fetches from CoinGecko `/coins/{coin_id}/market_chart/range`, returns `{ prices: [timestamp_ms, price][] }`. Uses `COINGECKO_API_KEY` env var with `x-cg-pro-api-key` header. Returns 503 if no API key.
  - `src/lib/benchmarks/coingecko.ts` - CoinGecko fetch logic: maps BenchmarkId to CoinGecko coin ID (`BTC` -> `bitcoin`, `HYPE` -> `hyperliquid`), handles the HTTP call, transforms response. Includes in-memory cache (Map with TTL, keyed by `${coinId}_${startDay}_${endDay}`). Cache TTL: 1 hour for historical data.
- **Tests:**
  - `__tests__/lib/benchmarks/coingecko.test.ts` - test coin ID mapping, response transformation (CoinGecko returns `{ prices: [[ms, price], ...] }`), cache hit/miss behavior (mock fetch)
- **Requirement IDs:** BENCH-01, BENCH-02
- **Checkpoint:** `npx vitest --run` passes. `curl http://localhost:3000/api/benchmarks/BTC?start=...&end=...` returns real price data (requires COINGECKO_API_KEY in .env.local).

---

### Step 2: CoinGecko BenchmarkProvider

Implement the BenchmarkProvider interface using the CoinGecko API route.

- **Files to create:**
  - `src/lib/benchmarks/coingecko-provider.ts` - implements `BenchmarkProvider` with `isPlaceholder: false`. `getSeries()` calls `/api/benchmarks/[id]` route, computes daily returns from prices, returns `BenchmarkSeries`.
- **Files to modify:**
  - `src/lib/benchmarks/index.ts` - export CoinGecko provider as default when available, placeholder as fallback
- **Tests:**
  - `__tests__/lib/benchmarks/coingecko-provider.test.ts` - test that provider calls correct API route, transforms response into BenchmarkSeries with dailyReturns, handles API errors gracefully
- **Requirement IDs:** BENCH-03, BENCH-04, BENCH-06
- **Checkpoint:** `npx vitest --run` passes. `useBenchmark` hook now returns real data when API key is set.

---

### Step 3: Update UI and Remove Placeholder Badge

- **Files to modify:**
  - `src/components/vault-detail/benchmark-section.tsx` - badge already conditionally renders based on `benchmarkProvider.isPlaceholder`. Verify it disappears with real provider. No code change needed if provider swap works correctly.
  - `src/lib/hooks/use-benchmark.ts` - update to use the new provider. The hook currently imports `benchmarkProvider` from index; if index.ts now exports the CoinGecko provider, this should work automatically. Add error handling: if CoinGecko fetch fails, show error state (not fallback to placeholder, that would be confusing).
- **Requirement IDs:** BENCH-05
- **Checkpoint:** Dev server shows benchmark metrics without "Placeholder Data" badge when COINGECKO_API_KEY is set. Badge still shows when key is absent.

---

### Step 4: Environment Setup and Documentation

- **Files to modify:**
  - `.env.example` - add `COINGECKO_API_KEY=` entry
  - `CLAUDE.md` - add CoinGecko API to External APIs section
- **Requirement IDs:** (documentation, no functional requirement)
- **Checkpoint:** New developer can set up benchmark data by copying .env.example and adding their key.

---

## Review Checkpoints

| After Step | Review |
|-----------|--------|
| Step 1 | CoinGecko API route works with real key. Cache prevents duplicate fetches. |
| Step 2 | Provider swap works. useBenchmark returns real data. Placeholder fallback works without key. |
| Step 4 | Full end-to-end: vault detail page shows real beta/alpha/IR values. |

## Test Strategy

- Every test tagged with `/** @req BENCH-NN */`
- CoinGecko HTTP calls mocked with `vi.fn()` (no real API calls in tests)
- Placeholder tests unchanged (still valid, placeholder is kept as fallback)
- Manual verification: compare BTC beta values against a known vault to sanity-check

## Rollback Plan

- CoinGecko provider is additive; placeholder remains in codebase
- If CoinGecko API fails or key is missing, system falls back to placeholder automatically
- Revert: change `index.ts` export back to placeholder
